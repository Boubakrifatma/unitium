import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// =====================================================================
// DTOs — mirror the Spring Boot side (controller/service/github/*).
// =====================================================================

export interface GithubTokenStatus {
  configured: boolean;
  login?: string | null;
  avatar?: string | null;
  hint?: string | null;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at?: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  owner?: { login: string; avatar_url: string };
}

export interface GitRepoLink {
  id: number;
  projectId: number;
  owner: string;
  repoName: string;
  localPath?: string | null;
  defaultBranch?: string | null;
  linkedByUserId?: number | null;
}

export interface GithubCollaborator {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  permissions?: { admin?: boolean; maintain?: boolean; push?: boolean; triage?: boolean; pull?: boolean };
  role_name?: string;
}

export interface GitStatus {
  branch: string;
  added: string[];
  changed: string[];
  modified: string[];
  untracked: string[];
  removed: string[];
  missing: string[];
  clean: boolean;
}

export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  email: string;
  date: string;
}

export interface GitBranches {
  current: string;
  local: string[];
}

export interface GitDashboardSnapshot {
  repoCount: number;
  totalCommits: number;
  contributorCount: number;
  mostActiveAuthor: string | null;
  activityByDay: Record<string, number>;
  commitsByAuthor: Record<string, number>;
  commitsByRepo: Record<string, number>;
}

// =====================================================================
// Service
// =====================================================================

@Injectable({ providedIn: 'root' })
export class GitService {
  /** Spring Boot base — must contain `localhost:8084` so the JWT interceptor attaches Authorization. */
  private readonly base = 'http://localhost:8084/api';

  private readonly STORAGE_KEY = 'unitum.git.activeLinkId';

  /** Currently selected repo-link id (persisted across reloads). */
  readonly activeLinkId = signal<number | null>(this.readActiveLinkId());

  /** Cached token status so guards/UI can react synchronously. */
  readonly tokenStatus = signal<GithubTokenStatus | null>(null);

  constructor(private http: HttpClient) {}

  // ----- Active link ------------------------------------------------------

  setActiveLinkId(id: number | null): void {
    this.activeLinkId.set(id);
    if (id == null) localStorage.removeItem(this.STORAGE_KEY);
    else localStorage.setItem(this.STORAGE_KEY, String(id));
  }

  private readActiveLinkId(): number | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // ----- GitHub auth (token) ---------------------------------------------

  saveToken(token: string): Observable<GithubTokenStatus> {
    return this.http
      .post<GithubTokenStatus>(`${this.base}/github/auth/save-token`, { token })
      .pipe(tap((s) => this.tokenStatus.set(s)));
  }

  checkToken(): Observable<GithubTokenStatus> {
    return this.http
      .get<GithubTokenStatus>(`${this.base}/github/auth/check-token`)
      .pipe(tap((s) => this.tokenStatus.set(s)));
  }

