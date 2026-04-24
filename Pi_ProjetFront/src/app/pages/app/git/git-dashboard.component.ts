import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, inject, signal, computed,
} from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import {
  Chart, ChartConfiguration,
  ArcElement, BarController, BarElement, CategoryScale, Filler, Legend,
  LineController, LineElement, LinearScale, PieController, PointElement, Tooltip,
} from 'chart.js';

import {
  GitService, GithubCollaborator, GithubRepo, GithubTokenStatus,
} from '../../../services/git.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, Filler, Legend,
  LineController, LineElement, LinearScale, PieController, PointElement, Tooltip,
);

const PALETTE = [
  '#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b',
  '#ef4444','#ec4899','#14b8a6','#a855f7','#22c55e',
];

interface Snapshot {
  totalCommits: number;
  contributorCount: number;
  repoCount: number;
  mostActiveAuthor: string | null;
  activityByDay: Record<string, number>;
  commitsByAuthor: Record<string, number>;
  commitsByRepo: Record<string, number>;
}

@Component({
  selector: 'app-git-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatProgressBarModule, MatButtonToggleModule,
  ],
  template: `
<div class="gd-page">

  <!-- Hero -->
  <div class="gd-hero">
    <div class="gd-hero-left">
      <div class="gd-hero-icon"><mat-icon>insights</mat-icon></div>
      <div>
        <h1 class="gd-hero-title">Manager Dashboard</h1>
        <p class="gd-hero-sub">Activité de tous vos repositories GitHub en temps réel.</p>
      </div>
    </div>
    <div class="gd-hero-right">
      <mat-button-toggle-group [(ngModel)]="rangeDays" (change)="refresh()" class="range-toggle">
        <mat-button-toggle [value]="7">7j</mat-button-toggle>
        <mat-button-toggle [value]="30">30j</mat-button-toggle>
        <mat-button-toggle [value]="90">90j</mat-button-toggle>
      </mat-button-toggle-group>
      <button mat-icon-button (click)="refresh()" matTooltip="Actualiser" [disabled]="loading()">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
  </div>

  <!-- No token -->
  <mat-card *ngIf="tokenStatus() && !tokenStatus()!.configured" class="gd-card empty-card">
    <mat-card-content class="empty-state">
      <mat-icon class="big-icon">vpn_key_off</mat-icon>
      <h3>GitHub non connecté</h3>
      <p>Connectez votre compte GitHub depuis la page <strong>Git Workspace</strong> pour voir l'activité ici.</p>
    </mat-card-content>
  </mat-card>

  <ng-container *ngIf="tokenStatus()?.configured">

    <!-- Loading -->
    <div *ngIf="loading()" class="loading-bar">
      <mat-spinner diameter="24"></mat-spinner>
      <span>Chargement des données GitHub…</span>
    </div>

    <!-- KPI strip -->
    <div class="kpi-grid" *ngIf="snapshot() as s">
      <div class="kpi kpi-blue">
        <mat-icon>commit</mat-icon>
        <div>
          <div class="kpi-value">{{ s.totalCommits }}</div>
          <div class="kpi-label">Commits ({{ rangeDays }}j)</div>
        </div>
      </div>
      <div class="kpi kpi-purple">
        <mat-icon>group</mat-icon>
        <div>
          <div class="kpi-value">{{ s.contributorCount }}</div>
          <div class="kpi-label">Contributeurs</div>
        </div>
      </div>
      <div class="kpi kpi-green">
        <mat-icon>folder_special</mat-icon>
        <div>
          <div class="kpi-value">{{ s.repoCount }}</div>
          <div class="kpi-label">Repositories</div>
        </div>
      </div>
      <div class="kpi kpi-amber">
        <mat-icon>star</mat-icon>
        <div>
          <div class="kpi-value kpi-value--sm">{{ s.mostActiveAuthor || '—' }}</div>
          <div class="kpi-label">Plus actif</div>
        </div>
      </div>
    </div>

    <!-- Activité courbe -->
    <mat-card class="gd-card" *ngIf="snapshot()">
      <mat-card-header>
        <mat-card-title><mat-icon>show_chart</mat-icon> Activité des commits</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-wrap"><canvas #activityCanvas></canvas></div>
      </mat-card-content>
    </mat-card>

    <div class="gd-grid" *ngIf="snapshot()">
      <!-- Pie auteurs -->
      <mat-card class="gd-card">
        <mat-card-header>
          <mat-card-title><mat-icon>pie_chart</mat-icon> Contributions par développeur</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-wrap small"><canvas #authorsCanvas></canvas></div>
        </mat-card-content>
      </mat-card>

      <!-- Bar repos -->
      <mat-card class="gd-card">
        <mat-card-header>
          <mat-card-title><mat-icon>bar_chart</mat-icon> Commits par repository</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-wrap small"><canvas #reposCanvas></canvas></div>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Collaborateurs -->
    <mat-card class="gd-card">
      <mat-card-header>
        <mat-card-title><mat-icon>person_add</mat-icon> Membres du repository</mat-card-title>
        <span class="grow"></span>
        <mat-form-field appearance="outline" class="picker">
          <mat-label>Repository</mat-label>
          <mat-select [(ngModel)]="selectedRepoKey" (ngModelChange)="onRepoChange($event)">
            <mat-option *ngFor="let r of repos()" [value]="r.full_name">
              <mat-icon style="font-size:14px;vertical-align:middle">
                {{ r.private ? 'lock' : 'folder' }}
              </mat-icon>
              {{ r.full_name }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card-header>
      <mat-card-content>
        <!-- Invite row (visible uniquement si repo sélectionné) -->
        <div class="add-row" *ngIf="selectedRepoKey">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Nom d'utilisateur GitHub</mat-label>
            <input matInput [(ngModel)]="newUsername" placeholder="octocat" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="perm">
            <mat-label>Permission</mat-label>
            <mat-select [(ngModel)]="newPermission">
              <mat-option value="pull">Lecture</mat-option>
              <mat-option value="triage">Triage</mat-option>
              <mat-option value="push">Écriture</mat-option>
              <mat-option value="maintain">Maintain</mat-option>
              <mat-option value="admin">Admin</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" class="tall-btn"
                  (click)="onInvite()" [disabled]="busy() || !newUsername.trim()">
            <mat-icon>person_add</mat-icon> Inviter
          </button>
        </div>

        <div *ngIf="loadingCollabs()" class="loading-bar" style="padding:12px 0">
          <mat-spinner diameter="20"></mat-spinner><span>Chargement…</span>
        </div>

        <div *ngIf="!selectedRepoKey && !loadingCollabs()" class="empty-state-small">
          Sélectionnez un repository pour voir ses membres.
        </div>
        <div *ngIf="selectedRepoKey && !loadingCollabs() && collaborators().length === 0" class="empty-state-small">
          Aucun collaborateur trouvé.
        </div>

        <div class="member-list">
          <div class="member-row" *ngFor="let m of collaborators()">
            <img class="member-avatar" [src]="m.avatar_url" [alt]="m.login" />
            <div class="member-body">
              <a class="member-login" [href]="m.html_url" target="_blank">{{ m.login }}</a>
              <div class="member-perms">
                <span *ngIf="m.permissions?.admin"    class="perm-pill admin">admin</span>
                <span *ngIf="m.permissions?.maintain && !m.permissions?.admin" class="perm-pill maintain">maintain</span>
                <span *ngIf="m.permissions?.push && !m.permissions?.maintain && !m.permissions?.admin" class="perm-pill push">write</span>
                <span *ngIf="m.permissions?.triage && !m.permissions?.push" class="perm-pill triage">triage</span>
                <span *ngIf="m.permissions?.pull && !m.permissions?.triage && !m.permissions?.push" class="perm-pill pull">read</span>
              </div>
            </div>
            <button mat-icon-button color="warn" (click)="onRemove(m.login)" matTooltip="Retirer">
              <mat-icon>person_remove</mat-icon>
            </button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

  </ng-container>
</div>
  `,
  styles: [`
    .gd-page { padding:24px; max-width:1400px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }

    .gd-hero {
      display:flex; justify-content:space-between; align-items:center; gap:16px;
      padding:24px 28px; border-radius:16px;
      background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);
      color:#fff; box-shadow:0 12px 32px -16px rgba(14,165,233,.55);
    }
    .gd-hero-left  { display:flex; align-items:center; gap:16px; }
    .gd-hero-icon  { width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; }
    .gd-hero-icon mat-icon { font-size:30px; width:30px; height:30px; }
    .gd-hero-title { margin:0; font-size:24px; font-weight:700; }
    .gd-hero-sub   { margin:4px 0 0; opacity:.85; font-size:14px; }
    .gd-hero-right { display:flex; align-items:center; gap:8px; }
    .range-toggle  { background:rgba(255,255,255,.95); border-radius:8px; }

    .loading-bar { display:flex; align-items:center; gap:12px; color:#6366f1; font-size:.88rem; padding:8px 0; }

    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    @media(max-width:960px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
    .kpi {
      display:flex; align-items:center; gap:14px; padding:18px 20px;
      border-radius:14px; background:#fff; box-shadow:0 4px 24px -12px rgba(15,23,42,.12);
    }
    .kpi mat-icon { font-size:34px; width:34px; height:34px; padding:10px; border-radius:12px; }
    .kpi-blue   mat-icon { background:#dbeafe; color:#2563eb; }
    .kpi-purple mat-icon { background:#ede9fe; color:#7c3aed; }
    .kpi-green  mat-icon { background:#dcfce7; color:#16a34a; }
    .kpi-amber  mat-icon { background:#fef3c7; color:#d97706; }
    .kpi-value { font-size:22px; font-weight:700; color:#0f172a; }
    .kpi-value--sm { font-size:14px; font-weight:600; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .kpi-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }

    .gd-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    @media(max-width:1100px) { .gd-grid { grid-template-columns:1fr; } }

    .gd-card { border-radius:14px !important; box-shadow:0 4px 24px -12px rgba(15,23,42,.12) !important; }
    .gd-card mat-card-header mat-card-title { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; }
    .gd-card mat-card-header mat-card-title mat-icon { color:#6366f1; }
    .grow  { flex:1; }
    .picker { width:240px; }

    .chart-wrap { position:relative; height:320px; padding:8px 4px; }
    .chart-wrap.small { height:280px; }

    .add-row { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; margin-bottom:8px; }
    .add-row .grow { flex:1 1 200px; }
    .add-row .perm { flex:0 0 140px; }
    .tall-btn { height:56px; }

    .empty-state-small { text-align:center; padding:16px; color:#94a3b8; font-size:13px; }
    .member-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
    .member-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; }
    .member-row:hover { background:#f8fafc; }
    .member-avatar { width:36px; height:36px; border-radius:50%; }
    .member-body   { flex:1; min-width:0; }
    .member-login  { font-weight:600; color:#0f172a; text-decoration:none; }
    .member-login:hover { color:#6366f1; }
    .member-perms  { display:flex; gap:4px; margin-top:2px; }
    .perm-pill { font-size:10px; padding:2px 8px; border-radius:8px; text-transform:uppercase; letter-spacing:.3px; }
    .perm-pill.admin    { background:#fee2e2; color:#dc2626; }
    .perm-pill.maintain { background:#fef3c7; color:#d97706; }
    .perm-pill.push     { background:#dbeafe; color:#2563eb; }
    .perm-pill.triage   { background:#ede9fe; color:#7c3aed; }
    .perm-pill.pull     { background:#dcfce7; color:#16a34a; }

    .empty-state { text-align:center; padding:32px 8px; color:#64748b; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .big-icon { font-size:48px; width:48px; height:48px; opacity:.5; }
    .empty-card { background:#f8fafc; }
  `],
})
export class GitDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly git   = inject(GitService);
  private readonly snack = inject(MatSnackBar);

  readonly tokenStatus   = signal<GithubTokenStatus | null>(null);
  readonly repos         = signal<GithubRepo[]>([]);
  readonly snapshot      = signal<Snapshot | null>(null);
  readonly collaborators = signal<GithubCollaborator[]>([]);
  readonly loading       = signal(false);
  readonly loadingCollabs= signal(false);
  readonly busy          = signal(false);

  rangeDays: 7 | 30 | 90 = 30;
  selectedRepoKey = '';
  newUsername     = '';
  newPermission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin' = 'push';

  @ViewChild('activityCanvas') activityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('authorsCanvas')  authorsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reposCanvas')    reposCanvas!: ElementRef<HTMLCanvasElement>;

  private activityChart?: Chart;
  private authorsChart?: Chart;
  private reposChart?: Chart;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.git.checkToken().subscribe({
      next: s => {
        this.tokenStatus.set(s);
        if (s.configured) this.refresh();
      },
      error: e => this.toast(this.errMsg(e)),
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.activityChart?.destroy();
    this.authorsChart?.destroy();
    this.reposChart?.destroy();
  }

  // ── Main refresh ─────────────────────────────────────────────────────────

  refresh(): void {
    this.loading.set(true);
    this.snapshot.set(null);

    // 1. Load all repos
    this.git.managerListRepos(1, 100).subscribe({
      next: repos => {
        this.repos.set(repos ?? []);
        if (!repos || repos.length === 0) { this.loading.set(false); return; }

        // 2. Load commits for up to 10 repos in parallel
        const targets = repos.slice(0, 10);
        const calls = targets.map(r =>
          this.git.managerCommits(r.owner!.login, r.name, r.default_branch, 100).pipe(
            catchError(() => of([]))
          )
        );

        forkJoin(calls).subscribe({
          next: results => {
            const snap = this.buildSnapshot(targets, results as any[][], repos.length);
            this.snapshot.set(snap);
            this.loading.set(false);
            setTimeout(() => this.drawCharts(snap), 50);
          },
          error: () => this.loading.set(false),
        });
      },
      error: e => { this.toast(this.errMsg(e)); this.loading.set(false); },
    });
  }

  // ── Snapshot builder ─────────────────────────────────────────────────────

  private buildSnapshot(repos: GithubRepo[], allCommits: any[][], totalRepos: number): Snapshot {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.rangeDays);

    const activityByDay: Record<string, number>   = {};
    const commitsByAuthor: Record<string, number> = {};
    const commitsByRepo: Record<string, number>   = {};
    let totalCommits = 0;

    repos.forEach((repo, i) => {
      const commits = (allCommits[i] ?? []).filter((c: any) => {
        const d = c.commit?.author?.date;
        return d ? new Date(d) >= cutoff : true;
      });

      if (commits.length === 0) return;
      commitsByRepo[repo.name] = commits.length;
      totalCommits += commits.length;

      commits.forEach((c: any) => {
        const author = c.commit?.author?.name || c.author?.login || 'Unknown';
        commitsByAuthor[author] = (commitsByAuthor[author] ?? 0) + 1;

        const raw = c.commit?.author?.date;
        if (raw) {
          const day = new Date(raw).toISOString().slice(0, 10);
          activityByDay[day] = (activityByDay[day] ?? 0) + 1;
        }
      });
    });

    // Sort activityByDay by date
    const sortedActivity: Record<string, number> = {};
    Object.keys(activityByDay).sort().forEach(k => { sortedActivity[k] = activityByDay[k]; });

    const mostActive = Object.entries(commitsByAuthor).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalCommits,
      contributorCount: Object.keys(commitsByAuthor).length,
      repoCount: totalRepos,
      mostActiveAuthor: mostActive,
      activityByDay: sortedActivity,
      commitsByAuthor,
      commitsByRepo,
    };
  }

  // ── Collaborators ────────────────────────────────────────────────────────

  onRepoChange(fullName: string): void {
    if (!fullName) { this.collaborators.set([]); return; }
    const [owner, repoName] = fullName.split('/');
    this.loadingCollabs.set(true);
    this.git.listCollaborators(owner, repoName).subscribe({
      next:  c => { this.collaborators.set(c ?? []); this.loadingCollabs.set(false); },
      error: () => { this.collaborators.set([]); this.loadingCollabs.set(false); },
    });
  }

  onInvite(): void {
    if (!this.selectedRepoKey || !this.newUsername.trim()) return;
    const [owner, repoName] = this.selectedRepoKey.split('/');
    this.busy.set(true);
    this.git.inviteCollaborator(owner, repoName, this.newUsername.trim(), this.newPermission).subscribe({
      next: () => {
        this.toast(`Invitation envoyée à ${this.newUsername}.`);
        this.newUsername = '';
        this.onRepoChange(this.selectedRepoKey);
      },
      error:    e => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onRemove(login: string): void {
    if (!this.selectedRepoKey) return;
    if (!confirm(`Retirer ${login} de ${this.selectedRepoKey} ?`)) return;
    const [owner, repoName] = this.selectedRepoKey.split('/');
    this.git.removeCollaborator(owner, repoName, login).subscribe({
      next:  () => { this.toast(`${login} retiré.`); this.onRepoChange(this.selectedRepoKey); },
      error: e => this.toast(this.errMsg(e)),
    });
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private drawCharts(s: Snapshot): void {

    // Activity line chart
    if (this.activityCanvas?.nativeElement) {
      const labels = Object.keys(s.activityByDay);
      const data   = Object.values(s.activityByDay);
      this.activityChart?.destroy();
      this.activityChart = new Chart(this.activityCanvas.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Commits',
            data,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 14 } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      } as ChartConfiguration);
    }

    // Authors pie
    if (this.authorsCanvas?.nativeElement) {
      const entries = Object.entries(s.commitsByAuthor).sort((a, b) => b[1] - a[1]).slice(0, 10);
      this.authorsChart?.destroy();
      this.authorsChart = new Chart(this.authorsCanvas.nativeElement, {
        type: 'pie',
        data: {
          labels: entries.map(([k]) => k),
          datasets: [{
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } },
        },
      } as ChartConfiguration);
    }

    // Repos bar
    if (this.reposCanvas?.nativeElement) {
      const entries = Object.entries(s.commitsByRepo).sort((a, b) => b[1] - a[1]);
      this.reposChart?.destroy();
      this.reposChart = new Chart(this.reposCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: entries.map(([k]) => k),
          datasets: [{
            label: 'Commits',
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } },
            y: { grid: { display: false } },
          },
        },
      } as ChartConfiguration);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.detail || e?.message || 'Erreur inattendue';
  }

  private toast(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
