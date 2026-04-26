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
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../../auth/auth.service';
import {
  GitBranches, GitCommit, GitRepoLink, GitService, GitStatus,
  GithubRepo, GithubTokenStatus, ManagerBranch,
} from '../../../services/git.service';
import { Project, ProjectService } from '../../../services/project-service';

@Component({
  selector: 'app-git-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatCheckboxModule, MatDividerModule, MatExpansionModule,
    MatTabsModule, MatBadgeModule,
  ],
  template: `
<div class="gw-page">

  <!-- ══ HERO ══════════════════════════════════════════════════════════════ -->
  <div class="gw-hero">
    <div class="gw-hero-left">
      <div class="gw-hero-icon"><mat-icon>account_tree</mat-icon></div>
      <div>
        <h1 class="gw-hero-title">Git Workspace</h1>
        <p class="gw-hero-sub" *ngIf="!isManager()">Connect your GitHub account, link a repo and ship code.</p>
        <p class="gw-hero-sub" *ngIf="isManager()">Visualisez tous vos repositories, branches, commits et statistiques.</p>
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

  <!-- ══ TOKEN FORM ════════════════════════════════════════════════════════ -->
  <mat-card *ngIf="tokenStatus() && !tokenStatus()!.configured" class="gw-card token-card">
    <mat-card-header>
      <mat-card-title><mat-icon>vpn_key</mat-icon> Connecter votre compte GitHub</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <p class="muted">
        Collez un <strong>Personal Access Token</strong> avec le scope <code>repo</code>.
        <a href="https://github.com/settings/tokens/new" target="_blank">Générer →</a>
      </p>
      <div class="token-row">
        <mat-form-field appearance="outline" class="grow">
          <mat-label>GitHub PAT</mat-label>
          <input matInput type="password" [(ngModel)]="tokenInput" placeholder="ghp_..." autocomplete="off" />
        </mat-form-field>
        <button mat-flat-button color="primary" class="tall-btn"
                (click)="onSaveToken()" [disabled]="busy() || !tokenInput.trim()">
          <mat-icon>lock</mat-icon> Connecter
        </button>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- ══════════════════════════════════════════════════════════════════════
       VUE MANAGER — GitHub API uniquement, pas de clone local
  ══════════════════════════════════════════════════════════════════════════ -->
  <ng-container *ngIf="isManager() && tokenStatus()?.configured">

    <!-- Stats KPI -->
    <div class="mgr-kpis">
      <mat-card class="kpi-card">
        <mat-card-content>
          <div class="kpi-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
            <mat-icon>folder</mat-icon>
          </div>
          <div class="kpi-val">{{ mgrRepos().length }}</div>
          <div class="kpi-label">Repositories</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="kpi-card">
        <mat-card-content>
          <div class="kpi-icon" style="background:linear-gradient(135deg,#10b981,#059669)">
            <mat-icon>call_split</mat-icon>
          </div>
          <div class="kpi-val">{{ mgrBranches().length }}</div>
          <div class="kpi-label">Branches</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="kpi-card">
        <mat-card-content>
          <div class="kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
            <mat-icon>commit</mat-icon>
          </div>
          <div class="kpi-val">{{ mgrCommits().length }}</div>
          <div class="kpi-label">Commits récents</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="kpi-card">
        <mat-card-content>
          <div class="kpi-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)">
            <mat-icon>people</mat-icon>
          </div>
          <div class="kpi-val">{{ mgrContributors().length }}</div>
          <div class="kpi-label">Contributeurs</div>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="mgr-grid">

      <!-- ── Panel gauche : repo + branche ──────────────────────────────── -->
      <div class="mgr-left">

        <!-- Repo list -->
        <mat-card class="gw-card">
          <mat-card-header>
            <mat-card-title><mat-icon>folder_open</mat-icon> Repositories</mat-card-title>
            <span class="grow"></span>
            <button mat-icon-button (click)="mgrLoadRepos()" matTooltip="Actualiser" [disabled]="mgrLoadingRepos()">
              <mat-icon>sync</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full" style="margin-bottom:4px">
              <mat-label>Rechercher</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="mgrRepoSearch" placeholder="nom du repo…" />
            </mat-form-field>

            <div *ngIf="mgrLoadingRepos()" class="empty"><mat-spinner diameter="28"></mat-spinner></div>

            <div class="repo-list" *ngIf="!mgrLoadingRepos()">
              <div *ngFor="let r of filteredRepos()"
                   class="repo-item"
                   [class.active]="mgrSelectedRepo?.full_name === r.full_name"
                   (click)="mgrSelectRepo(r)">
                <div class="repo-item-top">
                  <mat-icon class="repo-icon" [style.color]="r.private ? '#f59e0b' : '#10b981'">
                    {{ r.private ? 'lock' : 'folder' }}
                  </mat-icon>
                  <span class="repo-name">{{ r.name }}</span>
                  <span *ngIf="r.private" class="badge-priv">private</span>
                </div>
                <div class="repo-meta">
                  <span *ngIf="r.language" class="lang-dot">
                    <span class="dot-color" [style.background]="langColor(r.language)"></span>
                    {{ r.language }}
                  </span>
                  <span class="repo-owner">{{ r.owner?.login }}</span>
                </div>
              </div>
              <div *ngIf="filteredRepos().length === 0" class="empty-state">
                <mat-icon>inbox</mat-icon> Aucun repo trouvé
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Branches -->
        <mat-card class="gw-card" *ngIf="mgrSelectedRepo">
          <mat-card-header>
            <mat-card-title><mat-icon>call_split</mat-icon> Branches</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="mgrLoadingBranches()" class="empty"><mat-spinner diameter="24"></mat-spinner></div>
            <div class="branch-list" *ngIf="!mgrLoadingBranches()">
              <div *ngFor="let b of mgrBranches()"
                   class="branch-item"
                   [class.active]="mgrSelectedBranch === b.name"
                   (click)="mgrSelectBranch(b.name)">
                <mat-icon class="branch-icon" [style.color]="b.protected ? '#6366f1' : '#64748b'">
                  {{ b.protected ? 'shield' : 'call_split' }}
                </mat-icon>
                <span>{{ b.name }}</span>
                <span *ngIf="b.protected" class="badge-prot">protégée</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

      </div>

      <!-- ── Panel droit : commits + stats ──────────────────────────────── -->
      <div class="mgr-right">

        <!-- Placeholder si rien sélectionné -->
        <mat-card class="gw-card empty-card" *ngIf="!mgrSelectedRepo">
          <mat-card-content class="empty-state" style="padding:60px 24px">
            <mat-icon class="big-icon">account_tree</mat-icon>
            <h3>Sélectionnez un repository</h3>
            <p>Choisissez un repo dans la liste pour voir les branches, commits et statistiques.</p>
          </mat-card-content>
        </mat-card>

        <ng-container *ngIf="mgrSelectedRepo">

          <!-- Repo header -->
          <div class="repo-header-bar">
            <div class="repo-header-info">
              <mat-icon>folder_open</mat-icon>
              <strong>{{ mgrSelectedRepo!.full_name }}</strong>
              <span *ngIf="mgrSelectedBranch" class="branch-pill">
                <mat-icon>call_split</mat-icon> {{ mgrSelectedBranch }}
              </span>
            </div>
            <a [href]="mgrSelectedRepo!.html_url" target="_blank" mat-stroked-button>
              <mat-icon>open_in_new</mat-icon> GitHub
            </a>
          </div>

          <!-- Tabs -->
          <mat-tab-group animationDuration="150ms">

            <!-- Tab Commits -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">commit</mat-icon>
                Commits
                <span class="tab-badge">{{ mgrCommits().length }}</span>
              </ng-template>

              <div *ngIf="mgrLoadingCommits()" class="empty" style="padding:32px">
                <mat-spinner diameter="32"></mat-spinner>
              </div>

              <div class="commits-list" *ngIf="!mgrLoadingCommits()">
                <div *ngIf="mgrCommits().length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>Sélectionnez une branche pour voir les commits.</p>
                </div>
                <div class="commit-row" *ngFor="let c of mgrCommits()">
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
            </mat-tab>

            <!-- Tab Stats -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">insights</mat-icon>
                Statistiques
              </ng-template>

              <div class="stats-section">

                <!-- Info repo -->
                <div class="stat-group">
                  <div class="stat-row">
                    <mat-icon>description</mat-icon>
                    <span class="stat-label">Description</span>
                    <span class="stat-val">{{ mgrSelectedRepo!.description || '—' }}</span>
                  </div>
                  <div class="stat-row">
                    <mat-icon>code</mat-icon>
                    <span class="stat-label">Langage principal</span>
                    <span class="stat-val">
                      <span *ngIf="mgrSelectedRepo!.language" class="dot-color" [style.background]="langColor(mgrSelectedRepo!.language!)"></span>
                      {{ mgrSelectedRepo!.language || '—' }}
                    </span>
                  </div>
                  <div class="stat-row">
                    <mat-icon>call_split</mat-icon>
                    <span class="stat-label">Branche par défaut</span>
                    <span class="stat-val">{{ mgrSelectedRepo!.default_branch }}</span>
                  </div>
                  <div class="stat-row">
                    <mat-icon>star</mat-icon>
                    <span class="stat-label">Stars</span>
                    <span class="stat-val">{{ mgrSelectedRepo!.stargazers_count ?? 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <mat-icon>fork_right</mat-icon>
                    <span class="stat-label">Forks</span>
                    <span class="stat-val">{{ mgrSelectedRepo!.forks_count ?? 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <mat-icon>schedule</mat-icon>
                    <span class="stat-label">Dernière mise à jour</span>
                    <span class="stat-val">{{ mgrSelectedRepo!.updated_at | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>

                <!-- Contributeurs -->
                <h4 class="stat-section-title">
                  <mat-icon>people</mat-icon> Contributeurs ({{ mgrContributors().length }})
                </h4>
                <div class="contributors-grid">
                  <div *ngFor="let c of mgrContributors()" class="contributor-card">
                    <div class="contrib-avatar">{{ initials(c.name) }}</div>
                    <div class="contrib-info">
                      <div class="contrib-name">{{ c.name }}</div>
                      <div class="contrib-count">{{ c.count }} commit{{ c.count > 1 ? 's' : '' }}</div>
                    </div>
                    <div class="contrib-bar-wrap">
                      <div class="contrib-bar"
                           [style.width.%]="mgrContributors()[0]?.count ? (c.count / mgrContributors()[0].count) * 100 : 0">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Activité par jour -->
                <h4 class="stat-section-title" *ngIf="activityDays().length > 0">
                  <mat-icon>bar_chart</mat-icon> Activité récente
                </h4>
                <div class="activity-chart" *ngIf="activityDays().length > 0">
                  <div *ngFor="let d of activityDays()" class="activity-bar-wrap" [matTooltip]="d.date + ': ' + d.count + ' commit(s)'">
                    <div class="activity-bar" [style.height.px]="barHeight(d.count)"></div>
                    <div class="activity-label">{{ d.label }}</div>
                  </div>
                </div>

              </div>
            </mat-tab>

          </mat-tab-group>
        </ng-container>

      </div>
    </div>

  </ng-container>

  <!-- ══════════════════════════════════════════════════════════════════════
       VUE DÉVELOPPEUR — JGit local
  ══════════════════════════════════════════════════════════════════════════ -->
  <ng-container *ngIf="!isManager() && tokenStatus()?.configured">

    <!-- Repo picker / link -->
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
          <div class="linked-repo-cards">
            <div *ngFor="let l of links()"
                 class="linked-repo-card"
                 [class.active]="l.id === activeLinkId()"
                 (click)="selectLink(l)">
              <div class="lrc-top">
                <mat-icon class="lrc-icon">account_tree</mat-icon>
                <span class="lrc-repo">{{ l.owner }}/{{ l.repoName }}</span>
              </div>
              <div class="lrc-project" *ngIf="getProjectName(l.projectId) as pname">
                <mat-icon class="lrc-proj-icon">folder_special</mat-icon>
                <span>{{ pname }}</span>
              </div>
            </div>
          </div>
        </div>
        <ng-template #noLinks>
          <div class="muted small">No linked repos yet.</div>
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
              <mat-label>Projet</mat-label>
              <mat-select [(ngModel)]="newLinkProjectId">
                <mat-option *ngFor="let p of projects()" [value]="+p.id">
                  <mat-icon style="font-size:14px;vertical-align:middle;margin-right:4px">folder_special</mat-icon>
                  {{ p.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="grow-2">
              <mat-label>Local path (optional)</mat-label>
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

    <!-- Workspace for active link -->
    <ng-container *ngIf="activeLinkId(); else pickRepo">
      <div class="gw-grid">
        <!-- Changes -->
        <mat-card class="gw-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>edit_note</mat-icon> Changes
              <span *ngIf="activeProjectName()" class="active-project-pill">
                <mat-icon>folder_special</mat-icon>{{ activeProjectName() }}
              </span>
            </mat-card-title>
            <span class="grow"></span>
            <mat-chip *ngIf="status()" class="branch-chip">
              <mat-icon>call_split</mat-icon> {{ status()!.branch }}
            </mat-chip>
            <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="!status() && !errorMsg()" class="empty"><mat-spinner diameter="28"></mat-spinner></div>
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
                <h4 *ngIf="s.added.length + s.changed.length + s.removed.length as n" class="section-title staged">Staged ({{ n }})</h4>
                <div *ngFor="let f of s.added"    class="file-row staged">  <mat-icon class="file-icon">add_circle</mat-icon>    <span>{{ f }}</span></div>
                <div *ngFor="let f of s.changed"  class="file-row staged">  <mat-icon class="file-icon">edit</mat-icon>           <span>{{ f }}</span></div>
                <div *ngFor="let f of s.removed"  class="file-row staged">  <mat-icon class="file-icon">remove_circle</mat-icon>  <span>{{ f }}</span></div>
                <h4 *ngIf="s.modified.length"  class="section-title modified">Modified ({{ s.modified.length }})</h4>
                <div *ngFor="let f of s.modified"  class="file-row modified"><mat-icon class="file-icon">edit</mat-icon>           <span>{{ f }}</span></div>
                <h4 *ngIf="s.untracked.length" class="section-title untracked">Untracked ({{ s.untracked.length }})</h4>
                <div *ngFor="let f of s.untracked" class="file-row untracked"><mat-icon class="file-icon">help_outline</mat-icon>  <span>{{ f }}</span></div>
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
              <button mat-flat-button color="primary" (click)="onCommit()" [disabled]="busy() || !commitMessage.trim()">
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
                <mat-chip *ngFor="let br of b.local" [highlighted]="br === b.current" class="repo-chip">{{ br }}</mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="gw-card">
        <mat-card-header>
          <mat-card-title><mat-icon>history</mat-icon> Recent commits</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="!commits().length" class="empty-state">
            <mat-icon class="big-icon">inbox</mat-icon><p>No commits yet.</p>
          </div>
          <div class="commits-list">
            <div class="commit-row" *ngFor="let c of commits()">
              <div class="commit-avatar">{{ initials(c.author) }}</div>
              <div class="commit-body">
                <div class="commit-msg">{{ c.message.split('\\n')[0] }}</div>
                <div class="commit-meta">
                  <span class="sha">{{ c.shortSha }}</span>
                  <span class="dot">·</span><span>{{ c.author }}</span>
                  <span class="dot">·</span><span>{{ c.date | date:'short' }}</span>
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
          <p>Pick a linked repo above to start committing.</p>
        </mat-card-content>
      </mat-card>
    </ng-template>

  </ng-container>
</div>
  `,
  styles: [`
    .gw-page { padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

    /* Hero */
    .gw-hero {
      display:flex; justify-content:space-between; align-items:center; gap:16px;
      padding:24px 28px; border-radius:16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color:#fff; box-shadow: 0 12px 32px -16px rgba(99,102,241,.55);
    }
    .gw-hero-left  { display:flex; align-items:center; gap:16px; }
    .gw-hero-icon  { width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; }
    .gw-hero-icon mat-icon { font-size:30px; width:30px; height:30px; }
    .gw-hero-title { margin:0; font-size:24px; font-weight:700; }
    .gw-hero-sub   { margin:4px 0 0; opacity:.85; font-size:14px; }
    .gw-hero-right { display:flex; align-items:center; gap:12px; }
    .gh-avatar { width:36px; height:36px; border-radius:50%; border:2px solid rgba(255,255,255,.6); }
    .gh-info   { display:flex; flex-direction:column; }
    .gh-login  { font-weight:600; }
    .gh-hint   { font-size:11px; opacity:.8; font-family: ui-monospace, monospace; }

    /* Cards */
    .gw-card { border-radius:14px !important; box-shadow: 0 4px 24px -12px rgba(15,23,42,.12) !important; }
    .gw-card mat-card-header mat-card-title { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; }
    .gw-card mat-card-header mat-card-title mat-icon { color:#6366f1; }
    .grow { flex:1; }

    /* Token */
    .token-card .muted { color:#64748b; font-size:14px; }
    .token-card .muted code { background:#f1f5f9; padding:1px 6px; border-radius:4px; font-family:ui-monospace,monospace; }
    .token-row { display:flex; gap:12px; align-items:flex-start; }
    .token-row .grow { flex:1; }
    .tall-btn { height:56px; }

    /* ── Manager KPIs ── */
    .mgr-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
    }
    .kpi-card { border-radius: 16px !important; }
    .kpi-card mat-card-content { display:flex; flex-direction:column; align-items:center; padding:20px 16px; gap:6px; }
    .kpi-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#fff; }
    .kpi-icon mat-icon { font-size:26px; width:26px; height:26px; }
    .kpi-val   { font-size:2rem; font-weight:800; color:#1e293b; line-height:1; }
    .kpi-label { font-size:.75rem; text-transform:uppercase; letter-spacing:.5px; color:#94a3b8; font-weight:600; }

    /* ── Manager grid ── */
    .mgr-grid { display:grid; grid-template-columns: 300px 1fr; gap:20px; }
    @media(max-width:900px) { .mgr-grid { grid-template-columns:1fr; } }
    .mgr-left  { display:flex; flex-direction:column; gap:16px; }
    .mgr-right { display:flex; flex-direction:column; gap:0; }

    /* Repo list */
    .repo-list { display:flex; flex-direction:column; gap:4px; max-height:360px; overflow-y:auto; }
    .repo-item { padding:10px 12px; border-radius:10px; cursor:pointer; transition:background .15s; }
    .repo-item:hover { background:#f1f5f9; }
    .repo-item.active { background:#eef2ff; border-left:3px solid #6366f1; }
    .repo-item-top { display:flex; align-items:center; gap:8px; }
    .repo-icon { font-size:18px; width:18px; height:18px; }
    .repo-name { font-weight:600; color:#1e293b; font-size:.88rem; flex:1; }
    .badge-priv { background:#fef9c3; color:#a16207; font-size:.68rem; padding:1px 7px; border-radius:99px; font-weight:600; }
    .repo-meta { display:flex; align-items:center; gap:10px; margin-top:3px; padding-left:26px; }
    .lang-dot  { display:flex; align-items:center; gap:4px; font-size:.75rem; color:#64748b; }
    .dot-color { width:10px; height:10px; border-radius:50%; display:inline-block; }
    .repo-owner { font-size:.72rem; color:#94a3b8; }

    /* Branch list */
    .branch-list { display:flex; flex-direction:column; gap:4px; max-height:240px; overflow-y:auto; }
    .branch-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px; cursor:pointer; transition:background .15s; font-size:.88rem; }
    .branch-item:hover { background:#f1f5f9; }
    .branch-item.active { background:#eef2ff; font-weight:600; color:#4338ca; }
    .branch-icon { font-size:16px; width:16px; height:16px; }
    .badge-prot { background:#ede9fe; color:#6d28d9; font-size:.68rem; padding:1px 7px; border-radius:99px; margin-left:auto; font-weight:600; }

    /* Repo header bar */
    .repo-header-bar {
      display:flex; align-items:center; justify-content:space-between;
      background:#f8fafc; border-radius:12px; padding:12px 16px;
      margin-bottom:16px; gap:12px; flex-wrap:wrap;
    }
    .repo-header-info { display:flex; align-items:center; gap:10px; font-size:.9rem; flex-wrap:wrap; }
    .branch-pill { display:flex; align-items:center; gap:4px; background:#eef2ff; color:#4338ca; padding:2px 10px; border-radius:99px; font-size:.8rem; }
    .branch-pill mat-icon { font-size:14px; width:14px; height:14px; }

    /* Tabs */
    .tab-icon  { font-size:18px; margin-right:6px; vertical-align:middle; }
    .tab-badge { background:#e0e7ff; color:#4338ca; border-radius:99px; padding:1px 7px; font-size:.72rem; margin-left:6px; font-weight:700; }

    /* Commits */
    .commits-list { display:flex; flex-direction:column; gap:4px; padding:8px 0; max-height:460px; overflow-y:auto; }
    .commit-row { display:flex; align-items:flex-start; gap:12px; padding:10px 12px; border-radius:10px; }
    .commit-row:hover { background:#f8fafc; }
    .commit-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:13px; flex-shrink:0; }
    .commit-body { flex:1; min-width:0; }
    .commit-msg  { font-weight:500; color:#0f172a; font-size:.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .commit-meta { font-size:.75rem; color:#64748b; display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:2px; }
    .sha  { font-family:ui-monospace,monospace; background:#f1f5f9; padding:1px 6px; border-radius:4px; }
    .dot  { opacity:.4; }

    /* Stats */
    .stats-section { padding:16px 8px; display:flex; flex-direction:column; gap:20px; }
    .stat-group { display:flex; flex-direction:column; gap:0; background:#f8fafc; border-radius:12px; overflow:hidden; }
    .stat-row { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:.88rem; }
    .stat-row:last-child { border-bottom:none; }
    .stat-row mat-icon { color:#6366f1; font-size:18px; width:18px; height:18px; }
    .stat-label { color:#64748b; width:160px; flex-shrink:0; }
    .stat-val { color:#1e293b; font-weight:500; display:flex; align-items:center; gap:6px; }
    .stat-section-title { display:flex; align-items:center; gap:8px; font-size:.85rem; text-transform:uppercase; letter-spacing:.5px; color:#64748b; font-weight:700; margin:0; }
    .stat-section-title mat-icon { font-size:18px; width:18px; height:18px; }

    /* Contributors */
    .contributors-grid { display:flex; flex-direction:column; gap:8px; }
    .contributor-card { display:flex; align-items:center; gap:12px; padding:8px 12px; background:#f8fafc; border-radius:10px; }
    .contrib-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
    .contrib-info { width:120px; flex-shrink:0; }
    .contrib-name  { font-weight:600; font-size:.82rem; color:#1e293b; }
    .contrib-count { font-size:.72rem; color:#64748b; }
    .contrib-bar-wrap { flex:1; height:6px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
    .contrib-bar { height:100%; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:99px; transition:width .4s; }

    /* Activity chart */
    .activity-chart { display:flex; align-items:flex-end; gap:4px; height:80px; padding:8px 0 0; }
    .activity-bar-wrap { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; }
    .activity-bar { width:100%; background:linear-gradient(180deg,#6366f1,#8b5cf6); border-radius:4px 4px 0 0; min-height:2px; transition:height .3s; }
    .activity-label { font-size:.62rem; color:#94a3b8; white-space:nowrap; }

    /* Dev workspace */
    .branch-chip { background:#eef2ff !important; color:#4338ca !important; }
    .gw-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    @media(max-width:960px) { .gw-grid { grid-template-columns:1fr; } }
    .repo-list-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; display:block; margin-bottom:10px; }
    .repo-chip { cursor:pointer; }

    /* Linked repo cards */
    .linked-repo-cards { display:flex; flex-wrap:wrap; gap:10px; }
    .linked-repo-card {
      display:flex; flex-direction:column; gap:5px;
      padding:10px 14px; border-radius:12px; cursor:pointer;
      border:1px solid #e2e8f0; background:#f8fafc;
      transition:all .15s; min-width:200px;
    }
    .linked-repo-card:hover { background:#eef2ff; border-color:#a5b4fc; }
    .linked-repo-card.active { background:#eef2ff; border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.2); }
    .lrc-top { display:flex; align-items:center; gap:6px; }
    .lrc-icon { font-size:16px; width:16px; height:16px; color:#6366f1; }
    .lrc-repo { font-weight:600; font-size:.85rem; color:#1e293b; }
    .lrc-project { display:flex; align-items:center; gap:5px; font-size:.76rem; color:#059669; font-weight:500; }
    .lrc-proj-icon { font-size:13px; width:13px; height:13px; }

    /* Active project pill in card title */
    .active-project-pill {
      display:inline-flex; align-items:center; gap:4px;
      background:#d1fae5; color:#059669;
      padding:2px 10px; border-radius:99px;
      font-size:.75rem; font-weight:600;
      margin-left:8px;
    }
    .active-project-pill mat-icon { font-size:13px; width:13px; height:13px; }
    .link-panel  { box-shadow:none !important; border:1px solid #e2e8f0; border-radius:10px !important; }
    .link-form   { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; padding-top:8px; }
    .link-form .grow   { flex:1 1 200px; }
    .link-form .grow-2 { flex:2 1 300px; }
    .section-title { margin:14px 0 6px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
    .section-title.staged   { color:#10b981; }
    .section-title.modified { color:#f59e0b; }
    .section-title.untracked{ color:#64748b; }
    .file-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:8px; font-family:ui-monospace,monospace; font-size:13px; }
    .file-row:hover { background:#f1f5f9; }
    .file-row .file-icon { font-size:18px; width:18px; height:18px; }
    .file-row.staged .file-icon   { color:#10b981; }
    .file-row.modified .file-icon { color:#f59e0b; }
    .file-row.untracked .file-icon{ color:#94a3b8; }
    .actions-row { display:flex; gap:10px; flex-wrap:wrap; }
    .push-btn { background:#10b981 !important; color:#fff !important; }
    .full  { width:100%; }
    .my-3  { margin:12px 0; }
    .empty { display:flex; justify-content:center; padding:24px; }
    .empty-state { text-align:center; padding:24px 8px; color:#64748b; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .empty-state.error { color:#dc2626; }
    .empty-card { background:#f8fafc; }
    .big-icon { font-size:48px; width:48px; height:48px; opacity:.6; }
    .small { font-size:12px; }
    .muted { color:#64748b; }
  `],
})
export class GitWorkspaceComponent implements OnInit {
  readonly git            = inject(GitService);
  private auth            = inject(AuthService);
  private snack           = inject(MatSnackBar);
  private projectService  = inject(ProjectService);