  deleteToken(): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/github/auth/token`)
      .pipe(tap(() => this.tokenStatus.set({ configured: false })));
  }

  // ----- GitHub repos (via REST API) -------------------------------------

  listMyRepos(page = 1, perPage = 100): Observable<GithubRepo[]> {
    const params = new HttpParams().set('page', page).set('perPage', perPage);
    return this.http.get<GithubRepo[]>(`${this.base}/github/repos`, { params });
  }

  createRepo(body: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    autoInit?: boolean;
  }): Observable<GithubRepo> {
    return this.http.post<GithubRepo>(`${this.base}/github/repos`, body);
  }

  // ----- Linked repos (DB) -----------------------------------------------

  linkRepo(body: {
    projectId: number;
    owner: string;
    repoName: string;
    localPath?: string;
    defaultBranch?: string;
  }): Observable<GitRepoLink> {
    return this.http.post<GitRepoLink>(`${this.base}/github/repos/link`, body);
  }

  listLinks(projectId?: number): Observable<GitRepoLink[]> {
    let params = new HttpParams();
    if (projectId != null) params = params.set('projectId', projectId);
    return this.http.get<GitRepoLink[]>(`${this.base}/github/repos/links`, { params });
  }

  unlinkRepo(linkId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/github/repos/link/${linkId}`);
  }

  // ----- Collaborators (GitHub API) --------------------------------------

  listCollaborators(owner: string, repo: string): Observable<GithubCollaborator[]> {
    return this.http.get<GithubCollaborator[]>(
      `${this.base}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators`,
    );
  }

  inviteCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin' = 'push',
  ): Observable<unknown> {
    return this.http.put(
      `${this.base}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators`,
      { username, permission },
    );
  }

  removeCollaborator(owner: string, repo: string, username: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`,
    );
  }

  // ----- Local git ops (JGit) --------------------------------------------

  status(linkId: number): Observable<GitStatus> {
    return this.http.get<GitStatus>(`${this.base}/git/${linkId}/status`);
  }

  commit(
    linkId: number,
    body: { message: string; authorName?: string; authorEmail?: string; stageAll?: boolean },
  ): Observable<GitCommit> {
    return this.http.post<GitCommit>(`${this.base}/git/${linkId}/commit`, body);
  }

  push(linkId: number): Observable<{ updates: string[] }> {
    return this.http.post<{ updates: string[] }>(`${this.base}/git/${linkId}/push`, {});
  }

  pull(linkId: number): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/git/${linkId}/pull`, {});
  }

  history(linkId: number, limit = 30): Observable<GitCommit[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<GitCommit[]>(`${this.base}/git/${linkId}/history`, { params });
  }

  branches(linkId: number): Observable<GitBranches> {
    return this.http.get<GitBranches>(`${this.base}/git/${linkId}/branches`);
  }

  // ----- Dashboard --------------------------------------------------------

  dashboardSnapshot(opts: { projectId?: number; days?: number } = {}): Observable<GitDashboardSnapshot> {
    let params = new HttpParams().set('days', opts.days ?? 30);
    if (opts.projectId != null) params = params.set('projectId', opts.projectId);
    return this.http.get<GitDashboardSnapshot>(`${this.base}/git/dashboard`, { params });
  }

  // ----- Manager code browser (read-only, via GitHub API — no local clone) ----

  /** List all repos (public + private) visible to the manager. */
  managerListRepos(page = 1, perPage = 100): Observable<GithubRepo[]> {
    const params = new HttpParams().set('page', page).set('perPage', perPage);
    return this.http.get<GithubRepo[]>(`${this.base}/manager/code/repos`, { params });
  }

  /** List all branches of a repo. */
  managerListBranches(owner: string, repo: string): Observable<ManagerBranch[]> {
    return this.http.get<ManagerBranch[]>(
      `${this.base}/manager/code/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
    );
  }

  /**
   * Browse repo contents at a given path and ref.
   * Returns ManagerDirEntry[] for a directory, or ManagerFileContent for a file.
   */
  managerContents(owner: string, repo: string, path: string, ref: string): Observable<ManagerDirEntry[] | ManagerFileContent> {
    const params = new HttpParams().set('path', path).set('ref', ref);
    return this.http.get<ManagerDirEntry[] | ManagerFileContent>(
      `${this.base}/manager/code/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`,
      { params },
    );
  }

  /** Commit history on a specific branch (no local clone needed). */
  managerCommits(owner: string, repo: string, ref: string, limit = 30): Observable<any[]> {
    const params = new HttpParams().set('ref', ref).set('limit', limit);
    return this.http.get<any[]>(
      `${this.base}/manager/code/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
      { params },
    );
  }
}

// ── Manager browser DTOs ──────────────────────────────────────────────────────

export interface ManagerBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface ManagerDirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  htmlUrl: string;
}

export interface ManagerFileContent {
  type: 'file';
  path: string;
  name: string;
  size: number;
  sha: string;
  content: string;   // decoded plain text
  htmlUrl: string;
}
