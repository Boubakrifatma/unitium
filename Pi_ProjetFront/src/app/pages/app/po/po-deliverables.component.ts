import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { DeliverableService } from '../../../services/Deliverable.service';
import { ReviewService } from '../../../services/review.service';
import { ProjectService, Project } from '../../../services/project-service';
import { PoReviewDialogComponent, PoReviewDialogData } from './po-review-dialog.component';

@Component({
  selector: 'app-po-deliverables',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatTooltipModule, MatDialogModule,
    MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="po-deliverables">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon"><mat-icon>verified</mat-icon></div>
          <div>
            <h1>Validation PO — Livrables</h1>
            <p class="subtitle">Livrables acceptés par le manager, en attente de votre décision</p>
          </div>
        </div>
        <div class="header-right">
          @if (deliverables().length > 0) {
            <div class="badge-pending">
              <mat-icon>pending_actions</mat-icon>
              {{ pendingCount() }} en attente
            </div>
          }
          <button mat-icon-button (click)="load()" [disabled]="!selectedProjectId() || loading()" matTooltip="Actualiser">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Project Selector -->
      <div class="selector-bar">
        <mat-form-field appearance="outline" class="project-select">
          <mat-label><mat-icon>folder_open</mat-icon> Sélectionner un projet</mat-label>
          <mat-select [ngModel]="selectedProjectId()" (ngModelChange)="onProjectChange($event)">
            @for (p of projects(); track p.id) {
              <mat-option [value]="p.id">{{ p.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="state-box">
          <mat-icon class="spin">sync</mat-icon>
          <p>Chargement...</p>
        </div>
      }

      <!-- Error -->
      @else if (error()) {
        <div class="state-box error">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-flat-button color="primary" (click)="load()">Réessayer</button>
        </div>
      }

      <!-- No project -->
      @else if (!selectedProjectId()) {
        <div class="state-box">
          <mat-icon>folder_open</mat-icon>
          <h3>Sélectionnez un projet</h3>
          <p>Choisissez un projet pour voir les livrables en attente de validation.</p>
        </div>
      }

      <!-- Empty -->
      @else if (pendingCount() === 0 && !loading()) {
        <div class="state-box success">
          <mat-icon>task_alt</mat-icon>
          <h3>Aucun livrable en attente</h3>
          <p>Tous les livrables de ce projet ont été traités.</p>
        </div>
      }

      <!-- Deliverables List -->
      @else {
        <div class="deliverables-grid">
          @for (d of deliverables(); track d.id) {
            @if (!reviewedIds().has(d.id)) {
              <div class="deliverable-card">

                <!-- Card Header -->
                <div class="card-header-row">
                  <div class="status-chip accepted-by-manager">
                    <mat-icon>how_to_reg</mat-icon>
                    Accepté par Manager
                  </div>
                  <span class="version-tag"><mat-icon>tag</mat-icon> v{{ d.currentVersion }}</span>
                </div>

                <!-- Title & Description -->
                <div class="card-body">
                  <h3 class="card-title">{{ d.title }}</h3>
                  <p class="card-desc">{{ d.description || 'Aucune description.' }}</p>

                  <div class="meta-grid">
                    <div class="meta-item">
                      <mat-icon>person</mat-icon>
                      <div><span class="meta-label">Soumis par</span><span class="meta-val">{{ d.submittedByName }}</span></div>
                    </div>
                    <div class="meta-item">
                      <mat-icon>assignment</mat-icon>
                      <div><span class="meta-label">Tâche</span><span class="meta-val">{{ d.taskTitle ?? 'N/A' }}</span></div>
                    </div>
                    <div class="meta-item">
                      <mat-icon>event</mat-icon>
                      <div><span class="meta-label">Soumis le</span><span class="meta-val">{{ deliverableService.formatDate(d.submittedAt) }}</span></div>
                    </div>
                    @if (d.fileSizeKb) {
                      <div class="meta-item">
                        <mat-icon>insert_drive_file</mat-icon>
                        <div><span class="meta-label">Taille</span><span class="meta-val">{{ deliverableService.formatFileSize(d.fileSizeKb) }}</span></div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Actions -->
                <div class="card-actions">
                  @if (d.fileUrl) {
                    <a mat-stroked-button [href]="deliverableService.getDownloadUrl(d.fileUrl)" target="_blank">
                      <mat-icon>open_in_new</mat-icon> Consulter
                    </a>
                  }
                  <button mat-flat-button class="decide-btn" (click)="openReviewDialog(d)">
                    <mat-icon>verified</mat-icon>
                    Donner décision
                  </button>
                </div>

              </div>
            }
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .po-deliverables { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      .header-left { display: flex; align-items: center; gap: 16px; }
      .header-icon {
        width: 52px; height: 52px; border-radius: 14px;
        background: linear-gradient(135deg, #11998e, #38ef7d);
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; font-size: 26px; }
      }
      h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
      .subtitle { margin: 2px 0 0; color: #6b7280; font-size: 0.875rem; }
      .header-right { display: flex; align-items: center; gap: 8px; }
    }

    .badge-pending {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; background: #fff3cd; border: 1px solid #fde68a;
      border-radius: 20px; font-size: 0.85rem; color: #d97706; font-weight: 600;
      mat-icon { font-size: 16px; }
    }

    .selector-bar { margin-bottom: 24px; .project-select { min-width: 320px; } }

    .state-box {
      display: flex; flex-direction: column; align-items: center;
      padding: 64px 24px; gap: 12px; text-align: center;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: #d1d5db; }
      h3 { margin: 0; color: #374151; } p { color: #6b7280; margin: 0; }
      &.error mat-icon { color: #fca5a5; }
      &.success mat-icon { color: #6ee7b7; }
      .spin { animation: spin 1s linear infinite; }
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .deliverables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .deliverable-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 16px;
      overflow: hidden; transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.10); }
    }

    .card-header-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 0;
      .status-chip.accepted-by-manager {
        display: flex; align-items: center; gap: 5px;
        padding: 4px 12px; border-radius: 20px;
        background: #d1fae5; color: #065f46; font-size: 0.78rem; font-weight: 700;
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
      .version-tag {
        display: flex; align-items: center; gap: 3px;
        font-size: 0.75rem; color: #059669; background: #ecfdf5;
        padding: 2px 8px; border-radius: 10px; font-weight: 600;
        mat-icon { font-size: 13px; }
      }
    }

    .card-body {
      padding: 12px 16px 14px;
      .card-title { margin: 0 0 6px; font-size: 1rem; font-weight: 700; color: #1f2937; }
      .card-desc { margin: 0 0 12px; font-size: 0.82rem; color: #6b7280; line-height: 1.5;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    }

    .meta-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      .meta-item {
        display: flex; align-items: flex-start; gap: 6px;
        mat-icon { font-size: 15px; color: #059669; margin-top: 1px; }
        div { display: flex; flex-direction: column; }
        .meta-label { font-size: 0.7rem; color: #9ca3af; }
        .meta-val { font-size: 0.82rem; color: #374151; font-weight: 500; }
      }
    }

    .card-actions {
      display: flex; gap: 10px; padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      .decide-btn {
        flex: 1;
        background: linear-gradient(135deg, #11998e, #38ef7d) !important;
        color: white !important; border-radius: 10px !important;
        font-weight: 600 !important;
        mat-icon { font-size: 16px; }
      }
    }

    @media (max-width: 768px) {
      .po-deliverables { padding: 12px; }
      .deliverables-grid { grid-template-columns: 1fr; }
      .project-select { min-width: 100% !important; width: 100%; }
    }
  `]
})
export class PoDeliverablesComponent implements OnInit {

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  projects = signal<Project[]>([]);
  selectedProjectId = signal<string | null>(null);
  deliverables = signal<any[]>([]);
  reviewedIds = signal<Set<number>>(new Set());
  loading = signal(false);
  error = signal<string | null>(null);

  pendingCount = computed(() =>
    this.deliverables().filter(d => !this.reviewedIds().has(d.id)).length
  );

  constructor(
    public deliverableService: DeliverableService,
    private reviewService: ReviewService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        if (projects.length === 1) {
          this.selectedProjectId.set(projects[0].id);
          this.load();
        }
      }
    });
  }

  onProjectChange(projectId: string): void {
    this.selectedProjectId.set(projectId);
    this.load();
  }

  load(): void {
    const projectId = this.selectedProjectId();
    if (!projectId) return;

    this.loading.set(true);
    this.error.set(null);
    this.deliverables.set([]);
    this.reviewedIds.set(new Set());

    this.reviewService.getPendingPOReviews(projectId).subscribe({
      next: (data) => { this.deliverables.set(data); this.loading.set(false); },
      error: () => { this.error.set('Erreur chargement.'); this.loading.set(false); }
    });
  }

  openReviewDialog(deliverable: any): void {
    const ref = this.dialog.open(PoReviewDialogComponent, {
      width: '560px', maxWidth: '95vw',
      data: { deliverable } as PoReviewDialogData,
      disableClose: false
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      // Mark as reviewed locally
      const ids = new Set(this.reviewedIds());
      ids.add(deliverable.id);
      this.reviewedIds.set(ids);

      const isValidated = result.overallStatus === 'validated';
      this.snackBar.open(
        isValidated ? '✓ Livrable validé avec succès' : '↩ Décision soumise — employé notifié',
        'Fermer',
        { duration: 4000, panelClass: isValidated ? 'snack-success' : 'snack-warning' }
      );
    });
  }
}
