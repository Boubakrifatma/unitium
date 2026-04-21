import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../../auth/auth.service';
import {
  GitBranches,
  GitCommit,
  GitRepoLink,
  GitService,
  GitStatus,
  GithubRepo,
  GithubTokenStatus,
} from '../../../services/git.service';

@Component({
  selector: 'app-git-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatCheckboxModule, MatDividerModule, MatExpansionModule,
  ],
  template: `
    <div class="gw-page">
      <!-- Hero -->
      <div class="gw-hero">
        <div class="gw-hero-left">
          <div class="gw-hero-icon"><mat-icon>account_tree</mat-icon></div>
          <div>
            <h1 class="gw-hero-title">Git Workspace</h1>
            <p class="gw-hero-sub">Connect your GitHub account, link a repo and ship code without leaving Unitum.</p>
          </div>
        </div>
        <div class="gw-hero-right" *ngIf="tokenStatus()?.configured">
          <img *ngIf="tokenStatus()?.avatar" [src]="tokenStatus()!.avatar!" class="gh-avatar" />
          <div class="gh-info">
            <div class="gh-login">{{ tokenStatus()?.login }}</div>
            <div class="gh-hint">PAT {{ tokenStatus()?.hint }}</div>
          </div>
          <button mat-icon-button (click)="onUnlinkToken()" matTooltip="Disconnect GitHub">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>

      <!-- 1. Token form (shown when no PAT yet) -->
      <mat-card *ngIf="tokenStatus() && !tokenStatus()!.configured" class="gw-card token-card">
        <mat-card-header>
          <mat-card-title><mat-icon>vpn_key</mat-icon> Connect your GitHub account</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="muted">
            Paste a <strong>Personal Access Token</strong> with <code>repo</code> scope.
            We encrypt it at rest before storing it.
            <a href="https://github.com/settings/tokens?type=beta" target="_blank">Generate one →</a>
          </p>
          <div class="token-row">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>GitHub PAT</mat-label>
              <input matInput type="password" [(ngModel)]="tokenInput" placeholder="ghp_..." autocomplete="off" />
            </mat-form-field>
            <button mat-flat-button color="primary" class="tall-btn"
                    (click)="onSaveToken()" [disabled]="busy() || !tokenInput.trim()">
              <mat-icon>lock</mat-icon> Connect
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <ng-container *ngIf="tokenStatus()?.configured">
        <!-- 2. Repo picker / link -->
        <mat-card class="gw-card">
          <mat-card-header>
            <mat-card-title><mat-icon>folder_open</mat-icon> My repositories</mat-card-title>
            <span class="grow"></span>
            <button mat-stroked-button (click)="loadGithubRepos()" [disabled]="busy()" matTooltip="Refresh from GitHub">
              <mat-icon>sync</mat-icon> Refresh
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="link-list" *ngIf="links().length; else noLinks">
              <span class="repo-list-label">Linked to a project (click to work on it):</span>
              <mat-chip-set>
                <mat-chip *ngFor="let l of links()"
                         [highlighted]="l.id === activeLinkId()"
                         (click)="selectLink(l)" class="repo-chip">
                  <mat-icon>account_tree</mat-icon> {{ l.owner }}/{{ l.repoName }}
                  <span class="repo-chip-path" *ngIf="l.localPath">— {{ l.localPath }}</span>
                </mat-chip>
              </mat-chip-set>
            </div>
            <ng-template #noLinks>
              <div class="muted small">No linked repos yet — pick one from GitHub below to get started.</div>
            </ng-template>

            <mat-divider class="my-3"></mat-divider>

            <mat-expansion-panel class="link-panel">
              <mat-expansion-panel-header>
                <mat-panel-title><mat-icon>add_link</mat-icon> Link a GitHub repo to a project</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="link-form">
                <mat-form-field appearance="outline" class="grow">
                  <mat-label>GitHub repo</mat-label>
                  <mat-select [(ngModel)]="newLinkRepo">
                    <mat-option *ngFor="let r of githubRepos()" [value]="r.full_name">
                      {{ r.full_name }} <span class="muted small">· {{ r.private ? 'private' : 'public' }}</span>
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="grow">
                  <mat-label>Project ID</mat-label>
                  <input matInput type="number" [(ngModel)]="newLinkProjectId" placeholder="123" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="grow-2">
                  <mat-label>Local path (optional, for commit/push)</mat-label>
                  <input matInput [(ngModel)]="newLinkLocalPath" placeholder="C:\\path\\to\\local\\clone" />
                </mat-form-field>
                <button mat-flat-button color="primary" class="tall-btn"
                        (click)="onLinkRepo()" [disabled]="busy() || !canLink()">
                  <mat-icon>link</mat-icon> Link
                </button>
              </div>
            </mat-expansion-panel>
          </mat-card-content>
        </mat-card>

        <!-- 3. Workspace for the active link -->
        <ng-container *ngIf="activeLinkId(); else pickRepo">
          <div class="gw-grid">
            <!-- Changes -->
            <mat-card class="gw-card">
              <mat-card-header>
                <mat-card-title><mat-icon>edit_note</mat-icon> Changes</mat-card-title>
                <span class="grow"></span>
                <mat-chip *ngIf="status()" class="branch-chip">
                  <mat-icon>call_split</mat-icon> {{ status()!.branch }}
                </mat-chip>
                <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
                  <mat-icon>refresh</mat-icon>
                </button>
              </mat-card-header>
              <mat-card-content>
                <div *ngIf="!status() && !errorMsg()" class="empty">
                  <mat-spinner diameter="28"></mat-spinner>
                </div>
                <div *ngIf="errorMsg()" class="empty-state error">
                  <mat-icon class="big-icon">error_outline</mat-icon>
                  <p>{{ errorMsg() }}</p>
                </div>
                <ng-container *ngIf="status() as s">
                  <div *ngIf="s.clean" class="empty-state">
                    <mat-icon class="big-icon">verified</mat-icon>
                    <p>Nothing to commit. Working tree is clean.</p>
                  </div>
                  <ng-container *ngIf="!s.clean">
                    <ng-container *ngIf="(s.added.length + s.changed.length + s.removed.length) as stagedCount">
                      <h4 *ngIf="stagedCount" class="section-title staged">Staged ({{ stagedCount }})</h4>
                      <div *ngFor="let f of s.added" class="file-row staged"><mat-icon class="file-icon">add_circle</mat-icon><span>{{ f }}</span></div>
                      <div *ngFor="let f of s.changed" class="file-row staged"><mat-icon class="file-icon">edit</mat-icon><span>{{ f }}</span></div>
                      <div *ngFor="let f of s.removed" class="file-row staged"><mat-icon class="file-icon">remove_circle</mat-icon><span>{{ f }}</span></div>
                    </ng-container>
                    <h4 *ngIf="s.modified.length" class="section-title modified">Modified ({{ s.modified.length }})</h4>
                    <div *ngFor="let f of s.modified" class="file-row modified"><mat-icon class="file-icon">edit</mat-icon><span>{{ f }}</span></div>
                    <h4 *ngIf="s.missing.length" class="section-title modified">Missing ({{ s.missing.length }})</h4>
                    <div *ngFor="let f of s.missing" class="file-row modified"><mat-icon class="file-icon">help_outline</mat-icon><span>{{ f }}</span></div>
                    <h4 *ngIf="s.untracked.length" class="section-title untracked">Untracked ({{ s.untracked.length }})</h4>
                    <div *ngFor="let f of s.untracked" class="file-row untracked"><mat-icon class="file-icon">help_outline</mat-icon><span>{{ f }}</span></div>
                  </ng-container>
                </ng-container>
              </mat-card-content>
            </mat-card>

            <!-- Commit / Push / Pull -->
            <mat-card class="gw-card">
              <mat-card-header>
                <mat-card-title><mat-icon>commit</mat-icon> Commit & sync</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Commit message</mat-label>
                  <textarea matInput [(ngModel)]="commitMessage" rows="3" placeholder="What did you change?"></textarea>
                </mat-form-field>

                <div class="actions-row">
                  <button mat-flat-button color="primary"
                          (click)="onCommit()" [disabled]="busy() || !commitMessage.trim()">
                    <mat-icon>commit</mat-icon> Commit (stage all)
                  </button>
                  <button mat-stroked-button color="accent" (click)="onPull()" [disabled]="busy()">
                    <mat-icon>arrow_downward</mat-icon> Pull
                  </button>
                  <button mat-flat-button class="push-btn" (click)="onPush()" [disabled]="busy()">
                    <mat-icon>arrow_upward</mat-icon> Push
                  </button>
                </div>

                <mat-divider class="my-3"></mat-divider>

                <h4 class="section-title">Branches</h4>
                <div *ngIf="branches() as b" class="branch-row">
                  <mat-chip-set>
                    <mat-chip *ngFor="let br of b.local"
                             [highlighted]="br === b.current"
                             class="repo-chip">{{ br }}</mat-chip>
                  </mat-chip-set>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Recent commits -->
          <mat-card class="gw-card">
            <mat-card-header>
              <mat-card-title><mat-icon>history</mat-icon> Recent commits</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div *ngIf="!commits().length" class="empty-state">
                <mat-icon class="big-icon">inbox</mat-icon>
                <p>No commits yet.</p>
              </div>
              <div class="commits-list">
                <div class="commit-row" *ngFor="let c of commits()">
                  <div class="commit-avatar">{{ initials(c.author) }}</div>
                  <div class="commit-body">
                    <div class="commit-msg">{{ c.message.split('\n')[0] }}</div>
                    <div class="commit-meta">
                      <span class="sha">{{ c.shortSha }}</span>
                      <span class="dot">·</span>
                      <span>{{ c.author }}</span>
                      <span class="dot">·</span>
                      <span>{{ c.date | date:'short' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </ng-container>

        <ng-template #pickRepo>
          <mat-card class="gw-card empty-card">
            <mat-card-content class="empty-state">
              <mat-icon class="big-icon">folder_off</mat-icon>
              <h3>No repository selected</h3>
              <p>Pick a linked repo above, or link a new one to start committing.</p>
            </mat-card-content>
          </mat-card>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [`
    .gw-page { padding: 24px; max-width: 1320px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .gw-hero {
      display:flex; justify-content:space-between; align-items:center; gap:16px;
      padding:24px 28px; border-radius:16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color:#fff; box-shadow: 0 12px 32px -16px rgba(99,102,241,.55);
    }
    .gw-hero-left { display:flex; align-items:center; gap:16px; }
    .gw-hero-icon { width:54px; height:54px; border-radius:14px; background: rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; }
    .gw-hero-icon mat-icon { font-size:30px; width:30px; height:30px; }
    .gw-hero-title { margin:0; font-size:24px; font-weight:700; letter-spacing:-0.3px; }
    .gw-hero-sub { margin:4px 0 0; opacity:.85; font-size:14px; }
    .gw-hero-right { display:flex; align-items:center; gap:12px; }
    .gh-avatar { width:36px; height:36px; border-radius:50%; border:2px solid rgba(255,255,255,.6); }
    .gh-info { display:flex; flex-direction:column; }
    .gh-login { font-weight:600; }
    .gh-hint { font-size:11px; opacity:.8; font-family: ui-monospace, monospace; }
    .branch-chip { background:#eef2ff !important; color:#4338ca !important; }
    .branch-chip mat-icon { color:#4338ca !important; font-size:16px; width:16px; height:16px; }

    .gw-card { border-radius:14px !important; box-shadow: 0 4px 24px -12px rgba(15,23,42,.12) !important; }
    .gw-card mat-card-header mat-card-title { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; }
    .gw-card mat-card-header mat-card-title mat-icon { color:#6366f1; }

    .token-card .muted { color:#64748b; font-size:14px; }
    .token-card .muted code { background:#f1f5f9; padding:1px 6px; border-radius:4px; font-family: ui-monospace, monospace; }
    .token-row { display:flex; gap:12px; align-items:flex-start; }
    .token-row .grow { flex:1; }

    .repo-list-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; display:block; margin-bottom:6px; }
    .repo-chip { cursor:pointer; }
    .repo-chip-path { opacity:.65; margin-left:6px; font-size:11px; font-family: ui-monospace, monospace; }

    .link-panel { box-shadow:none !important; border:1px solid #e2e8f0; border-radius:10px !important; }
    .link-form { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; padding-top: 8px; }
    .link-form .grow { flex: 1 1 200px; }
    .link-form .grow-2 { flex: 2 1 300px; }
    .tall-btn { height:56px; }

    .gw-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
    @media (max-width: 960px) { .gw-grid { grid-template-columns: 1fr; } }

    .empty { display:flex; justify-content:center; padding:24px; }
    .empty-state { text-align:center; padding:24px 8px; color:#64748b; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .empty-state.error { color:#dc2626; }
    .big-icon { font-size:48px; width:48px; height:48px; opacity:.6; }
    .empty-card { background:#f8fafc; }
    .small { font-size:12px; }
    .muted { color:#64748b; }

    .section-title { margin:14px 0 6px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
    .section-title.staged { color:#10b981; }
    .section-title.modified { color:#f59e0b; }
    .section-title.untracked { color:#64748b; }

    .file-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:8px; font-family: ui-monospace, monospace; font-size:13px; }
    .file-row:hover { background:#f1f5f9; }
    .file-row .file-icon { font-size:18px; width:18px; height:18px; }
    .file-row.staged .file-icon { color:#10b981; }
    .file-row.modified .file-icon { color:#f59e0b; }
    .file-row.untracked .file-icon { color:#94a3b8; }

    .full { width:100%; }
    .actions-row { display:flex; gap:10px; flex-wrap:wrap; }
    .push-btn { background:#10b981 !important; color:#fff !important; }
    .my-3 { margin: 12px 0; }

    .commits-list { display:flex; flex-direction:column; gap:4px; }
    .commit-row { display:flex; align-items:flex-start; gap:12px; padding:10px; border-radius:10px; }
    .commit-row:hover { background:#f8fafc; }
    .commit-avatar {
      width:36px; height:36px; border-radius:50%;
      background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px;
    }
    .commit-body { flex:1; min-width:0; }
    .commit-msg { font-weight:500; color:#0f172a; }
    .commit-meta { font-size:12px; color:#64748b; display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:2px; }
    .commit-meta .sha { font-family: ui-monospace, monospace; background:#f1f5f9; padding:1px 6px; border-radius:4px; }
    .commit-meta .dot { opacity:.4; }
  `],
})
export class GitWorkspaceComponent implements OnInit {
  readonly git = inject(GitService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  readonly tokenStatus = signal<GithubTokenStatus | null>(null);
  readonly githubRepos = signal<GithubRepo[]>([]);
  readonly links = signal<GitRepoLink[]>([]);
  readonly status = signal<GitStatus | null>(null);
  readonly branches = signal<GitBranches | null>(null);
  readonly commits = signal<GitCommit[]>([]);
  readonly busy = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly activeLinkId = computed(() => this.git.activeLinkId());

  // form state
  tokenInput = '';
  commitMessage = '';
  newLinkRepo = '';        // "owner/name"
  newLinkProjectId: number | null = null;
  newLinkLocalPath = '';

  ngOnInit(): void {
    this.git.checkToken().subscribe({
      next: (s) => {
        this.tokenStatus.set(s);
        if (s.configured) {
          this.loadLinks();
          this.loadGithubRepos();
          if (this.activeLinkId()) this.refresh();
        }
      },
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  // ----- token ----------------------------------------------------------

  onSaveToken(): void {
    if (!this.tokenInput.trim()) return;
    this.busy.set(true);
    this.git.saveToken(this.tokenInput.trim()).subscribe({
      next: (s) => {
        this.tokenStatus.set(s);
        this.tokenInput = '';
        this.toast(`Connected as ${s.login}.`);
        this.loadLinks();
        this.loadGithubRepos();
      },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onUnlinkToken(): void {
    if (!confirm('Disconnect your GitHub account from Unitum?')) return;
    this.git.deleteToken().subscribe({
      next: () => {
        this.tokenStatus.set({ configured: false });
        this.toast('GitHub disconnected.');
        this.git.setActiveLinkId(null);
      },
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  // ----- repos / links --------------------------------------------------

  loadGithubRepos(): void {
    this.git.listMyRepos().subscribe({
      next: (r) => this.githubRepos.set(r ?? []),
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  loadLinks(): void {
    this.git.listLinks().subscribe({
      next: (l) => this.links.set(l ?? []),
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  selectLink(l: GitRepoLink): void {
    this.git.setActiveLinkId(l.id);
    this.refresh();
  }

  canLink(): boolean {
    return !!this.newLinkRepo && !!this.newLinkProjectId;
  }

  onLinkRepo(): void {
    if (!this.canLink()) return;
    const [owner, repoName] = this.newLinkRepo.split('/');
    this.busy.set(true);
    this.git.linkRepo({
      projectId: this.newLinkProjectId!,
      owner,
      repoName,
      localPath: this.newLinkLocalPath.trim() || undefined,
    }).subscribe({
      next: (link) => {
        this.toast(`Linked ${link.owner}/${link.repoName} to project ${link.projectId}.`);
        this.newLinkRepo = '';
        this.newLinkProjectId = null;
        this.newLinkLocalPath = '';
        this.loadLinks();
        this.git.setActiveLinkId(link.id);
        this.refresh();
      },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  // ----- git ops --------------------------------------------------------

  refresh(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.errorMsg.set(null);
    this.status.set(null);

    this.git.status(id).subscribe({
      next: (s) => this.status.set(s),
      error: (e) => this.errorMsg.set(this.errMsg(e)),
    });
    this.git.history(id, 15).subscribe({
      next: (c) => this.commits.set(c),
      error: () => this.commits.set([]),
    });
    this.git.branches(id).subscribe({
      next: (b) => this.branches.set(b),
      error: () => this.branches.set(null),
    });
  }

  onCommit(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    const user = this.auth.currentUser();
    this.busy.set(true);
    this.git.commit(id, {
      message: this.commitMessage.trim(),
      authorName: user?.fullName,
      authorEmail: user?.email,
      stageAll: true,
    }).subscribe({
      next: (c) => {
        this.toast(`Commit ${c.shortSha} created.`);
        this.commitMessage = '';
        this.refresh();
      },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onPush(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.busy.set(true);
    this.git.push(id).subscribe({
      next: (r) => { this.toast(`Pushed: ${r.updates.join(', ') || 'OK'}`); this.refresh(); },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onPull(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.busy.set(true);
    this.git.pull(id).subscribe({
      next: () => { this.toast('Pulled from origin.'); this.refresh(); },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }

  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.detail || e?.message || 'Unexpected error';
  }

  private toast(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
