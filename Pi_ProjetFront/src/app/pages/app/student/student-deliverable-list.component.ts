import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatBadgeModule } from '@angular/material/badge';

import { StudentDeliverable, StudentDeliverableService } from '../../../services/student-deliverable.service';
import { StudentSubmitDialogComponent } from './student-submit-dialog.component';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-student-deliverable-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatDialogModule, MatTooltipModule,
    MatExpansionModule, MatDividerModule, MatSelectModule,
    MatFormFieldModule, MatBadgeModule,
  ],
  template: `
    <div class="page">

      <!-- ── Header ──────────────────────────────────────────────────── -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-icon"><mat-icon>school</mat-icon></div>
          <div>
            <h1>Mes Livrables</h1>
            <p class="subtitle">{{ filteredRoots().length }} livrable(s) · {{ totalVersionCount() }} version(s)</p>
          </div>
        </div>
        <button mat-raised-button color="primary" (click)="openSubmit()">
          <mat-icon>add</mat-icon> Soumettre un livrable
        </button>
      </header>

      <!-- ── Project filter ──────────────────────────────────────────── -->
      @if (projectOptions().length > 1) {
        <div class="filter-bar">
          <mat-icon class="filter-icon">filter_list</mat-icon>
          <div class="filter-pills">
            <button class="pill" [class.active]="selectedProject() === null"
                    (click)="selectedProject.set(null)">
              <mat-icon>grid_view</mat-icon> Tous les projets
              <span class="pill-count">{{ roots().length }}</span>
            </button>
            @for (p of projectOptions(); track p) {
              <button class="pill" [class.active]="selectedProject() === p"
                      (click)="selectedProject.set(p)">
                <mat-icon>folder</mat-icon> {{ p }}
                <span class="pill-count">{{ countForProject(p) }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- ── Loading ─────────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="center">
          <mat-progress-spinner diameter="40" mode="indeterminate"/>
          <span style="margin-top:12px;color:#64748b">Chargement des livrables…</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-stroked-button (click)="load()">Réessayer</button>
        </div>
      } @else if (filteredRoots().length === 0) {
        <div class="empty-state">
          <mat-icon>inbox</mat-icon>
          <p>{{ selectedProject() ? 'Aucun livrable pour ce projet.' : 'Vous n\'avez encore soumis aucun livrable.' }}</p>
          @if (!selectedProject()) {
            <button mat-stroked-button color="primary" (click)="openSubmit()">
              Soumettre votre premier livrable
            </button>
          }
        </div>
      } @else {

        <!-- ── Deliverable cards ───────────────────────────────────────── -->
        <div class="grid">
          @for (d of filteredRoots(); track d.id) {
            <mat-card class="d-card"
                      [class.accepted]="d.tutorDecision === 'ACCEPTED'"
                      [class.rejected]="d.tutorDecision === 'REJECTED'">

              <!-- Top row: status + version badge -->
              <div class="card-top">
                <span [class]="'status-chip ' + statusClass(d.status)">
                  <mat-icon class="chip-icon">{{ statusIcon(d.status) }}</mat-icon>
                  {{ statusLabel(d.status) }}
                </span>
                <span class="version-badge">v{{ d.versionNumber ?? 1 }}</span>
              </div>

              <!-- Project tag -->
              @if (d.projectName) {
                <div class="project-tag">
                  <mat-icon>folder_open</mat-icon>
                  {{ d.projectName }}
                </div>
              }

              <!-- Title -->
              <h2 class="card-title">{{ d.title }}</h2>

              <!-- Description -->
              @if (d.description) {
                <p class="description">{{ d.description }}</p>
              }

              <!-- Meta -->
              <div class="meta-row">
                <span class="meta-item">
                  <mat-icon class="icon-sm">school</mat-icon>
                  {{ d.tutorName ?? '—' }}
                </span>
                <span class="meta-item">
                  <mat-icon class="icon-sm">schedule</mat-icon>
                  {{ d.submittedAt | date:'dd/MM/yyyy' }}
                </span>
                @if (d.fileSizeKb) {
                  <span class="meta-item">
                    <mat-icon class="icon-sm">description</mat-icon>
                    {{ d.fileType ?? 'Fichier' }} · {{ d.fileSizeKb | number:'1.0-0' }} KB
                  </span>
                }
                <span [class]="'scan-badge scan-' + (d.virusScanStatus ?? 'pending')"
                      [matTooltip]="d.virusName ? 'Menace : ' + d.virusName : scanLabel(d.virusScanStatus)">
                  <mat-icon class="icon-sm">{{ scanIcon(d.virusScanStatus) }}</mat-icon>
                  {{ scanLabel(d.virusScanStatus) }}
                </span>
              </div>

              <!-- Score -->
              @if (d.score !== null && d.score !== undefined) {
                <div class="score-row">
                  <mat-icon>grade</mat-icon>
                  <span>Score : <strong>{{ d.score }}/100</strong></span>
                </div>
              }

              <!-- Tutor decision banner -->
              @if (d.tutorDecision) {
                <div [class]="'decision-banner ' + (d.tutorDecision === 'ACCEPTED' ? 'decision-accepted' : 'decision-rejected')">
                  <mat-icon>{{ d.tutorDecision === 'ACCEPTED' ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ d.tutorDecision === 'ACCEPTED' ? 'Accepté par le tuteur' : 'Rejeté par le tuteur' }}
                </div>
              }

              <!-- Tutor feedback -->
              @if (d.tutorFeedback) {
                <div class="feedback-box">
                  <mat-icon class="icon-sm">rate_review</mat-icon>
                  <p>{{ d.tutorFeedback }}</p>
                </div>
              }

              <!-- Versions panel -->
              @if ((versionsMap()[d.id] ?? []).length > 0) {
                <mat-expansion-panel class="versions-panel" hideToggle>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon class="icon-sm">history</mat-icon>
                      {{ versionsMap()[d.id].length }} version(s) suivante(s)
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  @for (v of versionsMap()[d.id]; track v.id) {
                    <div class="version-row">
                      <span class="version-badge-sm">v{{ v.versionNumber }}</span>
                      <span class="version-date">{{ v.submittedAt | date:'dd/MM/yy' }}</span>
                      <span [class]="'status-chip-sm ' + statusClass(v.status)">{{ statusLabel(v.status) }}</span>
                      @if (v.score !== null && v.score !== undefined) {
                        <span class="version-score">{{ v.score }}/100</span>
                      }
                      <span [class]="'scan-badge scan-' + (v.virusScanStatus ?? 'pending')"
                            [matTooltip]="v.virusName ? 'Menace : ' + v.virusName : scanLabel(v.virusScanStatus)">
                        <mat-icon class="icon-sm">{{ scanIcon(v.virusScanStatus) }}</mat-icon>
                      </span>
                      <!-- Download version -->
                      @if (v.fileUrl) {
                        <a [href]="downloadUrl(v.fileUrl)" target="_blank" download
                           class="dl-link" matTooltip="Télécharger v{{ v.versionNumber }}"
                           (click)="$event.stopPropagation()">
                          <mat-icon class="icon-sm">download</mat-icon>
                        </a>
                      }
                    </div>
                  }
                </mat-expansion-panel>
              }

              <!-- Actions -->
              <div class="card-actions">
                @if (d.fileUrl) {
                  <a mat-stroked-button [href]="downloadUrl(d.fileUrl)" target="_blank" download>
                    <mat-icon>download</mat-icon>
                    Télécharger v{{ d.versionNumber ?? 1 }}
                  </a>
                }
                <button mat-stroked-button color="accent" (click)="openAddVersion(d)"
                        matTooltip="Soumettre une nouvelle version">
                  <mat-icon>add_circle_outline</mat-icon>
                  Nouvelle version
                </button>
              </div>

            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────────────────── */
    .page { padding: 28px; max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg,#667eea,#764ba2);
      display: flex; align-items: center; justify-content: center;
    }
    .header-icon mat-icon { color: #fff; font-size: 26px; width: 26px; height: 26px; }
    h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1e293b; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }

    /* ── Filter bar ──────────────────────────────────────────────────── */
    .filter-bar {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .filter-icon { color: #94a3b8; }
    .filter-pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: flex; align-items: center; gap: 6px;
      border: 1.5px solid #e2e8f0; border-radius: 20px;
      padding: 6px 14px; font-size: 13px; cursor: pointer;
      background: #fff; color: #475569; transition: all .18s;
    }
    .pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .pill:hover { border-color: #667eea; color: #667eea; background: #f0f0ff; }
    .pill.active { background: #667eea; color: #fff; border-color: #667eea; }
    .pill-count {
      background: rgba(255,255,255,.25); border-radius: 10px;
      padding: 1px 7px; font-size: 11px; font-weight: 700;
    }
    .pill:not(.active) .pill-count { background: #f1f5f9; color: #64748b; }

    /* ── Grid ────────────────────────────────────────────────────────── */
    .grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(370px,1fr)); gap: 20px; }

    /* ── Card ────────────────────────────────────────────────────────── */
    .d-card {
      border-radius: 14px; padding: 20px; display: flex;
      flex-direction: column; gap: 10px;
      transition: box-shadow .2s; border: 1.5px solid #e2e8f0;
    }
    .d-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.09); }
    .d-card.accepted { border-left: 4px solid #16a34a; }
    .d-card.rejected { border-left: 4px solid #dc2626; }

    .card-top { display: flex; align-items: center; justify-content: space-between; }

    .project-tag {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; color: #6366f1; font-weight: 600;
    }
    .project-tag mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .card-title { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
    .description { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }

    /* ── Status chips ────────────────────────────────────────────────── */
    .status-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 600; white-space: nowrap;
    }
    .chip-icon { font-size: 14px; width: 14px; height: 14px; }
    .chip-submitted  { background: #dbeafe; color: #1e40af; }
    .chip-review     { background: #fef3c7; color: #92400e; }
    .chip-accepted   { background: #d1fae5; color: #065f46; }
    .chip-rejected   { background: #fee2e2; color: #991b1b; }

    .status-chip-sm {
      padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
    }

    /* ── Version badge ───────────────────────────────────────────────── */
    .version-badge {
      background: #e0e7ff; color: #3730a3;
      border-radius: 8px; padding: 2px 9px; font-size: 12px; font-weight: 700;
    }
    .version-badge-sm {
      background: #e0e7ff; color: #3730a3;
      border-radius: 6px; padding: 1px 6px; font-size: 10px; font-weight: 700;
    }

    /* ── Meta ────────────────────────────────────────────────────────── */
    .meta-row {
      display: flex; flex-wrap: wrap; gap: 10px;
      font-size: 12px; color: #64748b; align-items: center;
    }
    .meta-item { display: flex; align-items: center; gap: 4px; }
    .icon-sm { font-size: 14px; height: 14px; width: 14px; vertical-align: middle; }

    /* ── Scan badge ──────────────────────────────────────────────────── */
    .scan-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
    }
    .scan-clean      { background: #d1fae5; color: #065f46; }
    .scan-unverified { background: #fef3c7; color: #92400e; }
    .scan-infected   { background: #fee2e2; color: #991b1b; }
    .scan-pending    { background: #e2e8f0; color: #475569; }

    /* ── Score ───────────────────────────────────────────────────────── */
    .score-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: #1e40af;
    }
    .score-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }

    /* ── Decision banner ─────────────────────────────────────────────── */
    .decision-banner {
      display: flex; align-items: center; gap: 8px;
      border-radius: 8px; padding: 8px 12px; font-weight: 600; font-size: 13px;
    }
    .decision-accepted { background: #f0fdf4; color: #16a34a; }
    .decision-rejected { background: #fef2f2; color: #dc2626; }

    /* ── Feedback ────────────────────────────────────────────────────── */
    .feedback-box {
      display: flex; gap: 8px; align-items: flex-start;
      background: #f8fafc; border-left: 3px solid #cbd5e1;
      border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #475569;
    }
    .feedback-box p { margin: 0; }

    /* ── Versions panel ──────────────────────────────────────────────── */
    .versions-panel {
      border-radius: 10px !important; box-shadow: none !important;
      background: #f8fafc !important; border: 1px solid #e2e8f0 !important;
    }
    .version-row {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 0; font-size: 12px; flex-wrap: wrap;
      border-bottom: 1px solid #f1f5f9;
    }
    .version-row:last-child { border-bottom: none; }
    .version-date { color: #64748b; }
    .version-score { font-weight: 700; color: #1e40af; font-size: 12px; }

    .dl-link {
      display: inline-flex; align-items: center;
      color: #6366f1; margin-left: auto; cursor: pointer;
      transition: color .15s;
    }
    .dl-link:hover { color: #4338ca; }

    /* ── Card actions ────────────────────────────────────────────────── */
    .card-actions {
      display: flex; gap: 10px; flex-wrap: wrap;
      padding-top: 6px; margin-top: auto;
      border-top: 1px solid #f1f5f9;
    }

    /* ── States ──────────────────────────────────────────────────────── */
    .center {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 64px 16px; color: #64748b;
    }
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; padding: 64px 16px; gap: 14px; color: #94a3b8;
    }
    .empty-state mat-icon { font-size: 60px; width: 60px; height: 60px; }
    .error-state {
      display: flex; flex-direction: column;
      align-items: center; padding: 48px 16px; gap: 10px; color: #dc2626;
    }
    .error-state mat-icon { font-size: 42px; width: 42px; height: 42px; }
  `],
})
export class StudentDeliverableListComponent implements OnInit {

