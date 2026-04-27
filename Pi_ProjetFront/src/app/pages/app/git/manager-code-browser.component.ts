import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';

import {
  GitService, GithubRepo,
  ManagerBranch, ManagerDirEntry, ManagerFileContent,
} from '../../../services/git.service';

interface BreadcrumbItem { name: string; path: string; }

@Component({
  selector: 'app-manager-code-browser',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule, MatChipsModule,
    MatSnackBarModule, MatDividerModule, MatInputModule, MatFormFieldModule,
    MatTabsModule, MatBadgeModule,
  ],
  template: `
<div class="mb-page">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div class="mb-header">
    <div class="mb-header-left">
      <div class="mb-header-icon"><mat-icon>manage_search</mat-icon></div>
      <div>
        <h1 class="mb-title">Code Browser</h1>
        <p class="mb-sub">Parcourez tous les repos et branches — lecture seule</p>
      </div>
    </div>
    <div class="mb-header-right">
      <mat-chip class="mb-ro-badge">
        <mat-icon>lock</mat-icon> Lecture seule
      </mat-chip>
    </div>
  </div>

  <!-- ── 3 Panneaux ─────────────────────────────────────────────────────── -->
  <div class="mb-layout">

    <!-- ════════ PANNEAU 1 : Repos ════════ -->
    <div class="mb-panel mb-repos-panel">
      <div class="mb-panel-header">
        <mat-icon>folder</mat-icon>
        <span>Repositories</span>
        <span class="mb-count">{{ repos().length }}</span>
        <button mat-icon-button (click)="loadRepos()" [disabled]="loadingRepos()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Search -->
      <div class="mb-search">
        <mat-form-field appearance="outline" class="mb-search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Filtrer les repos…" [(ngModel)]="repoFilter">
        </mat-form-field>
      </div>

      <div *ngIf="loadingRepos()" class="mb-center"><mat-spinner diameter="32"></mat-spinner></div>

      <div class="mb-repo-list" *ngIf="!loadingRepos()">
        <div *ngFor="let r of filteredRepos()"
             class="mb-repo-item"
             [class.active]="selectedRepo()?.id === r.id"
             (click)="selectRepo(r)">
          <div class="mb-repo-top">
            <mat-icon class="mb-repo-icon">{{ r.private ? 'lock' : 'folder_open' }}</mat-icon>
            <span class="mb-repo-name">{{ r.name }}</span>
            <span *ngIf="r.private" class="mb-private-tag">privé</span>
          </div>
          <div class="mb-repo-meta" *ngIf="r.language">
            <span class="mb-lang-dot" [style.background]="langColor(r.language!)"></span>
            {{ r.language }}
          </div>
          <div class="mb-repo-desc" *ngIf="r.description">{{ r.description }}</div>
        </div>

        <div *ngIf="filteredRepos().length === 0 && !loadingRepos()" class="mb-empty">
          <mat-icon>folder_off</mat-icon>
          <span>{{ repos().length === 0 ? 'Aucun repo trouvé' : 'Aucun résultat' }}</span>
        </div>
      </div>
    </div>

    <!-- ════════ PANNEAU 2 : Arborescence ════════ -->
    <div class="mb-panel mb-tree-panel">
      <div class="mb-panel-header">
        <mat-icon>account_tree</mat-icon>
        <span>{{ selectedRepo()?.name ?? 'Sélectionnez un repo' }}</span>
      </div>

      <!-- Branch selector -->
      <div class="mb-branch-bar" *ngIf="selectedRepo()">
        <div *ngIf="loadingBranches()" class="mb-inline-spin"><mat-spinner diameter="20"></mat-spinner></div>
        <mat-form-field appearance="outline" class="mb-branch-select" *ngIf="!loadingBranches()">
          <mat-icon matPrefix>call_split</mat-icon>
          <mat-select [(ngModel)]="selectedBranch" (ngModelChange)="onBranchChange($event)" placeholder="Branche">
            <mat-option *ngFor="let b of branches()" [value]="b.name">
              <div class="mb-branch-opt">
                <mat-icon *ngIf="b.protected" class="mb-lock-icon">lock</mat-icon>
                {{ b.name }}
              </div>
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Breadcrumb -->
      <div class="mb-breadcrumb" *ngIf="breadcrumb().length > 0">
        <span class="mb-crumb" (click)="navigateTo({name: selectedRepo()!.name, path: ''})">
          <mat-icon>home</mat-icon>
        </span>
        <ng-container *ngFor="let crumb of breadcrumb(); let last = last">
          <mat-icon class="mb-crumb-sep">chevron_right</mat-icon>
          <span class="mb-crumb" [class.active]="last" (click)="!last && navigateTo(crumb)">
            {{ crumb.name }}
          </span>
        </ng-container>
      </div>

      <!-- Loading tree -->
      <div *ngIf="loadingTree()" class="mb-center"><mat-spinner diameter="32"></mat-spinner></div>

      <!-- File tree -->
      <div class="mb-tree" *ngIf="!loadingTree() && selectedRepo()">
        <div *ngFor="let entry of treeEntries()"
             class="mb-entry"
             [class.selected]="selectedFile()?.path === entry.path"
             (click)="onEntryClick(entry)">
          <mat-icon class="mb-entry-icon" [class.dir]="entry.type==='dir'">
            {{ entry.type === 'dir' ? 'folder' : fileIcon(entry.name) }}
          </mat-icon>
          <span class="mb-entry-name">{{ entry.name }}</span>
          <span *ngIf="entry.type === 'file'" class="mb-entry-size">{{ formatSize(entry.size) }}</span>
        </div>

        <div *ngIf="treeEntries().length === 0 && !loadingTree()" class="mb-empty">
          <mat-icon>folder_open</mat-icon> Dossier vide
        </div>
      </div>

      <!-- No repo selected -->
      <div *ngIf="!selectedRepo() && !loadingRepos()" class="mb-no-select">
        <mat-icon>arrow_back</mat-icon>
        <p>Sélectionnez un repository</p>
      </div>
    </div>

    <!-- ════════ PANNEAU 3 : Contenu fichier ════════ -->
    <div class="mb-panel mb-code-panel">
      <div class="mb-panel-header">
        <mat-icon>{{ selectedFile() ? fileIcon(selectedFile()!.name) : 'code' }}</mat-icon>
        <span class="mb-file-path">{{ selectedFile()?.path ?? 'Aucun fichier sélectionné' }}</span>
        <div class="mb-code-actions" *ngIf="selectedFile()">
          <a [href]="selectedFile()!.htmlUrl" target="_blank" mat-icon-button matTooltip="Ouvrir sur GitHub">
            <mat-icon>open_in_new</mat-icon>
          </a>
          <button mat-icon-button matTooltip="Copier" (click)="copyCode()">
            <mat-icon>content_copy</mat-icon>
          </button>
        </div>
      </div>

      <!-- File meta -->
      <div class="mb-file-meta" *ngIf="selectedFile()">
        <span><mat-icon>data_usage</mat-icon> {{ formatSize(selectedFile()!.size) }}</span>
        <span><mat-icon>tag</mat-icon> {{ selectedFile()!.sha.substring(0, 7) }}</span>
        <span class="mb-branch-tag"><mat-icon>call_split</mat-icon> {{ selectedBranch }}</span>
      </div>

      <div *ngIf="loadingFile()" class="mb-center"><mat-spinner diameter="32"></mat-spinner></div>

      <!-- Code viewer -->
      <div class="mb-code-wrap" *ngIf="selectedFile() && !loadingFile()">
        <div class="mb-code-inner">
          <div class="mb-line-numbers">
            <span *ngFor="let _ of codeLines(); let i = index">{{ i + 1 }}</span>
          </div>
          <pre class="mb-code"><code>{{ selectedFile()!.content }}</code></pre>
        </div>
      </div>

      <!-- No file selected -->
      <div *ngIf="!selectedFile() && !loadingFile()" class="mb-no-select">
        <mat-icon>insert_drive_file</mat-icon>
        <p>Cliquez sur un fichier pour voir son contenu</p>
        <p class="mb-hint">Navigation 100% via API GitHub — aucun clone local requis</p>
      </div>

      <!-- Tab: Commits -->
      <div class="mb-commits-tab" *ngIf="selectedRepo() && selectedBranch">
        <mat-divider></mat-divider>
        <div class="mb-commits-header" (click)="toggleCommits()">
          <mat-icon>history</mat-icon>
          <span>Commits récents — {{ selectedBranch }}</span>
          <mat-icon>{{ showCommits() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </div>
        <div class="mb-commits-list" *ngIf="showCommits()">
          <div *ngIf="loadingCommits()" class="mb-center"><mat-spinner diameter="24"></mat-spinner></div>
          <div *ngFor="let c of commits()" class="mb-commit">
            <div class="mb-commit-sha">{{ c.sha?.substring(0, 7) }}</div>
            <div class="mb-commit-info">
              <div class="mb-commit-msg">{{ c.commit?.message?.split('\\n')[0] }}</div>
              <div class="mb-commit-meta">
                {{ c.commit?.author?.name }} · {{ c.commit?.author?.date | date:'dd/MM/yy HH:mm' }}
              </div>
            </div>
          </div>
          <div *ngIf="commits().length === 0 && !loadingCommits()" class="mb-empty">
            Aucun commit
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────────────────────── */
    .mb-page { height: calc(100vh - 80px); display: flex; flex-direction: column; padding: 16px; gap: 12px; }
    .mb-layout { display: grid; grid-template-columns: 280px 300px 1fr; gap: 12px; flex: 1; min-height: 0; overflow: hidden; }

    /* ── Header ──────────────────────────────────────────────────────────── */
    .mb-header { display: flex; align-items: center; justify-content: space-between; }
    .mb-header-left { display: flex; align-items: center; gap: 12px; }
    .mb-header-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .mb-title { margin: 0; font-size: 1.4rem; font-weight: 700; color: #1e293b; }
    .mb-sub { margin: 0; font-size: .82rem; color: #64748b; }
    .mb-ro-badge { background: #fee2e2 !important; color: #b91c1c !important; font-size: .75rem; }
    .mb-ro-badge mat-icon { font-size: 14px; }

    /* ── Panels ──────────────────────────────────────────────────────────── */
    .mb-panel {
      background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08);
      display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0;
    }
    .mb-panel-header {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9; background: #f8fafc;
      font-weight: 600; color: #334155; font-size: .88rem; flex-shrink: 0;
    }
    .mb-panel-header mat-icon { font-size: 18px; color: #6366f1; }
    .mb-count {
      margin-left: auto; background: #e0e7ff; color: #4338ca;
      border-radius: 99px; padding: 1px 8px; font-size: .72rem; font-weight: 700;
    }

    /* ── Repo Panel ──────────────────────────────────────────────────────── */
    .mb-search { padding: 10px 12px; flex-shrink: 0; }
    .mb-search-field { width: 100%; }
    ::ng-deep .mb-search-field .mat-mdc-form-field-wrapper { padding: 0; }
    ::ng-deep .mb-search-field .mat-mdc-text-field-wrapper { border-radius: 10px !important; }
    .mb-repo-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
    .mb-repo-item {
      padding: 10px 12px; border-radius: 10px; cursor: pointer; margin-bottom: 4px;
      transition: background .15s;
    }
    .mb-repo-item:hover { background: #f1f5f9; }
    .mb-repo-item.active { background: #e0e7ff; border-left: 3px solid #6366f1; }
    .mb-repo-top { display: flex; align-items: center; gap: 6px; }
    .mb-repo-icon { font-size: 16px; color: #64748b; }
    .mb-repo-name { font-weight: 600; font-size: .88rem; color: #1e293b; flex: 1; truncate: true; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mb-private-tag { font-size: .65rem; background: #fef9c3; color: #a16207; padding: 1px 6px; border-radius: 99px; }
    .mb-repo-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: .75rem; color: #64748b; }
    .mb-lang-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .mb-repo-desc { font-size: .73rem; color: #94a3b8; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Tree Panel ──────────────────────────────────────────────────────── */
    .mb-branch-bar { padding: 8px 12px; flex-shrink: 0; }
    .mb-branch-select { width: 100%; }
    .mb-branch-opt { display: flex; align-items: center; gap: 6px; }
    .mb-lock-icon { font-size: 14px; color: #f59e0b; }
    .mb-inline-spin { padding: 8px; display: flex; align-items: center; }

    .mb-breadcrumb {
      display: flex; align-items: center; padding: 6px 14px; flex-wrap: wrap;
      background: #f8fafc; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
    }
    .mb-crumb { display: flex; align-items: center; gap: 2px; cursor: pointer; font-size: .78rem; color: #6366f1; }
    .mb-crumb:hover { text-decoration: underline; }
    .mb-crumb.active { color: #334155; cursor: default; text-decoration: none; font-weight: 600; }
    .mb-crumb mat-icon { font-size: 16px; }
    .mb-crumb-sep { font-size: 16px; color: #cbd5e1; }

    .mb-tree { flex: 1; overflow-y: auto; padding: 4px; }
    .mb-entry {
      display: flex; align-items: center; gap: 8px; padding: 7px 10px;
      border-radius: 8px; cursor: pointer; transition: background .12s;
    }
    .mb-entry:hover { background: #f1f5f9; }
    .mb-entry.selected { background: #dbeafe; }
    .mb-entry-icon { font-size: 18px; color: #94a3b8; }
    .mb-entry-icon.dir { color: #f59e0b; }
    .mb-entry-name { flex: 1; font-size: .85rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mb-entry-size { font-size: .7rem; color: #94a3b8; }

    /* ── Code Panel ──────────────────────────────────────────────────────── */
    .mb-code-panel { display: flex; flex-direction: column; }
    .mb-file-path { flex: 1; font-size: .82rem; font-family: monospace; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mb-code-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .mb-code-actions a { color: inherit; }

    .mb-file-meta {
      display: flex; gap: 16px; padding: 6px 14px; background: #f8fafc;
      border-bottom: 1px solid #f1f5f9; font-size: .75rem; color: #64748b; flex-shrink: 0;
    }
    .mb-file-meta span { display: flex; align-items: center; gap: 4px; }
    .mb-file-meta mat-icon { font-size: 14px; }
    .mb-branch-tag { color: #6366f1; font-weight: 600; }

    .mb-code-wrap { flex: 1; overflow: auto; background: #0f172a; min-height: 0; }
    .mb-code-inner { display: flex; min-height: 100%; }
    .mb-line-numbers {
      display: flex; flex-direction: column; padding: 16px 8px;
      background: #1e293b; min-width: 48px; text-align: right;
      color: #475569; font-family: 'Fira Code', monospace; font-size: .78rem;
      line-height: 1.6; user-select: none; flex-shrink: 0;
    }
    .mb-code {
      margin: 0; padding: 16px; color: #e2e8f0;
      font-family: 'Fira Code', 'Consolas', monospace; font-size: .82rem;
      line-height: 1.6; tab-size: 4; white-space: pre; flex: 1;
      background: transparent;
    }

    /* ── Commits section ─────────────────────────────────────────────────── */
    .mb-commits-tab { flex-shrink: 0; }
    .mb-commits-header {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      cursor: pointer; color: #64748b; font-size: .82rem; font-weight: 500;
      background: #f8fafc;
    }
    .mb-commits-header:hover { background: #f1f5f9; }
    .mb-commits-header mat-icon { font-size: 18px; }
    .mb-commits-header mat-icon:last-child { margin-left: auto; }
    .mb-commits-list { max-height: 200px; overflow-y: auto; }
    .mb-commit { display: flex; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #f1f5f9; }
    .mb-commit:hover { background: #f8fafc; }
    .mb-commit-sha { font-family: monospace; font-size: .75rem; color: #6366f1; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; height: fit-content; white-space: nowrap; }
    .mb-commit-msg { font-size: .82rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mb-commit-meta { font-size: .72rem; color: #94a3b8; margin-top: 2px; }

    /* ── Shared ──────────────────────────────────────────────────────────── */
    .mb-center { display: flex; justify-content: center; align-items: center; padding: 32px; }
    .mb-no-select { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: #94a3b8; gap: 8px; text-align: center; padding: 20px; }
    .mb-no-select mat-icon { font-size: 48px; opacity: .4; }
    .mb-no-select p { margin: 0; font-size: .9rem; }
    .mb-hint { font-size: .78rem !important; color: #cbd5e1 !important; }
    .mb-empty { display: flex; flex-direction: column; align-items: center; padding: 24px; color: #94a3b8; gap: 8px; }
    .mb-empty mat-icon { font-size: 32px; opacity: .4; }

    @media (max-width: 1024px) {
      .mb-layout { grid-template-columns: 240px 260px 1fr; }
    }
    @media (max-width: 768px) {
      .mb-layout { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .mb-page { height: auto; }
    }
  `],
})
export class ManagerCodeBrowserComponent implements OnInit {

