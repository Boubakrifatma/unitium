import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { ReviewService, SubmitReviewRequest } from '../../../services/review.service';
import { DeliverableWithVersions, DeliverableService } from '../../../services/Deliverable.service';
import { AuthService } from '../../../auth/auth.service';

export interface ReviewDialogData {
  deliverable: DeliverableWithVersions;
}

@Component({
  selector: 'app-manager-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="review-dialog">

      <!-- Header -->
      <div class="dialog-header">
        <div class="header-icon">
          <mat-icon>rate_review</mat-icon>
        </div>
        <div class="header-text">
          <h2>Soumettre une review</h2>
          <p class="header-sub">{{ data.deliverable.title }}</p>
        </div>
        <button mat-icon-button class="close-btn" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Deliverable Summary -->
      <div class="deliverable-summary">
        <div class="summary-row">
          <span class="summary-label"><mat-icon>person</mat-icon> Employé</span>
          <span class="summary-value">{{ data.deliverable.employeeName }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label"><mat-icon>assignment</mat-icon> Tâche</span>
          <span class="summary-value">{{ data.deliverable.taskTitle ?? 'N/A' }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label"><mat-icon>tag</mat-icon> Version</span>
          <span class="summary-value version-badge">v{{ data.deliverable.currentVersion }}</span>
        </div>
        @if (data.deliverable.fileUrl) {
          <div class="summary-row">
            <span class="summary-label"><mat-icon>insert_drive_file</mat-icon> Fichier</span>
            <a [href]="deliverableService.getDownloadUrl(data.deliverable.fileUrl)" target="_blank" class="file-link">
              <mat-icon>download</mat-icon> Consulter le fichier
            </a>
          </div>
        }
      </div>

      <mat-dialog-content class="dialog-content">

        <!-- Score -->
        <div class="score-section">
          <div class="score-header">
            <label class="field-label">Note <span class="required">*</span></label>
            <div class="score-display" [class.score-perfect]="score === 10" [class.score-medium]="score >= 7 && score < 10" [class.score-low]="score < 7">
              <span class="score-number">{{ score }}</span>
              <span class="score-max">/10</span>
            </div>
          </div>

          <div class="score-hint-row">
            <span class="score-hint" [class.perfect]="score === 10" [class.medium]="score >= 7 && score < 10" [class.revision]="score < 7">
              <mat-icon>{{ score === 10 ? 'verified' : score >= 7 ? 'thumb_up' : 'rate_review' }}</mat-icon>
              {{ score === 10 ? 'Score parfait → Livrable validé ✓' : score >= 7 ? 'Score 7–9 → Révision avec encouragement' : 'Score ≤ 6 → Révision requise' }}
            </span>
          </div>

          <div class="slider-row">
            <span class="slider-min">0</span>
            <input
              type="range"
              class="score-slider"
              [(ngModel)]="score"
              min="0"
              max="10"
              step="0.5"
            />
            <span class="slider-max">10</span>
          </div>

          <!-- Quick score chips -->
          <div class="quick-scores">
            @for (s of quickScores; track s) {
              <button
                class="quick-chip"
                [class.selected]="score === s"
                [class.perfect]="s === 10"
                [class.medium]="s >= 7 && s < 10"
                [class.low]="s < 7"
                (click)="score = s">
                {{ s }}
              </button>
            }
          </div>
        </div>

        <!-- AI Recommendations -->
        <div class="ai-section">
          <button
            type="button"
            class="ai-btn"
            (click)="generateAiRecommendations()"
            [disabled]="loadingAi()">
            @if (loadingAi()) {
              <mat-progress-spinner mode="indeterminate" diameter="16"></mat-progress-spinner>
              Analyse en cours...
            } @else {
              <mat-icon>auto_awesome</mat-icon>
              Générer recommandations IA
            }
          </button>

          @if (aiError()) {
            <div class="ai-error">
              <mat-icon>error_outline</mat-icon>
              {{ aiError() }}
            </div>
          }

          @if (aiRecommendations()) {
            <div class="ai-result">
              <div class="ai-result-header">
                <span><mat-icon>psychology</mat-icon> Recommandations générées</span>
                <button type="button" class="use-btn" (click)="useRecommendations()">
                  <mat-icon>content_copy</mat-icon>
                  Utiliser comme feedback
                </button>
              </div>
              <div class="ai-lines">
                @for (line of aiLines; track line) {
                  <p class="ai-line">{{ line }}</p>
                }
              </div>
            </div>
          }
        </div>

        <!-- Feedback -->
        <div class="feedback-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>
              <mat-icon>comment</mat-icon>
              Feedback <span class="required">*</span>
            </mat-label>
            <textarea
              matInput
              [(ngModel)]="feedbackText"
              rows="4"
              [placeholder]="feedbackPlaceholder"
              [class.invalid]="feedbackText.length > 0 && feedbackText.length < 10">
            </textarea>
            <mat-hint>
              {{ feedbackText.length }} / min. 10 caractères
            </mat-hint>
          </mat-form-field>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="error-banner">
            <mat-icon>error_outline</mat-icon>
            {{ error() }}
          </div>
        }

      </mat-dialog-content>

      <!-- Actions -->
      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="cancel()" [disabled]="submitting()">
          Annuler
        </button>
        <button
          mat-flat-button
          [color]="score === 10 ? 'primary' : 'warn'"
          (click)="submit()"
          [disabled]="!isValid() || submitting()">
          @if (submitting()) {
            <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
          } @else {
            {{ score === 10 ? 'Valider' : score >= 7 ? 'Révision (encourager)' : 'Demander révision' }}
          }
        </button>
      </mat-dialog-actions>

    </div>
  `,
  styles: [`
    .review-dialog {
      min-width: 540px;
      max-width: 600px;
      font-family: 'Inter', sans-serif;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f0f0f0;

      .header-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; }
      }

      .header-text {
        flex: 1;
        h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
        .header-sub { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; }
      }

      .close-btn { color: #9ca3af; }
    }

    .deliverable-summary {
      padding: 12px 24px;
      background: #f8faff;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;

      .summary-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.83rem;
        padding: 4px 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;

        .summary-label {
          display: flex; align-items: center; gap: 4px;
          color: #6b7280; font-weight: 500;
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
        }
        .summary-value { color: #1f2937; font-weight: 600; }
        .version-badge {
          background: #eef2ff; color: #4f46e5;
          padding: 1px 8px; border-radius: 10px;
        }
        .file-link {
          display: flex; align-items: center; gap: 4px;
          color: #4f46e5; text-decoration: none; font-weight: 500;
          mat-icon { font-size: 14px; }
        }
      }
    }

    .dialog-content {
      padding: 20px 24px !important;
      max-height: 75vh;
      overflow-y: auto;
    }

    /* ── Score ── */
    .score-section {
      margin-bottom: 20px;
    }

    .score-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .field-label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
      .required { color: #e74c3c; }
    }

    .score-display {
      display: flex;
      align-items: baseline;
      gap: 3px;
      padding: 6px 16px;
      border-radius: 24px;
      transition: all 0.3s;

      &.score-perfect { background: #dcfce7; .score-number { color: #16a34a; } }
      &.score-medium  { background: #fef3c7; .score-number { color: #d97706; } }
      &.score-low     { background: #fee2e2; .score-number { color: #dc2626; } }

      .score-number {
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1;
      }
      .score-max { font-size: 0.85rem; color: #9ca3af; }
    }

    .score-hint-row {
      margin-bottom: 10px;
      .score-hint {
        display: flex; align-items: center; gap: 6px;
        font-size: 0.8rem; font-weight: 600;
        padding: 5px 12px; border-radius: 20px;
        mat-icon { font-size: 15px; width: 15px; height: 15px; }
        &.perfect  { background: #dcfce7; color: #16a34a; }
        &.medium   { background: #fef3c7; color: #d97706; }
        &.revision { background: #fee2e2; color: #dc2626; }
      }
    }

    .slider-row {
      display: flex; align-items: center; gap: 12px;
      .slider-min, .slider-max {
        font-size: 0.8rem; color: #9ca3af; font-weight: 600; min-width: 16px;
      }
    }

    .score-slider {
      flex: 1;
      height: 6px;
      appearance: none;
      border-radius: 3px;
      background: linear-gradient(to right, #6366f1 0%, #6366f1 calc(var(--v, 50%) * 1%), #e5e7eb calc(var(--v, 50%) * 1%), #e5e7eb 100%);
      outline: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        appearance: none;
        width: 22px; height: 22px;
        border-radius: 50%;
        background: #6366f1;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        cursor: pointer;
      }
    }

    .quick-scores {
      display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;
    }

    .quick-chip {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: 1.5px solid #e5e7eb;
      background: white;
      font-size: 0.82rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s;

      &.perfect { border-color: #86efac; color: #16a34a; }
      &.medium  { border-color: #fde68a; color: #d97706; }
      &.low     { border-color: #fca5a5; color: #dc2626; }
      &.selected { transform: scale(1.1); }
      &.selected.perfect { background: #dcfce7; border-color: #16a34a; }
      &.selected.medium  { background: #fef3c7; border-color: #d97706; }
      &.selected.low     { background: #fee2e2; border-color: #dc2626; }

      &:hover { transform: scale(1.05); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }

    /* ── Feedback ── */
    .feedback-section { margin-bottom: 12px; }
    .full-width { width: 100%; }
    textarea.invalid { border-color: #e74c3c; }

    /* ── Error ── */
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      background: #fee2e2; color: #dc2626;
      border-radius: 8px; font-size: 0.85rem;
      mat-icon { font-size: 18px; }
    }

    /* ── Actions ── */
    .dialog-actions {
      padding: 12px 24px 16px !important;
      border-top: 1px solid #f0f0f0;
      display: flex; justify-content: flex-end; gap: 10px;

      button {
        display: flex; align-items: center; gap: 6px;
        height: 40px; border-radius: 10px;
      }
    }

    /* ── AI Recommendations ── */
    .ai-section { margin-bottom: 14px; }

    .ai-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 18px;
      border: 1.5px solid #7c3aed;
      border-radius: 10px;
      background: white;
      color: #7c3aed;
      font-size: 0.85rem; font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      mat-icon { font-size: 18px; }
      mat-progress-spinner { margin: 0; }

      &:hover:not(:disabled) {
        background: #f5f3ff;
        box-shadow: 0 2px 12px rgba(124,58,237,0.2);
      }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .ai-error {
      display: flex; align-items: center; gap: 6px;
      margin-top: 8px;
      padding: 8px 12px;
      background: #fff3cd; color: #92400e;
      border-radius: 8px; font-size: 0.8rem;
      mat-icon { font-size: 16px; }
    }

    .ai-result {
      margin-top: 12px;
      border: 1px solid #ddd6fe;
      border-radius: 12px;
      overflow: hidden;

      .ai-result-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
        border-bottom: 1px solid #ddd6fe;
        font-size: 0.82rem; font-weight: 600; color: #5b21b6;

        span { display: flex; align-items: center; gap: 6px; }
        mat-icon { font-size: 16px; width: 16px; height: 16px; }

        .use-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 4px 12px;
          border: 1px solid #7c3aed;
          border-radius: 8px;
          background: white;
          color: #7c3aed;
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          mat-icon { font-size: 14px; }

          &:hover { background: #7c3aed; color: white; }
        }
      }

      .ai-lines {
        padding: 12px 14px;
        background: white;
        .ai-line {
          margin: 0 0 8px;
          font-size: 0.83rem;
          color: #374151;
          line-height: 1.5;
          &:last-child { margin-bottom: 0; }
        }
      }
    }

    @media (max-width: 600px) {
      .review-dialog { min-width: 90vw; }
    }
  `]
})
export class ManagerReviewDialogComponent {

  score = 7;
  feedbackText = '';
  submitting = signal(false);
  error = signal<string | null>(null);

  aiRecommendations = signal<string | null>(null);
  loadingAi = signal(false);
  aiError = signal<string | null>(null);

  quickScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    public dialogRef: MatDialogRef<ManagerReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReviewDialogData,
    private reviewService: ReviewService,
    private authService: AuthService,
    public deliverableService: DeliverableService
  ) {}

  get feedbackPlaceholder(): string {
    if (this.score === 10) return 'Ce livrable est excellent. Décrivez les points forts observés...';
    if (this.score >= 7) return 'Encouragez le collaborateur et précisez les améliorations souhaitées...';
    return 'Décrivez les défauts identifiés et les corrections attendues...';
  }

  isValid(): boolean {
    return this.feedbackText.trim().length >= 10 && this.score >= 0 && this.score <= 10;
  }

  submit(): void {
    if (!this.isValid()) return;

    const user = this.authService.currentUser?.();
    if (!user?.id) {
      this.error.set('Utilisateur non authentifié.');
      return;
    }

    // Use latest version if available, otherwise backend auto-creates one
    const latestVersion = this.data.deliverable.versions?.[0] ?? null;

    const request: SubmitReviewRequest = {
      versionId: latestVersion?.id ?? null as any,
      score: this.score,
      feedbackText: this.feedbackText.trim()
    };

    this.submitting.set(true);
    this.error.set(null);

    this.reviewService.submitManagerReview(
      this.data.deliverable.deliverableId,
      user.id,
      request
    ).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Erreur lors de la soumission de la review.');
      }
    });
  }

  generateAiRecommendations(): void {
    this.loadingAi.set(true);
    this.aiError.set(null);
    this.aiRecommendations.set(null);

    this.reviewService.getAiRecommendations({
      deliverableTitle: this.data.deliverable.title,
      taskTitle: this.data.deliverable.taskTitle,
      description: this.data.deliverable.description || '',
      score: this.score,
    }).subscribe({
      next: (res) => {
        this.loadingAi.set(false);
        this.aiRecommendations.set(res.recommendations);
      },
      error: () => {
        this.loadingAi.set(false);
        this.aiError.set('Erreur IA — vérifiez la clé API Groq dans application.properties.');
      }
    });
  }

  useRecommendations(): void {
    if (this.aiRecommendations()) {
      this.feedbackText = this.aiRecommendations()!;
    }
  }

  get aiLines(): string[] {
    return (this.aiRecommendations() || '').split('\n').filter(l => l.trim().length > 0);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