  private readonly svc    = inject(StudentDeliverableService);
  private readonly auth   = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  items       = signal<StudentDeliverable[]>([]);
  versionsMap = signal<Record<number, StudentDeliverable[]>>({});
  loading     = signal(true);
  error       = signal<string | null>(null);

  selectedProject = signal<string | null>(null);

  /** Only root deliverables (no parent) */
  roots = computed(() => this.items().filter(d => d.parentId === null));

  /** Unique project names */
  projectOptions = computed(() => {
    const names = new Set<string>();
    this.roots().forEach(d => { if (d.projectName) names.add(d.projectName); });
    return Array.from(names).sort();
  });

  filteredRoots = computed(() => {
    const p = this.selectedProject();
    return p ? this.roots().filter(d => d.projectName === p) : this.roots();
  });

  totalVersionCount = computed(() =>
    Object.values(this.versionsMap()).reduce((acc, v) => acc + v.length, 0)
  );

  countForProject(name: string): number {
    return this.roots().filter(d => d.projectName === name).length;
  }

  ngOnInit() { this.load(); }

  load() {
    const user = this.auth.currentUser();
    if (!user?.id) { this.error.set('Utilisateur introuvable'); this.loading.set(false); return; }
    this.loading.set(true);
    this.svc.getByStudent(user.id).subscribe({
      next: data => {
        this.items.set(data);
        this.loading.set(false);
        data.filter(d => d.parentId === null).forEach(d => this.loadVersions(d.id));
      },
      error: () => { this.error.set('Erreur lors du chargement des livrables'); this.loading.set(false); },
    });
  }