  private git   = inject(GitService);
  private snack = inject(MatSnackBar);

  // ── State ──────────────────────────────────────────────────────────────────
  repos         = signal<GithubRepo[]>([]);
  selectedRepo  = signal<GithubRepo | null>(null);
  branches      = signal<ManagerBranch[]>([]);
  selectedBranch = '';
  treeEntries   = signal<ManagerDirEntry[]>([]);
  breadcrumb    = signal<BreadcrumbItem[]>([]);
  selectedFile  = signal<ManagerFileContent | null>(null);
  commits       = signal<any[]>([]);
  showCommits   = signal(false);
  repoFilter    = '';

  loadingRepos    = signal(false);
  loadingBranches = signal(false);
  loadingTree     = signal(false);
  loadingFile     = signal(false);
  loadingCommits  = signal(false);

  codeLines = computed(() =>
    this.selectedFile() ? this.selectedFile()!.content.split('\n') : [],
  );

  filteredRepos = computed(() => {
    const q = this.repoFilter.toLowerCase();
    return q
      ? this.repos().filter(r => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))
      : this.repos();
  });

  ngOnInit(): void { this.loadRepos(); }

  // ── Repos ──────────────────────────────────────────────────────────────────
  loadRepos(): void {
    this.loadingRepos.set(true);
    this.git.managerListRepos().subscribe({
      next: r => { this.repos.set(r); this.loadingRepos.set(false); },
      error: () => {
        this.snack.open('Impossible de charger les repos. Vérifiez votre token GitHub.', 'OK', { duration: 4000 });
        this.loadingRepos.set(false);
      },
    });
  }

  selectRepo(repo: GithubRepo): void {
    this.selectedRepo.set(repo);
    this.selectedBranch = '';
    this.treeEntries.set([]);
    this.breadcrumb.set([]);
    this.selectedFile.set(null);
    this.showCommits.set(false);
    this.loadBranches(repo);
  }

  // ── Branches ───────────────────────────────────────────────────────────────
  loadBranches(repo: GithubRepo): void {
    this.loadingBranches.set(true);
    this.git.managerListBranches(repo.owner!.login, repo.name).subscribe({
      next: b => {
        this.branches.set(b);
        this.loadingBranches.set(false);
        const def = b.find(br => br.name === repo.default_branch) ?? b[0];
        if (def) { this.selectedBranch = def.name; this.loadTree(''); }
      },
      error: () => { this.loadingBranches.set(false); },
    });
  }

  onBranchChange(branch: string): void {
    this.selectedBranch = branch;
    this.breadcrumb.set([]);
    this.selectedFile.set(null);
    this.loadTree('');
    if (this.showCommits()) this.loadCommits();
  }

  // ── Tree navigation ────────────────────────────────────────────────────────
  loadTree(path: string): void {
    const repo = this.selectedRepo();
    if (!repo || !this.selectedBranch) return;
    this.loadingTree.set(true);
    this.treeEntries.set([]);

    this.git.managerContents(repo.owner!.login, repo.name, path, this.selectedBranch).subscribe({
      next: result => {
        if (Array.isArray(result)) {
          this.treeEntries.set(result as ManagerDirEntry[]);
        }
        this.loadingTree.set(false);
      },
      error: () => { this.loadingTree.set(false); },
    });
  }

  onEntryClick(entry: ManagerDirEntry): void {
    if (entry.type === 'dir') {
      this.breadcrumb.update(b => [...b, { name: entry.name, path: entry.path }]);
      this.selectedFile.set(null);
      this.loadTree(entry.path);
    } else {
      this.loadFile(entry);
    }
  }

  navigateTo(crumb: BreadcrumbItem): void {
    const idx = this.breadcrumb().findIndex(b => b.path === crumb.path);
    if (crumb.path === '') {
      this.breadcrumb.set([]);
    } else {
      this.breadcrumb.update(b => b.slice(0, idx + 1));
    }
    this.selectedFile.set(null);
    this.loadTree(crumb.path);
  }

  // ── File content ───────────────────────────────────────────────────────────
  loadFile(entry: ManagerDirEntry): void {
    const repo = this.selectedRepo();
    if (!repo) return;
    this.loadingFile.set(true);
    this.selectedFile.set(null);

    this.git.managerContents(repo.owner!.login, repo.name, entry.path, this.selectedBranch).subscribe({
      next: result => {
        if (!Array.isArray(result)) {
          this.selectedFile.set(result as ManagerFileContent);
        }
        this.loadingFile.set(false);
      },
      error: () => {
        this.snack.open('Impossible de charger le fichier.', 'OK', { duration: 3000 });
        this.loadingFile.set(false);
      },
    });
  }

  copyCode(): void {
    if (this.selectedFile()) {
      navigator.clipboard.writeText(this.selectedFile()!.content);
      this.snack.open('Code copié !', '', { duration: 2000 });
    }
  }

  // ── Commits ────────────────────────────────────────────────────────────────
  toggleCommits(): void {
    this.showCommits.update(v => !v);
    if (this.showCommits() && this.commits().length === 0) this.loadCommits();
  }

  loadCommits(): void {
    const repo = this.selectedRepo();
    if (!repo || !this.selectedBranch) return;
    this.loadingCommits.set(true);
    this.git.managerCommits(repo.owner!.login, repo.name, this.selectedBranch, 20).subscribe({
      next: c => { this.commits.set(c); this.loadingCommits.set(false); },
      error: () => { this.loadingCommits.set(false); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      ts: 'code', js: 'javascript', java: 'coffee', py: 'code',
      html: 'html', css: 'css', scss: 'palette', json: 'data_object',
      md: 'article', xml: 'code', yml: 'settings', yaml: 'settings',
      txt: 'text_snippet', sql: 'storage', sh: 'terminal', dockerfile: 'inbox',
      png: 'image', jpg: 'image', svg: 'image', gif: 'image',
      pdf: 'picture_as_pdf', zip: 'folder_zip',
    };
    return map[ext] ?? 'insert_drive_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  langColor(lang: string): string {
    const colors: Record<string, string> = {
      TypeScript: '#3178c6', JavaScript: '#f1e05a', Java: '#b07219',
      Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
      Vue: '#41b883', 'C#': '#178600', Go: '#00ADD8', Rust: '#dea584',
    };
    return colors[lang] ?? '#94a3b8';
  }
}