  // ── Shared ───────────────────────────────────────────────────────────────
  readonly tokenStatus = signal<GithubTokenStatus | null>(null);
  readonly busy        = signal(false);

  readonly isManager = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'MANAGER' || role === 'TUTOR';
  });

  // ── Manager state ────────────────────────────────────────────────────────
  readonly mgrRepos          = signal<GithubRepo[]>([]);
  readonly mgrBranches       = signal<ManagerBranch[]>([]);
  readonly mgrCommits        = signal<any[]>([]);
  readonly mgrLoadingRepos   = signal(false);
  readonly mgrLoadingBranches= signal(false);
  readonly mgrLoadingCommits = signal(false);

  mgrSelectedRepo:   GithubRepo | null = null;
  mgrSelectedBranch: string = '';
  mgrRepoSearch = '';

  readonly mgrContributors = computed(() => {
    const counts: Record<string, number> = {};
    for (const c of this.mgrCommits()) {
      const name = c.commit?.author?.name || c.author?.login || 'Unknown';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly activityDays = computed(() => {
    const map: Record<string, number> = {};
    for (const c of this.mgrCommits()) {
      const raw = c.commit?.author?.date;
      if (!raw) continue;
      const d = new Date(raw);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .slice(-14)
      .map(([date, count]) => ({ date, count, label: date }));
  });

  readonly filteredRepos = computed(() => {
    const q = this.mgrRepoSearch.toLowerCase();
    if (!q) return this.mgrRepos();
    return this.mgrRepos().filter(r =>
      r.name.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q)
    );
  });

  // ── Projects ─────────────────────────────────────────────────────────────
  readonly projects = signal<Project[]>([]);

  getProjectName(projectId: number | null): string {
    if (!projectId) return '';
    return this.projects().find(p => +p.id === projectId)?.name ?? `Projet #${projectId}`;
  }

  readonly activeProjectName = computed(() => {
    const id = this.activeLinkId();
    if (id == null) return '';
    const link = this.links().find(l => l.id === id);
    return link ? this.getProjectName(link.projectId) : '';
  });

  // ── Dev state ────────────────────────────────────────────────────────────
  readonly githubRepos = signal<GithubRepo[]>([]);
  readonly links       = signal<GitRepoLink[]>([]);
  readonly status      = signal<GitStatus | null>(null);
  readonly branches    = signal<GitBranches | null>(null);
  readonly commits     = signal<GitCommit[]>([]);
  readonly errorMsg    = signal<string | null>(null);
  readonly activeLinkId = computed(() => this.git.activeLinkId());

  tokenInput = '';
  commitMessage = '';
  newLinkRepo = '';
  newLinkProjectId: number | null = null;
  newLinkLocalPath = '';

  // ── Init ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({
      next: ps => this.projects.set(ps ?? []),
      error: () => {},
    });
    this.git.checkToken().subscribe({
      next: s => {
        this.tokenStatus.set(s);
        if (s.configured) {
          if (this.isManager()) {
            this.mgrLoadRepos();
          } else {
            this.loadLinks();
            this.loadGithubRepos();
            if (this.activeLinkId()) this.refresh();
          }
        }
      },
      error: e => this.toast(this.errMsg(e)),
    });
  }

  // ── Token ────────────────────────────────────────────────────────────────

  onSaveToken(): void {
    if (!this.tokenInput.trim()) return;
    this.busy.set(true);
    this.git.saveToken(this.tokenInput.trim()).subscribe({
      next: s => {
        this.tokenStatus.set(s);
        this.tokenInput = '';
        this.toast(`Connecté en tant que ${s.login}.`);
        if (this.isManager()) this.mgrLoadRepos();
        else { this.loadLinks(); this.loadGithubRepos(); }
      },
      error:    e => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onUnlinkToken(): void {
    if (!confirm('Déconnecter votre compte GitHub ?')) return;
    this.git.deleteToken().subscribe({
      next: () => {
        this.tokenStatus.set({ configured: false });
        this.toast('GitHub déconnecté.');
        this.git.setActiveLinkId(null);
      },
      error: e => this.toast(this.errMsg(e)),
    });
  }

  // ── Manager ──────────────────────────────────────────────────────────────

  mgrLoadRepos(): void {
    this.mgrLoadingRepos.set(true);
    this.git.managerListRepos().subscribe({
      next:  rs => { this.mgrRepos.set(rs ?? []); this.mgrLoadingRepos.set(false); },
      error: e  => { this.toast(this.errMsg(e)); this.mgrLoadingRepos.set(false); },
    });
  }

  mgrSelectRepo(repo: GithubRepo): void {
    this.mgrSelectedRepo   = repo;
    this.mgrSelectedBranch = '';
    this.mgrBranches.set([]);
    this.mgrCommits.set([]);

    this.mgrLoadingBranches.set(true);
    this.git.managerListBranches(repo.owner!.login, repo.name).subscribe({
      next: bs => {
        this.mgrBranches.set(bs ?? []);
        this.mgrLoadingBranches.set(false);
        // Auto-select default branch and load its commits
        const def = bs.find(b => b.name === repo.default_branch) ?? bs[0];
        if (def) this.mgrSelectBranch(def.name);
      },
      error: e => { this.toast(this.errMsg(e)); this.mgrLoadingBranches.set(false); },
    });
  }

  mgrSelectBranch(branch: string): void {
    this.mgrSelectedBranch = branch;
    if (!this.mgrSelectedRepo) return;

    this.mgrLoadingCommits.set(true);
    this.mgrCommits.set([]);
    this.git.managerCommits(
      this.mgrSelectedRepo.owner!.login,
      this.mgrSelectedRepo.name,
      branch,
      50
    ).subscribe({
      next:  cs => { this.mgrCommits.set(cs ?? []); this.mgrLoadingCommits.set(false); },
      error: e  => { this.toast(this.errMsg(e)); this.mgrLoadingCommits.set(false); },
    });
  }

  barHeight(count: number): number {
    const max = Math.max(...this.activityDays().map(d => d.count), 1);
    return Math.max(4, (count / max) * 60);
  }

  // ── Dev workspace ────────────────────────────────────────────────────────

  loadGithubRepos(): void {
    this.git.listMyRepos().subscribe({
      next: r => this.githubRepos.set(r ?? []),
      error: e => this.toast(this.errMsg(e)),
    });
  }

  loadLinks(): void {
    this.git.listLinks().subscribe({
      next: l => this.links.set(l ?? []),
      error: e => this.toast(this.errMsg(e)),
    });
  }

  selectLink(l: GitRepoLink): void {
    this.git.setActiveLinkId(l.id);
    this.refresh();
  }

  canLink(): boolean { return !!this.newLinkRepo && !!this.newLinkProjectId; }

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
      next: link => {
        this.toast(`Linked ${link.owner}/${link.repoName}.`);
        this.newLinkRepo = ''; this.newLinkProjectId = null; this.newLinkLocalPath = '';
        this.loadLinks();
        this.git.setActiveLinkId(link.id);
        this.refresh();
      },
      error:    e => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  refresh(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.errorMsg.set(null);
    this.status.set(null);
    this.git.status(id).subscribe({
      next:  s => this.status.set(s),
      error: e => this.errorMsg.set(this.errMsg(e)),
    });
    this.git.history(id, 15).subscribe({
      next:  c => this.commits.set(c),
      error: () => this.commits.set([]),
    });
    this.git.branches(id).subscribe({
      next:  b => this.branches.set(b),
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
      next: c => {
        this.toast(`Commit ${c.shortSha} créé.`);
        this.commitMessage = '';
        this.refresh();
      },
      error:    e => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onPush(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.busy.set(true);
    this.git.push(id).subscribe({
      next:     r => { this.toast(`Pushed: ${r.updates.join(', ') || 'OK'}`); this.refresh(); },
      error:    e => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  onPull(): void {
    const id = this.activeLinkId();
    if (id == null) return;
    this.busy.set(true);
    this.git.pull(id).subscribe({
      next:     () => { this.toast('Pulled from origin.'); this.refresh(); },
      error:    e  => this.toast(this.errMsg(e)),
      complete: () => this.busy.set(false),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }

  firstLine(msg: string): string {
    if (!msg) return '';
    return msg.split('\n')[0];
  }

  langColor(lang: string): string {
    const map: Record<string, string> = {
      TypeScript:'#3178c6', JavaScript:'#f1e05a', Java:'#b07219',
      Python:'#3572A5', CSS:'#563d7c', HTML:'#e34c26',
      'C#':'#178600', Go:'#00ADD8', Kotlin:'#A97BFF', PHP:'#4F5D95',
    };
    return map[lang] ?? '#94a3b8';
  }

  private errMsg(e: any): string {
    return e?.error?.message || e?.error?.detail || e?.message || 'Erreur inattendue';
  }

  private toast(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 4000 });
  }
}
