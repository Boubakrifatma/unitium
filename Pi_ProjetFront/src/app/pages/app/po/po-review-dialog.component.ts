import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ReviewService, PoReviewRequest } from '../../../services/review.service';
import { AuthService } from '../../../auth/auth.service';
import { DeliverableService } from '../../../services/Deliverable.service';
import { DeliverableIntelligenceService } from '../../../services/deliverable-intelligence.service';
import { AutoFeedbackComponent } from '../intelligence/auto-feedback.component';

export interface PoReviewDialogData {
  deliverable: any; // DeliverableResponseDto
}

@Component({
  selector: 'app-po-review-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule,
    AutoFeedbackComponent,
  ],
  template: `
    <div class="po-review-dialog">

      <!-- Header -->
      <div class="dialog-header">
        <div class="header-icon po">
          <mat-icon>verified</mat-icon>
        </div>
        <div class="header-text">
          <h2>Décision PO</h2>
          <p>{{ data.deliverable.title }}</p>
        </div>
        <button mat-icon-button (click)="cancel()"><mat-icon>close</mat-icon></button>
      </div>

      <!-- Summary -->
      <div class="deliverable-summary">
        <div class="pill"><mat-icon>person</mat-icon> {{ data.deliverable.submittedByName }}</div>
        <div class="pill"><mat-icon>assignment</mat-icon> {{ data.deliverable.taskTitle ?? 'N/A' }}</div>
        <div class="pill version"><mat-icon>tag</mat-icon> v{{ data.deliverable.currentVersion }}</div>
        @if (data.deliverable.fileUrl) {
          <a class="pill link" [href]="deliverableService.getDownloadUrl(data.deliverable.fileUrl)" target="_blank">
            <mat-icon>open_in_new</mat-icon> Consulter
          </a>
        }
      </div>

      <mat-dialog-content class="dialog-content">

        <!-- Auto PO feedback (Deliverable Intelligence) -->
        <app-auto-feedback [deliverableId]="data.deliverable.id"></app-auto-feedback>
        <button class="ai-prefill" mat-button type="button" (click)="prefillFromAi()">
          <mat-icon>auto_awesome</mat-icon> Reprendre la suggestion dans le commentaire
        </button>

        <!-- Decision Buttons -->
        <div class="decision-label">Décision <span class="req">*</span></div>
        <div class="decision-cards">

          <button class="decision-card accept"
                  [class.selected]="decision === 'ACCEPTED'"
                  (click)="decision = 'ACCEPTED'">
            <mat-icon>check_circle</mat-icon>
            <span class="card-title">Accepter</span>
            <span class="card-sub">Livrable validé</span>
          </button>

          <button class="decision-card revision"
                  [class.selected]="decision === 'REVISION_REQUIRED'"
                  (click)="decision = 'REVISION_REQUIRED'">
            <mat-icon>rate_review</mat-icon>
            <span class="card-title">Révision</span>
            <span class="card-sub">Retour à l'employé</span>
          </button>

          <button class="decision-card reject"
                  [class.selected]="decision === 'REJECTED'"
                  (click)="decision = 'REJECTED'">
            <mat-icon>cancel</mat-icon>
            <span class="card-title">Rejeter</span>
            <span class="card-sub">Rejet définitif</span>
          </button>

        </div>

        <!-- Feedback -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label><mat-icon>comment</mat-icon> Commentaire <span class="req">*</span></mat-label>
          <textarea matInput [(ngModel)]="feedbackText" rows="4"
            placeholder="Justifiez votre décision..."></textarea>
          <mat-hint>{{ feedbackText.length }} / min. 5 caractères</mat-hint>
        </mat-form-field>

        @if (error()) {
          <div class="error-banner">
            <mat-icon>error_outline</mat-icon> {{ error() }}
          </div>
        }

      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="cancel()" [disabled]="submitting()">Annuler</button>
        <button mat-flat-button
                [color]="decision === 'ACCEPTED' ? 'primary' : decision === 'REJECTED' ? 'warn' : 'accent'"
                (click)="submit()"
                [disabled]="!isValid() || submitting()">
          @if (submitting()) {
            <mat-progress-spinner mode="indeterminate" diameter="18"></mat-progress-spinner>
          } @else {
            {{ decision === 'ACCEPTED' ? 'Valider le livrable' : decision === 'REJECTED' ? 'Rejeter définitivement' : 'Demander révision' }}
          }
        </button>
      </mat-dialog-actions>

    </div>
  `,
  styles: [`
    .po-review-dialog { min-width: 500px; max-width: 560px; font-family: 'Inter', sans-serif; }

    .dialog-header {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
      .header-icon.po {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, #11998e, #38ef7d);
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: white; }
      }
      .header-text { flex: 1; h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
        p { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; } }
    }

    .deliverable-summary {
      display: flex; flex-wrap: wrap; gap: 8px;
      padding: 12px 24px; background: #f0fdf4; border-bottom: 1px solid #d1fae5;
      .pill {
        display: flex; align-items: center; gap: 4px; font-size: 0.82rem;
        padding: 4px 10px; background: white; border: 1px solid #d1fae5;
        border-radius: 8px; color: #374151;
        mat-icon { font-size: 14px; width: 14px; height: 14px; color: #059669; }
        &.version { color: #059669; font-weight: 700; }
        &.link { text-decoration: none; color: #059669; font-weight: 600;
          &:hover { background: #d1fae5; } }
      }
    }

    .dialog-content { padding: 20px 24px !important; }

    .ai-prefill {
      display: inline-flex; align-items: center; gap: 4px;
      color: #7c3aed; font-size: 0.8rem; margin: 4px 0 14px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .decision-label { font-weight: 600; color: #374151; font-size: 0.9rem; margin-bottom: 10px;
      .req { color: #e74c3c; } }

    .decision-cards {
      display: flex; gap: 10px; margin-bottom: 20px;
      .decision-card {
        flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
        padding: 14px 8px; border-radius: 12px; border: 2px solid #e5e7eb;
        background: white; cursor: pointer; transition: all 0.2s;
        mat-icon { font-size: 28px; width: 28px; height: 28px; }
        .card-title { font-size: 0.88rem; font-weight: 700; }
        .card-sub { font-size: 0.72rem; color: #9ca3af; }
        &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        &.accept mat-icon { color: #27ae60; }
        &.accept.selected { border-color: #27ae60; background: #f0fdf4; }
        &.revision mat-icon { color: #f59e0b; }
        &.revision.selected { border-color: #f59e0b; background: #fffbeb; }
        &.reject mat-icon { color: #e74c3c; }
        &.reject.selected { border-color: #e74c3c; background: #fef2f2; }
      }
    }

    .full-width { width: 100%; }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; background: #fee2e2; color: #dc2626;
      border-radius: 8px; font-size: 0.85rem; margin-top: 8px;
    }
    .dialog-actions {
      padding: 12px 24px 16px !important; border-top: 1px solid #f0f0f0;
      display: flex; justify-content: flex-end; gap: 10px;
      button { display: flex; align-items: center; gap: 6px; height: 40px; border-radius: 10px; }
    }
    @media (max-width: 600px) { .po-review-dialog { min-width: 90vw; } }
  `]
})
export class PoReviewDialogComponent {

