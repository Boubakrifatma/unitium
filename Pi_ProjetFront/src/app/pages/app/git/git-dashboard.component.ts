import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
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
  Chart,
  ChartConfiguration,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js';

import {
  GitDashboardSnapshot,
  GitRepoLink,
  GitService,
  GithubCollaborator,
  GithubTokenStatus,
} from '../../../services/git.service';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, Filler, Legend,
  LineController, LineElement, LinearScale, PieController, PointElement, Tooltip,
);

const PALETTE = [
  '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#a855f7', '#22c55e',
];

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
            <h1 class="gd-hero-title">Git Dashboard</h1>
            <p class="gd-hero-sub">Live activity across every linked repository in your team.</p>
          </div>
        </div>
        <div class="gd-hero-right">
          <mat-button-toggle-group [(ngModel)]="rangeDays" (change)="refresh()" class="range-toggle">
            <mat-button-toggle [value]="7">7d</mat-button-toggle>
            <mat-button-toggle [value]="30">30d</mat-button-toggle>
            <mat-button-toggle [value]="90">90d</mat-button-toggle>
            <mat-button-toggle [value]="365">1y</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh"><mat-icon>refresh</mat-icon></button>
        </div>
      </div>

      <ng-container *ngIf="tokenStatus()?.configured; else noToken">
        <!-- KPI strip -->
        <div class="kpi-grid" *ngIf="snapshot() as s">
          <div class="kpi kpi-blue">
            <mat-icon>commit</mat-icon>
            <div>
              <div class="kpi-value">{{ s.totalCommits }}</div>
              <div class="kpi-label">Commits ({{ rangeDays }}d)</div>
            </div>
          </div>
          <div class="kpi kpi-purple">
            <mat-icon>group</mat-icon>
            <div>
              <div class="kpi-value">{{ s.contributorCount }}</div>
              <div class="kpi-label">Contributors</div>
            </div>
          </div>
          <div class="kpi kpi-green">
            <mat-icon>folder_special</mat-icon>
            <div>
              <div class="kpi-value">{{ s.repoCount }}</div>
              <div class="kpi-label">Linked repos</div>
            </div>
          </div>
          <div class="kpi kpi-amber">
            <mat-icon>star</mat-icon>
            <div>
              <div class="kpi-value">{{ s.mostActiveAuthor || '—' }}</div>
              <div class="kpi-label">Most active</div>
            </div>
          </div>
        </div>

        <!-- Activity curve -->
        <mat-card class="gd-card">
          <mat-card-header>
            <mat-card-title><mat-icon>show_chart</mat-icon> Commit activity</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap"><canvas #activityCanvas></canvas></div>
          </mat-card-content>
        </mat-card>

        <div class="gd-grid">
          <!-- Contributions pie -->
          <mat-card class="gd-card">
            <mat-card-header>
              <mat-card-title><mat-icon>pie_chart</mat-icon> Contributions per developer</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-wrap small"><canvas #authorsCanvas></canvas></div>
            </mat-card-content>
          </mat-card>

          <!-- Per-repo bar -->
          <mat-card class="gd-card">
            <mat-card-header>
              <mat-card-title><mat-icon>bar_chart</mat-icon> Commits per repository</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-wrap small"><canvas #reposCanvas></canvas></div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Collaborators per repo -->
        <mat-card class="gd-card">
          <mat-card-header>
            <mat-card-title><mat-icon>person_add</mat-icon> Repository members</mat-card-title>
            <span class="grow"></span>
            <mat-form-field appearance="outline" class="picker">
              <mat-label>Repository</mat-label>
              <mat-select [(ngModel)]="selectedLinkId" (selectionChange)="onRepoChange()">
                <mat-option *ngFor="let l of links()" [value]="l.id">
                  {{ l.owner }}/{{ l.repoName }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-header>
          <mat-card-content>
            <div class="add-row">
              <mat-form-field appearance="outline" class="grow">
                <mat-label>GitHub username</mat-label>
                <input matInput [(ngModel)]="newUsername" placeholder="octocat" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="perm">
                <mat-label>Permission</mat-label>
                <mat-select [(ngModel)]="newPermission">
                  <mat-option value="pull">Read</mat-option>
                  <mat-option value="triage">Triage</mat-option>
                  <mat-option value="push">Write</mat-option>
                  <mat-option value="maintain">Maintain</mat-option>
                  <mat-option value="admin">Admin</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" class="tall-btn"
                      (click)="onInvite()" [disabled]="busy() || !canInvite()">
                <mat-icon>person_add</mat-icon> Invite
              </button>
            </div>

            <div *ngIf="!collaborators().length" class="empty-state-small">
              <p>No collaborators yet — or no repository selected.</p>
            </div>

            <div class="member-list">
              <div class="member-row" *ngFor="let m of collaborators()">
                <img class="member-avatar" [src]="m.avatar_url" [alt]="m.login" />
                <div class="member-body">
                  <a class="member-login" [href]="m.html_url" target="_blank">{{ m.login }}</a>
                  <div class="member-perms">
                    <span *ngIf="m.permissions?.admin" class="perm-pill admin">admin</span>
                    <span *ngIf="m.permissions?.maintain && !m.permissions?.admin" class="perm-pill maintain">maintain</span>
                    <span *ngIf="m.permissions?.push && !m.permissions?.maintain && !m.permissions?.admin" class="perm-pill push">write</span>
                    <span *ngIf="m.permissions?.triage && !m.permissions?.push" class="perm-pill triage">triage</span>
                    <span *ngIf="m.permissions?.pull && !m.permissions?.triage && !m.permissions?.push" class="perm-pill pull">read</span>
                  </div>
                </div>
                <button mat-icon-button (click)="onRemove(m.login)" matTooltip="Remove" color="warn">
                  <mat-icon>person_remove</mat-icon>
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-container>

      <ng-template #noToken>
        <mat-card class="gd-card empty-card">
          <mat-card-content class="empty-state">
            <mat-icon class="big-icon">vpn_key_off</mat-icon>
            <h3>GitHub not connected</h3>
            <p>Connect your GitHub account from the Git Workspace page to see your team's activity here.</p>
          </mat-card-content>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .gd-page { padding:24px; max-width: 1400px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }

    .gd-hero {
      display:flex; justify-content:space-between; align-items:center; gap:16px;
      padding:24px 28px; border-radius:16px;
      background: linear-gradient(135deg,#0ea5e9 0%, #6366f1 100%);
      color:#fff; box-shadow: 0 12px 32px -16px rgba(14,165,233,.55);
    }
    .gd-hero-left { display:flex; align-items:center; gap:16px; }
    .gd-hero-icon {
      width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,.18);
      display:flex; align-items:center; justify-content:center;
    }
    .gd-hero-icon mat-icon { font-size:30px; width:30px; height:30px; }
    .gd-hero-title { margin:0; font-size:24px; font-weight:700; letter-spacing:-0.3px; }
    .gd-hero-sub { margin:4px 0 0; opacity:.85; font-size:14px; }
    .gd-hero-right { display:flex; align-items:center; gap:8px; color:#fff; }
    .range-toggle { background:rgba(255,255,255,.95); border-radius:8px; }

    .kpi-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; }
    @media (max-width: 960px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi {
      display:flex; align-items:center; gap:14px; padding:18px 20px;
      border-radius:14px; background:#fff; box-shadow:0 4px 24px -12px rgba(15,23,42,.12);
    }
    .kpi mat-icon { font-size:34px; width:34px; height:34px; padding:10px; border-radius:12px; }
    .kpi-blue mat-icon   { background:#dbeafe; color:#2563eb; }
    .kpi-purple mat-icon { background:#ede9fe; color:#7c3aed; }
    .kpi-green mat-icon  { background:#dcfce7; color:#16a34a; }
    .kpi-amber mat-icon  { background:#fef3c7; color:#d97706; }
    .kpi-value { font-size:22px; font-weight:700; color:#0f172a; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .kpi-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }

    .gd-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
    @media (max-width: 1100px) { .gd-grid { grid-template-columns: 1fr; } }

    .gd-card { border-radius:14px !important; box-shadow: 0 4px 24px -12px rgba(15,23,42,.12) !important; }
    .gd-card mat-card-header mat-card-title {
      display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600;
    }
    .gd-card mat-card-header mat-card-title mat-icon { color:#6366f1; }
    .grow { flex: 1; }
    .picker { width: 240px; }

    .chart-wrap { position:relative; height: 320px; padding: 8px 4px; }
    .chart-wrap.small { height: 280px; }

    .add-row { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; }
    .add-row .grow { flex: 1 1 200px; }
    .add-row .perm { flex: 0 0 130px; }
    .tall-btn { height:56px; }
    .empty-state-small { text-align:center; padding:12px; color:#94a3b8; font-size:13px; }
    .member-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
    .member-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; }
    .member-row:hover { background:#f8fafc; }
    .member-avatar { width:36px; height:36px; border-radius:50%; }
    .member-body { flex:1; min-width:0; }
    .member-login { font-weight:600; color:#0f172a; text-decoration:none; }
    .member-login:hover { color:#6366f1; }
    .member-perms { display:flex; gap:4px; margin-top:2px; }
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
  private readonly git = inject(GitService);
  private readonly snack = inject(MatSnackBar);

  readonly tokenStatus = signal<GithubTokenStatus | null>(null);
  readonly snapshot = signal<GitDashboardSnapshot | null>(null);
  readonly links = signal<GitRepoLink[]>([]);
  readonly collaborators = signal<GithubCollaborator[]>([]);
  readonly busy = signal(false);

  rangeDays: 7 | 30 | 90 | 365 = 30;
  selectedLinkId: number | null = null;
  newUsername = '';
  newPermission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin' = 'push';

  @ViewChild('activityCanvas') activityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('authorsCanvas') authorsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reposCanvas') reposCanvas!: ElementRef<HTMLCanvasElement>;

  private activityChart?: Chart;
  private authorsChart?: Chart;
  private reposChart?: Chart;

  ngOnInit(): void {
    this.git.checkToken().subscribe({
      next: (s) => {
        this.tokenStatus.set(s);
        if (s.configured) {
          this.git.listLinks().subscribe({
            next: (l) => {
              this.links.set(l ?? []);
              const stored = this.git.activeLinkId();
              this.selectedLinkId = stored ?? l?.[0]?.id ?? null;
              if (this.selectedLinkId) this.loadCollaborators();
            },
          });
          this.refresh();
        }
      },
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  ngAfterViewInit(): void {
    // Charts get built when snapshot arrives — see drawCharts().
  }

  ngOnDestroy(): void {
    this.activityChart?.destroy();
    this.authorsChart?.destroy();
    this.reposChart?.destroy();
  }

  refresh(): void {
    this.git.dashboardSnapshot({ days: this.rangeDays }).subscribe({
      next: (s) => {
        this.snapshot.set(s);
        // Wait one microtask for the canvases to be in the DOM.
        queueMicrotask(() => this.drawCharts(s));
      },
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  onRepoChange(): void {
    if (this.selectedLinkId != null) {
      this.git.setActiveLinkId(this.selectedLinkId);
      this.loadCollaborators();
    }
  }

  loadCollaborators(): void {
    const link = this.links().find((l) => l.id === this.selectedLinkId);
    if (!link) { this.collaborators.set([]); return; }
    this.git.listCollaborators(link.owner, link.repoName).subscribe({
      next: (c) => this.collaborators.set(c ?? []),
      error: () => this.collaborators.set([]),
    });
  }

  canInvite(): boolean {
    return !!this.newUsername.trim() && this.selectedLinkId != null;
  }

  onInvite(): void {
    const link = this.links().find((l) => l.id === this.selectedLinkId);
    if (!link || !this.newUsername.trim()) return;
    this.busy.set(true);
    this.git.inviteCollaborator(link.owner, link.repoName, this.newUsername.trim(), this.newPermission).subscribe({
      next: () => { this.toast(`Invitation sent to ${this.newUsername}.`); this.newUsername = ''; this.loadCollaborators(); },
      error: (e) => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onRemove(login: string): void {
    const link = this.links().find((l) => l.id === this.selectedLinkId);
    if (!link) return;
    if (!confirm(`Remove ${login} from ${link.owner}/${link.repoName}?`)) return;
    this.git.removeCollaborator(link.owner, link.repoName, login).subscribe({
      next: () => { this.toast(`${login} removed.`); this.loadCollaborators(); },
      error: (e) => this.toast(this.errMsg(e)),
    });
  }

  // ---- charts -----------------------------------------------------------

  private drawCharts(s: GitDashboardSnapshot): void {
    if (this.activityCanvas?.nativeElement) {
      const labels = Object.keys(s.activityByDay);
      const data = Object.values(s.activityByDay);
      const cfg: ChartConfiguration = {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Commits',
            data,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.18)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      };
      this.activityChart?.destroy();
      this.activityChart = new Chart(this.activityCanvas.nativeElement, cfg);
    }

    if (this.authorsCanvas?.nativeElement) {
      const entries = Object.entries(s.commitsByAuthor).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const cfg: ChartConfiguration = {
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
      };
      this.authorsChart?.destroy();
      this.authorsChart = new Chart(this.authorsCanvas.nativeElement, cfg);
    }

    if (this.reposCanvas?.nativeElement) {
      const entries = Object.entries(s.commitsByRepo).sort((a, b) => b[1] - a[1]);
      const cfg: ChartConfiguration = {
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
      };
      this.reposChart?.destroy();
      this.reposChart = new Chart(this.reposCanvas.nativeElement, cfg);
    }
  }

  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.detail || e?.message || 'Unexpected error';
  }

  private toast(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