  private loadVersions(parentId: number) {
    this.svc.getVersions(parentId).subscribe({
      next: versions => {
        if (versions.length > 0)
          this.versionsMap.update(m => ({ ...m, [parentId]: versions }));
      },
      error: () => {},
    });
  }

  openSubmit() {
    const ref = this.dialog.open(StudentSubmitDialogComponent, {
      width: '560px', maxWidth: '95vw',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openAddVersion(d: StudentDeliverable) {
    const ref = this.dialog.open(StudentSubmitDialogComponent, {
      width: '560px', maxWidth: '95vw',
      data: {
        mode: 'add-version',
        parentId: d.id,
        parentTitle: d.title,
        parentVersion: d.versionNumber ?? 1,
      },
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  downloadUrl(fileUrl: string | null): string {
    if (!fileUrl) return '#';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://localhost:8084${fileUrl}`;
  }

  statusClass(status: string) {
    return ({ SUBMITTED: 'chip-submitted', UNDER_REVIEW: 'chip-review',
              ACCEPTED: 'chip-accepted', REJECTED: 'chip-rejected' } as Record<string, string>)[status] ?? 'chip-submitted';
  }

  statusLabel(status: string): string {
    return ({ SUBMITTED: 'Soumis', UNDER_REVIEW: 'En révision',
              ACCEPTED: 'Accepté', REJECTED: 'Rejeté' } as Record<string, string>)[status] ?? status;
  }

  statusIcon(status: string): string {
    return ({ SUBMITTED: 'send', UNDER_REVIEW: 'hourglass_empty',
              ACCEPTED: 'check_circle', REJECTED: 'cancel' } as Record<string, string>)[status] ?? 'help';
  }

  scanIcon(status: string | null): string {
    return ({ clean: 'verified_user', unverified: 'help_outline',
              infected: 'gpp_bad', pending: 'hourglass_empty' } as Record<string, string>)[status ?? 'pending'] ?? 'hourglass_empty';
  }

  scanLabel(status: string | null): string {
    return ({ clean: 'Sain', unverified: 'Non vérifié',
              infected: 'Infecté', pending: 'En attente' } as Record<string, string>)[status ?? 'pending'] ?? 'En attente';
  }
}