  decision: 'ACCEPTED' | 'REVISION_REQUIRED' | 'REJECTED' = 'ACCEPTED';
  feedbackText = '';
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<PoReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PoReviewDialogData,
    private reviewService: ReviewService,
    private authService: AuthService,
    public deliverableService: DeliverableService,
    private intelligence: DeliverableIntelligenceService,
  ) {}

  /** Pulls auto-feedback once and copies it into the comment field. */
  prefillFromAi(): void {
    this.intelligence.feedback(this.data.deliverable.id).subscribe({
      next: (f) => {
        if (f.feedback.length === 0) {
          this.feedbackText = 'Livrable conforme, aucune remarque bloquante.';
        } else {
          this.feedbackText = f.feedback.join(' — ');
        }
      }
    });
  }

  isValid(): boolean {
    return this.feedbackText.trim().length >= 5;
  }

  submit(): void {
    if (!this.isValid()) return;

    const user = this.authService.currentUser?.();
    if (!user?.id) { this.error.set('Utilisateur non authentifié.'); return; }

    const request: PoReviewRequest = {
      decision: this.decision,
      feedbackText: this.feedbackText.trim()
    };

    this.submitting.set(true);
    this.error.set(null);

    this.reviewService.submitPOReview(this.data.deliverable.id, user.id, request).subscribe({
      next: (result) => { this.submitting.set(false); this.dialogRef.close(result); },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Erreur lors de la soumission.');
      }
    });
  }

  cancel(): void { this.dialogRef.close(null); }
}
