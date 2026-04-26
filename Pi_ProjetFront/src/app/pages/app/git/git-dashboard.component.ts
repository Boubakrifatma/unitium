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
  GitService, GithubCollaborator, GithubRepo, GithubTokenStatus, ManagerBranch,
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
      <mat-button-toggle-group [(ngModel)]="allBranches" (change)="refresh()" class="branch-toggle">
        <mat-button-toggle [value]="false"><mat-icon style="font-size:14px;width:14px;height:14px;margin-right:4px">commit</mat-icon>main</mat-button-toggle>
        <mat-button-toggle [value]="true"><mat-icon style="font-size:14px;width:14px;height:14px;margin-right:4px">call_split</mat-icon>Toutes les branches</mat-button-toggle>
      </mat-button-toggle-group>
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

    <!-- ══ Tous les repositories ══ -->
    <mat-card class="gd-card" *ngIf="repos().length > 0">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>storage</mat-icon> Tous les repositories
          <span class="count-badge">{{ repos().length }}</span>
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="repos-table-wrap">
          <div class="repos-table-head">
            <span>Repository</span><span>Langage</span><span>Branche défaut</span>
            <span>Stars</span><span>Forks</span><span>Dernière MAJ</span><span>Visibilité</span>
          </div>
          <div class="repos-table-row" *ngFor="let r of repos()">
            <span class="repo-name-cell">
              <mat-icon class="repo-icon-sm" [style.color]="r.private ? '#f59e0b' : '#10b981'">
                {{ r.private ? 'lock' : 'folder_open' }}
              </mat-icon>
              <a class="repo-link" [href]="r.html_url" target="_blank">{{ r.name }}</a>
            </span>
            <span>
              <span *ngIf="r.language" class="lang-badge">{{ r.language }}</span>
              <span *ngIf="!r.language" class="muted-val">—</span>
            </span>
            <span><span class="def-branch">{{ r.default_branch }}</span></span>
            <span>{{ r.stargazers_count ?? 0 }}</span>
            <span>{{ r.forks_count ?? 0 }}</span>
            <span class="muted-val">{{ r.updated_at | date:'dd/MM/yy' }}</span>
            <span>
              <span class="vis-pill" [class.vis-private]="r.private">
                {{ r.private ? 'Privé' : 'Public' }}
              </span>
            </span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- ══ Explorateur de branches ══ -->
    <mat-card class="gd-card">
      <mat-card-header>
        <mat-card-title><mat-icon>call_split</mat-icon> État des branches par repository</mat-card-title>
        <span class="grow"></span>
        <mat-form-field appearance="outline" class="picker">
          <mat-label>Repository</mat-label>
          <mat-select [(ngModel)]="branchExploreRepo" (ngModelChange)="onBranchRepoChange($event)">
            <mat-option *ngFor="let r of repos()" [value]="r.full_name">{{ r.full_name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card-header>
      <mat-card-content>
        <div *ngIf="!branchExploreRepo" class="empty-state-small">
          Sélectionnez un repository pour voir l'état de ses branches.
        </div>
        <div *ngIf="loadingBranchList()" class="loading-bar" style="padding:12px 0">
          <mat-spinner diameter="20"></mat-spinner><span>Chargement des branches…</span>
        </div>
        <div class="branch-explorer" *ngIf="branchExploreRepo && !loadingBranchList()">
          <div class="branch-explorer-left">
            <div class="bex-title">{{ repoBranchList().length }} branche(s)</div>
            <div class="bex-list">
              <div class="bex-item"
                   *ngFor="let b of repoBranchList()"
                   [class.active]="branchExploreSelected === b.name"
                   (click)="onBranchExploreSelect(b.name)">
                <mat-icon class="bex-icon" [style.color]="b.protected ? '#6366f1' : '#64748b'">
                  {{ b.protected ? 'shield' : 'call_split' }}
                </mat-icon>
                <span class="bex-name">{{ b.name }}</span>
                <span *ngIf="b.protected" class="bex-prot">protégée</span>
              </div>
              <div *ngIf="repoBranchList().length === 0" class="empty-state-small">Aucune branche trouvée.</div>
            </div>
          </div>
          <div class="branch-explorer-right">
            <div *ngIf="!branchExploreSelected" class="empty-state-small" style="padding:32px 8px">
              <mat-icon style="font-size:36px;width:36px;height:36px;opacity:.4;display:block;margin:0 auto 8px">call_split</mat-icon>
              Cliquez sur une branche pour voir ses commits.
            </div>
            <div *ngIf="loadingBranchCmits()" class="loading-bar" style="padding:12px">
              <mat-spinner diameter="20"></mat-spinner><span>Chargement…</span>
            </div>
            <ng-container *ngIf="branchExploreSelected && !loadingBranchCmits()">
              <div class="bex-commits-title">
                <mat-icon>commit</mat-icon>
                <strong>{{ branchExploreSelected }}</strong>
                — {{ branchExploreCmits().length }} commit(s)
              </div>
              <div class="commits-list" *ngIf="branchExploreCmits().length > 0">
                <div class="commit-row" *ngFor="let c of branchExploreCmits()">
                  <div class="commit-avatar">{{ initials(c.commit?.author?.name || c.author?.login || '?') }}</div>
                  <div class="commit-body">
                    <div class="commit-msg">{{ firstLine(c.commit?.message) }}</div>
                    <div class="commit-meta">
                      <span class="sha">{{ c.sha?.slice(0,7) }}</span>
                      <span class="dot">·</span>
                      <span>{{ c.commit?.author?.name || c.author?.login }}</span>
                      <span class="dot">·</span>
                      <span>{{ c.commit?.author?.date | date:'dd/MM/yy HH:mm' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="branchExploreCmits().length === 0" class="empty-state-small">
                Aucun commit trouvé sur cette branche.
              </div>
            </ng-container>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

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
    .branch-toggle { background:rgba(255,255,255,.95); border-radius:8px; }

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

    /* ── Repos table ── */
    .count-badge { margin-left:8px; background:#ede9fe; color:#5b21b6; padding:2px 10px; border-radius:999px; font-size:.72rem; font-weight:700; }
    .repos-table-wrap { overflow-x:auto; }
    .repos-table-head, .repos-table-row {
      display:grid;
      grid-template-columns: 2fr 1fr 1.2fr 60px 60px 90px 80px;
      gap:8px; align-items:center; padding:8px 12px;
    }
    .repos-table-head {
      font-size:.72rem; text-transform:uppercase; letter-spacing:.5px;
      color:#94a3b8; font-weight:700; border-bottom:2px solid #f1f5f9;
    }
    .repos-table-row { border-radius:8px; font-size:.85rem; color:#334155; }
    .repos-table-row:hover { background:#f8fafc; }
    .repo-name-cell { display:flex; align-items:center; gap:6px; }
    .repo-icon-sm { font-size:16px; width:16px; height:16px; flex-shrink:0; }
    .repo-link { color:#4338ca; text-decoration:none; font-weight:600; font-size:.85rem; }
    .repo-link:hover { text-decoration:underline; }
    .lang-badge { background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:6px; font-size:.72rem; font-weight:600; }
    .def-branch { background:#eef2ff; color:#4338ca; padding:2px 8px; border-radius:6px; font-size:.72rem; font-weight:600; }
    .vis-pill { padding:2px 8px; border-radius:999px; font-size:.7rem; font-weight:700; background:#dcfce7; color:#166534; }
    .vis-pill.vis-private { background:#fef3c7; color:#92400e; }
    .muted-val { color:#94a3b8; font-size:.8rem; }

    /* ── Branch explorer ── */
    .branch-explorer { display:grid; grid-template-columns:220px 1fr; gap:0; min-height:320px; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
    .branch-explorer-left { border-right:1px solid #e2e8f0; background:#f8fafc; display:flex; flex-direction:column; }
    .bex-title { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#94a3b8; padding:10px 12px 6px; }
    .bex-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:2px; padding:0 8px 8px; }
    .bex-item { display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:.85rem; color:#334155; transition:background .15s; }
    .bex-item:hover { background:#e0e7ff; }
    .bex-item.active { background:#eef2ff; font-weight:600; color:#4338ca; }
    .bex-icon { font-size:16px; width:16px; height:16px; flex-shrink:0; }
    .bex-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bex-prot { background:#ede9fe; color:#6d28d9; font-size:.65rem; padding:1px 6px; border-radius:99px; font-weight:700; flex-shrink:0; }
    .branch-explorer-right { overflow-y:auto; display:flex; flex-direction:column; }
    .bex-commits-title { display:flex; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid #f1f5f9; font-size:.88rem; color:#334155; background:#fff; }
    .bex-commits-title mat-icon { color:#6366f1; font-size:18px; width:18px; height:18px; }
    .commits-list { display:flex; flex-direction:column; gap:2px; padding:8px; max-height:400px; overflow-y:auto; }
    .commit-row { display:flex; align-items:flex-start; gap:10px; padding:8px 10px; border-radius:8px; }
    .commit-row:hover { background:#f8fafc; }
    .commit-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px; flex-shrink:0; }
    .commit-body { flex:1; min-width:0; }
    .commit-msg  { font-weight:500; color:#0f172a; font-size:.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .commit-meta { font-size:.72rem; color:#64748b; display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:2px; }
    .sha  { font-family:ui-monospace,monospace; background:#f1f5f9; padding:1px 5px; border-radius:4px; }
    .dot  { opacity:.4; }
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
  allBranches = true;
  selectedRepoKey = '';
  newUsername     = '';
  newPermission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin' = 'push';

  // Branch explorer
  branchExploreRepo     = '';
  readonly repoBranchList     = signal<ManagerBranch[]>([]);
  branchExploreSelected = '';
  readonly branchExploreCmits = signal<any[]>([]);
  readonly loadingBranchList  = signal(false);
  readonly loadingBranchCmits = signal(false);

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

    this.git.managerListRepos(1, 100).subscribe({
      next: repos => {
        this.repos.set(repos ?? []);
        if (!repos || repos.length === 0) { this.loading.set(false); return; }

        const targets = repos.slice(0, 10);

        if (!this.allBranches) {
          // Default branch only
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
          return;
        }

        // All branches: fetch branches first, then commits per branch, deduplicate by SHA
        const branchCalls = targets.map(r =>
          this.git.managerListBranches(r.owner!.login, r.name).pipe(catchError(() => of([])))
        );

        forkJoin(branchCalls).subscribe({
          next: allBranchLists => {
            const pairs: { ri: number; branch: string }[] = [];
            (allBranchLists as ManagerBranch[][]).forEach((branches, ri) => {
              (branches ?? []).slice(0, 5).forEach(b => pairs.push({ ri, branch: b.name }));
            });

            if (pairs.length === 0) {
              const snap = this.buildSnapshot(targets, targets.map(() => []), repos.length);
              this.snapshot.set(snap);
              this.loading.set(false);
              setTimeout(() => this.drawCharts(snap), 50);
              return;
            }

            const commitCalls = pairs.map(p =>
              this.git.managerCommits(
                targets[p.ri].owner!.login, targets[p.ri].name, p.branch, 100
              ).pipe(catchError(() => of([])))
            );

            forkJoin(commitCalls).subscribe({
              next: allBranchCommits => {
                const byRepo: any[][] = targets.map(() => []);
                const seen: Set<string>[] = targets.map(() => new Set<string>());
                (allBranchCommits as any[][]).forEach((commits, idx) => {
                  const ri = pairs[idx].ri;
                  (commits ?? []).forEach((c: any) => {
                    if (c.sha && !seen[ri].has(c.sha)) {
                      seen[ri].add(c.sha);
                      byRepo[ri].push(c);
                    }
                  });
                });
                const snap = this.buildSnapshot(targets, byRepo, repos.length);
                this.snapshot.set(snap);
                this.loading.set(false);
                setTimeout(() => this.drawCharts(snap), 50);
              },
              error: () => this.loading.set(false),
            });
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

  // ── Branch explorer ──────────────────────────────────────────────────────

  onBranchRepoChange(fullName: string): void {
    this.repoBranchList.set([]);
    this.branchExploreSelected = '';
    this.branchExploreCmits.set([]);
    if (!fullName) return;
    const [owner, name] = fullName.split('/');
    this.loadingBranchList.set(true);
    this.git.managerListBranches(owner, name).subscribe({
      next:  bs => { this.repoBranchList.set(bs ?? []); this.loadingBranchList.set(false); },
      error: () => this.loadingBranchList.set(false),
    });
  }

  onBranchExploreSelect(branch: string): void {
    if (!this.branchExploreRepo) return;
    const [owner, name] = this.branchExploreRepo.split('/');
    this.branchExploreSelected = branch;
    this.loadingBranchCmits.set(true);
    this.branchExploreCmits.set([]);
    this.git.managerCommits(owner, name, branch, 30).subscribe({
      next:  cs => { this.branchExploreCmits.set(cs ?? []); this.loadingBranchCmits.set(false); },
      error: () => this.loadingBranchCmits.set(false),
    });
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }

  firstLine(msg: string): string {
    if (!msg) return '';
    return msg.split('\n')[0];
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
