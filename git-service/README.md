# Unitum Git Service

FastAPI microservice that wraps **local `git`** operations and **GitHub** collaborator
management. It is consumed by the Angular frontend (Git Workspace + Git Dashboard pages).

- All commit / push / pull / branch logic = local `git` via `GitPython` (no GitHub API).
- Only "add / list / remove collaborators" hits the GitHub REST API.

## Install

```bash
cd git-service
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create `git-service/.env` from `.env.example` and put your GitHub token (only needed for collaborator management):

```
GITHUB_TOKEN=ghp_xxx
```

The token needs the `repo` scope.

## Run

```bash
python main.py
# → http://localhost:5060
```

Health check: `GET http://localhost:5060/health`.

## How the frontend uses it

1. Open **Git → My Workspace** in the app.
2. Enter a `Repo ID` (any name you like, e.g. `main-app`) and the **local path** to your git clone.
3. Click *Save path*. From then on, you can commit / push / pull / switch branches from the UI.
4. Managers go to **Git → Manager Dashboard** to see the activity feed, contributors leaderboard, and add GitHub collaborators by username.

The mapping `repo_id → local path` is persisted in `git-service/repos.json`.

## Endpoints

| Method | Path                                                 | Description                                  |
|--------|------------------------------------------------------|----------------------------------------------|
| GET    | `/health`                                            | Service status + token presence              |
| GET    | `/repos`                                             | List configured repos                        |
| POST   | `/repo/set-path`                                     | Register a local path under a `repo_id`      |
| DELETE | `/repo/{repo_id}`                                    | Forget a repo (does not touch the files)     |
| GET    | `/repo/{repo_id}/status`                             | Branch, ahead/behind, staged/modified files  |
| GET    | `/repo/{repo_id}/log?limit=30&branch=`               | Recent commits                               |
| GET    | `/repo/{repo_id}/branches`                           | Local + remote branches                      |
| GET    | `/repo/{repo_id}/diff?file=&staged=`                 | Diff text                                    |
| POST   | `/repo/stage`                                        | `git add` (empty `files` = stage all)        |
| POST   | `/repo/commit`                                       | `git commit -m`                              |
| POST   | `/repo/push`                                         | `git push <remote> <branch>`                 |
| POST   | `/repo/pull`                                         | `git pull <remote> <branch>`                 |
| POST   | `/repo/checkout`                                     | Switch (or create) a branch                  |
| GET    | `/repo/{repo_id}/activity-feed?limit=50`             | Manager dashboard feed                       |
| GET    | `/repo/{repo_id}/contributors-stats?limit=200`       | Aggregated per-author stats                  |
| GET    | `/repo/{repo_id}/collaborators`                      | List GitHub collaborators                    |
| POST   | `/repo/collaborator`                                 | Invite a collaborator (GitHub API)           |
| DELETE | `/repo/{repo_id}/collaborator/{username}`            | Remove a collaborator                        |
