"""
Unitum Git Service
FastAPI microservice — port 5060

Wraps local `git` operations (via GitPython) and GitHub collaborator
management (via GitHub REST API). Designed to be called from the Angular
frontend so devs and managers can work with their local repos through
a friendly UI.

Repos are identified by a `repo_id` string (free-form key chosen by the
caller, e.g. "main-app"). The mapping repo_id -> local path is persisted
in repos.json next to this file.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from git import GitCommandError, InvalidGitRepositoryError, Repo
from pydantic import BaseModel, Field

load_dotenv()

VERSION = "1.0.0"
SERVICE_DIR = Path(__file__).resolve().parent
REPOS_FILE = SERVICE_DIR / "repos.json"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"

app = FastAPI(title="Unitum Git Service", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Persistence: repo_id -> { path, owner, name }
# ---------------------------------------------------------------------------

def _load_repos() -> dict[str, dict[str, str]]:
    if not REPOS_FILE.exists():
        return {}
    try:
        return json.loads(REPOS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_repos(data: dict[str, dict[str, str]]) -> None:
    REPOS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _get_repo(repo_id: str) -> Repo:
    repos = _load_repos()
    entry = repos.get(repo_id)
    if not entry:
        raise HTTPException(404, f"Repo '{repo_id}' is not configured. Call /repo/set-path first.")
    path = entry.get("path")
    if not path or not Path(path).exists():
        raise HTTPException(404, f"Path for repo '{repo_id}' no longer exists: {path}")
    try:
        return Repo(path)
    except InvalidGitRepositoryError:
        raise HTTPException(400, f"Path is not a valid git repository: {path}")


def _get_meta(repo_id: str) -> dict[str, str]:
    return _load_repos().get(repo_id, {})


_GITHUB_RE = re.compile(r"github\.com[:/]([^/]+)/([^/.]+?)(?:\.git)?/?$")


def _parse_github_remote(remote_url: str) -> tuple[str | None, str | None]:
    m = _GITHUB_RE.search(remote_url or "")
    if not m:
        return None, None
    return m.group(1), m.group(2)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SetPathReq(BaseModel):
    repo_id: str = Field(..., min_length=1)
    path: str = Field(..., min_length=1)


class StageReq(BaseModel):
    repo_id: str
    files: list[str] = Field(default_factory=list, description="Empty = stage all")


class CommitReq(BaseModel):
    repo_id: str
    message: str = Field(..., min_length=1)
    author_name: str | None = None
    author_email: str | None = None
    stage_all: bool = True


class PushReq(BaseModel):
    repo_id: str
    branch: str | None = None
    remote: str = "origin"


class PullReq(BaseModel):
    repo_id: str
    branch: str | None = None
    remote: str = "origin"


class CheckoutReq(BaseModel):
    repo_id: str
    branch: str
    create: bool = False


class CollaboratorReq(BaseModel):
    repo_id: str
    username: str
    permission: str = Field(default="push", pattern="^(pull|triage|push|maintain|admin)$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gh_headers() -> dict[str, str]:
    if not GITHUB_TOKEN:
        raise HTTPException(
            500,
            "GITHUB_TOKEN env var is not set. Add it to git-service/.env to manage collaborators.",
        )
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _commit_to_dict(c) -> dict[str, Any]:
    return {
        "sha": c.hexsha,
        "short_sha": c.hexsha[:7],
        "message": c.message.strip(),
        "author_name": c.author.name,
        "author_email": c.author.email,
        "date": datetime.fromtimestamp(c.committed_date, tz=timezone.utc).isoformat(),
        "files_changed": len(c.stats.files),
        "insertions": c.stats.total.get("insertions", 0),
        "deletions": c.stats.total.get("deletions", 0),
    }


def _safe(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except GitCommandError as e:
        raise HTTPException(400, f"git error: {e.stderr.strip() or str(e)}")


# ---------------------------------------------------------------------------
# Health & registry
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": VERSION, "github_token_configured": bool(GITHUB_TOKEN)}


@app.get("/repos")
def list_repos():
    return _load_repos()


@app.post("/repo/set-path")
def set_path(req: SetPathReq):
    p = Path(req.path).expanduser().resolve()
    if not p.exists():
        raise HTTPException(400, f"Path does not exist: {p}")
    try:
        repo = Repo(str(p))
    except InvalidGitRepositoryError:
        raise HTTPException(400, f"Path is not a git repository: {p}")

    owner = name = None
    try:
        url = repo.remotes.origin.url
        owner, name = _parse_github_remote(url)
    except Exception:
        pass

    repos = _load_repos()
    repos[req.repo_id] = {"path": str(p), "owner": owner or "", "name": name or ""}
    _save_repos(repos)
    return {"repo_id": req.repo_id, "path": str(p), "owner": owner, "name": name}


@app.delete("/repo/{repo_id}")
def remove_repo(repo_id: str):
    repos = _load_repos()
    if repo_id not in repos:
        raise HTTPException(404, "Unknown repo_id")
    del repos[repo_id]
    _save_repos(repos)
    return {"removed": repo_id}


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------

@app.get("/repo/{repo_id}/status")
def status(repo_id: str):
    repo = _get_repo(repo_id)
    untracked = repo.untracked_files
    modified = [item.a_path for item in repo.index.diff(None)]
    staged = [item.a_path for item in repo.index.diff("HEAD")] if repo.head.is_valid() else []

    branch = repo.active_branch.name if not repo.head.is_detached else "(detached)"
    ahead = behind = 0
    try:
        tracking = repo.active_branch.tracking_branch()
        if tracking is not None:
            ahead = sum(1 for _ in repo.iter_commits(f"{tracking}..{repo.active_branch}"))
            behind = sum(1 for _ in repo.iter_commits(f"{repo.active_branch}..{tracking}"))
    except Exception:
        pass

    return {
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
        "staged": staged,
        "modified": modified,
        "untracked": untracked,
        "clean": not (staged or modified or untracked),
    }


@app.get("/repo/{repo_id}/log")
def log(repo_id: str, limit: int = 30, branch: str | None = None):
    repo = _get_repo(repo_id)
    rev = branch or "HEAD"
    try:
        commits = list(repo.iter_commits(rev, max_count=limit))
    except GitCommandError as e:
        raise HTTPException(400, f"git error: {e.stderr.strip() or str(e)}")
    return [_commit_to_dict(c) for c in commits]


@app.get("/repo/{repo_id}/branches")
def branches(repo_id: str):
    repo = _get_repo(repo_id)
    current = repo.active_branch.name if not repo.head.is_detached else None
    locals_ = [b.name for b in repo.branches]
    remotes = []
    try:
        for r in repo.remotes:
            for ref in r.refs:
                short = ref.name.split("/", 1)[1] if "/" in ref.name else ref.name
                if short != "HEAD":
                    remotes.append(ref.name)
    except Exception:
        pass
    return {"current": current, "local": locals_, "remote": remotes}


@app.get("/repo/{repo_id}/diff")
def diff(repo_id: str, file: str | None = None, staged: bool = False):
    repo = _get_repo(repo_id)
    args = ["--no-color"]
    if staged:
        args.append("--cached")
    if file:
        args += ["--", file]
    try:
        text = repo.git.diff(*args)
    except GitCommandError as e:
        raise HTTPException(400, str(e))
    return {"diff": text}


# ---------------------------------------------------------------------------
# Write endpoints
# ---------------------------------------------------------------------------

@app.post("/repo/stage")
def stage(req: StageReq):
    repo = _get_repo(req.repo_id)
    if not req.files:
        _safe(repo.git.add, "--all")
    else:
        _safe(repo.git.add, "--", *req.files)
    return {"staged": req.files or "ALL"}


@app.post("/repo/commit")
def commit(req: CommitReq):
    repo = _get_repo(req.repo_id)
    if req.stage_all:
        _safe(repo.git.add, "--all")
    if repo.head.is_valid() and not list(repo.index.diff("HEAD")):
        raise HTTPException(400, "Nothing to commit (no staged changes).")
    env = {}
    if req.author_name:
        env["GIT_AUTHOR_NAME"] = req.author_name
        env["GIT_COMMITTER_NAME"] = req.author_name
    if req.author_email:
        env["GIT_AUTHOR_EMAIL"] = req.author_email
        env["GIT_COMMITTER_EMAIL"] = req.author_email
    try:
        if env:
            with repo.git.custom_environment(**env):
                repo.git.commit("-m", req.message)
        else:
            repo.git.commit("-m", req.message)
    except GitCommandError as e:
        raise HTTPException(400, e.stderr.strip() or str(e))
    head = repo.head.commit
    return _commit_to_dict(head)


@app.post("/repo/push")
def push(req: PushReq):
    repo = _get_repo(req.repo_id)
    branch = req.branch or repo.active_branch.name
    try:
        remote_obj = repo.remotes[req.remote]
        original_url = remote_obj.url
        # Inject token into HTTPS remote URL so git-receive-pack is permitted
        if GITHUB_TOKEN and original_url.startswith("https://"):
            authed_url = original_url.replace(
                "https://", f"https://{GITHUB_TOKEN}@", 1
            )
            remote_obj.set_url(authed_url)
        try:
            out = repo.git.push(req.remote, branch)
        finally:
            # Always restore the original URL (no token stored on disk)
            if GITHUB_TOKEN and original_url.startswith("https://"):
                remote_obj.set_url(original_url)
    except GitCommandError as e:
        raise HTTPException(400, e.stderr.strip() or str(e))
    return {"pushed": branch, "remote": req.remote, "output": out}


@app.post("/repo/pull")
def pull(req: PullReq):
    repo = _get_repo(req.repo_id)
    branch = req.branch or repo.active_branch.name
    try:
        out = repo.git.pull(req.remote, branch)
    except GitCommandError as e:
        raise HTTPException(400, e.stderr.strip() or str(e))
    return {"pulled": branch, "remote": req.remote, "output": out}


@app.post("/repo/checkout")
def checkout(req: CheckoutReq):
    repo = _get_repo(req.repo_id)
    try:
        if req.create:
            repo.git.checkout("-b", req.branch)
        else:
            repo.git.checkout(req.branch)
    except GitCommandError as e:
        raise HTTPException(400, e.stderr.strip() or str(e))
    return {"branch": req.branch, "created": req.create}


# ---------------------------------------------------------------------------
# Manager dashboard endpoints
# ---------------------------------------------------------------------------

@app.get("/repo/{repo_id}/activity-feed")
def activity_feed(repo_id: str, limit: int = 50):
    repo = _get_repo(repo_id)
    commits = list(repo.iter_commits("HEAD", max_count=limit))
    feed = []
    for c in commits:
        feed.append({
            "type": "commit",
            "sha": c.hexsha,
            "short_sha": c.hexsha[:7],
            "actor": c.author.name,
            "email": c.author.email,
            "summary": c.message.strip().splitlines()[0] if c.message.strip() else "",
            "files_changed": len(c.stats.files),
            "insertions": c.stats.total.get("insertions", 0),
            "deletions": c.stats.total.get("deletions", 0),
            "date": datetime.fromtimestamp(c.committed_date, tz=timezone.utc).isoformat(),
        })
    return feed


@app.get("/repo/{repo_id}/contributors-stats")
def contributors_stats(repo_id: str, limit: int = 200):
    repo = _get_repo(repo_id)
    bucket: dict[str, dict[str, Any]] = {}
    for c in repo.iter_commits("HEAD", max_count=limit):
        key = c.author.email or c.author.name
        b = bucket.setdefault(key, {
            "name": c.author.name,
            "email": c.author.email,
            "commits": 0,
            "insertions": 0,
            "deletions": 0,
            "last_commit": None,
        })
        b["commits"] += 1
        b["insertions"] += c.stats.total.get("insertions", 0)
        b["deletions"] += c.stats.total.get("deletions", 0)
        date = datetime.fromtimestamp(c.committed_date, tz=timezone.utc).isoformat()
        if not b["last_commit"] or date > b["last_commit"]:
            b["last_commit"] = date
    return sorted(bucket.values(), key=lambda x: x["commits"], reverse=True)


# ---------------------------------------------------------------------------
# GitHub collaborators (only piece that uses the GitHub API)
# ---------------------------------------------------------------------------

@app.get("/repo/{repo_id}/collaborators")
def list_collaborators(repo_id: str):
    meta = _get_meta(repo_id)
    owner, name = meta.get("owner"), meta.get("name")
    if not owner or not name:
        raise HTTPException(400, "Repo has no GitHub origin configured.")
    r = requests.get(f"{GITHUB_API}/repos/{owner}/{name}/collaborators", headers=_gh_headers(), timeout=15)
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.text)
    return [{
        "login": u["login"],
        "avatar_url": u["avatar_url"],
        "html_url": u["html_url"],
        "permissions": u.get("permissions", {}),
        "role_name": u.get("role_name"),
    } for u in r.json()]


@app.post("/repo/collaborator")
def add_collaborator(req: CollaboratorReq):
    meta = _get_meta(req.repo_id)
    owner, name = meta.get("owner"), meta.get("name")
    if not owner or not name:
        raise HTTPException(400, "Repo has no GitHub origin configured.")
    url = f"{GITHUB_API}/repos/{owner}/{name}/collaborators/{req.username}"
    r = requests.put(url, headers=_gh_headers(), json={"permission": req.permission}, timeout=15)
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.text)
    if r.status_code == 204:
        return {"username": req.username, "status": "already-collaborator"}
    return {"username": req.username, "status": "invited", "invitation": r.json()}


@app.delete("/repo/{repo_id}/collaborator/{username}")
def remove_collaborator(repo_id: str, username: str):
    meta = _get_meta(repo_id)
    owner, name = meta.get("owner"), meta.get("name")
    if not owner or not name:
        raise HTTPException(400, "Repo has no GitHub origin configured.")
    url = f"{GITHUB_API}/repos/{owner}/{name}/collaborators/{username}"
    r = requests.delete(url, headers=_gh_headers(), timeout=15)
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.text)
    return {"removed": username}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
