import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import {
  DeliverableIntelligenceService,
  VersionDiff,
  AutoSummary,
} from '../../../services/deliverable-intelligence.service';
import { VersionDiffComponent } from './version-diff.component';
import { AutoFeedbackComponent } from './auto-feedback.component';
import { DuplicateWarningDialogComponent } from './duplicate-warning-dialog.component';

/**
 * One-stop test page for the Deliverable Intelligence Module.
 * Exercises the 5 endpoints + 3 UI components without touching existing pages.
 */
@Component({
  selector: 'app-intelligence-test',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatDialogModule,
    VersionDiffComponent, AutoFeedbackComponent,
  ],
  template: `
    <div class="itest">
      <h1><mat-icon>science</mat-icon> Deliverable Intelligence — Test Bench</h1>
      <p class="hint">Remplis les IDs avec des données réelles de ta base, puis clique sur chaque bouton.</p>

      <!-- 1) COMPARE TEXT (no DB needed) -->
      <mat-card>
        <h3>1 · Comparer deux textes (sans DB)</h3>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Ancien texte</mat-label>
          <textarea matInput rows="3" [(ngModel)]="oldText"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nouveau texte</mat-label>
          <textarea matInput rows="3" [(ngModel)]="newText"></textarea>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="runCompareText()">
          <mat-icon>compare</mat-icon> Comparer
        </button>

        @if (textDiff()) {
          <app-version-diff [diff]="textDiff()!"></app-version-diff>
        }
      </mat-card>

      <!-- 2) COMPARE VERSIONS -->
      <mat-card>
        <h3>2 · Comparer deux versions (DB)</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Old version ID</mat-label>
            <input matInput type="number" [(ngModel)]="oldVId">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>New version ID</mat-label>
            <input matInput type="number" [(ngModel)]="newVId">
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="runCompareVersions()">
            <mat-icon>difference</mat-icon> Comparer versions
          </button>
          <button mat-stroked-button (click)="runSummary()">
            <mat-icon>summarize</mat-icon> Summary
          </button>
        </div>

        @if (summary()) {
          <div class="summary-box">
            <b>Summary:</b> {{ summary()!.summary }} ·
            <b>Impact:</b> {{ summary()!.impactLevel }}
            @if (summary()!.nlpSummary) {
              <div><b>NLP:</b> {{ summary()!.nlpSummary }}</div>
            }
          </div>
        }

        @if (oldVId && newVId) {
          <app-version-diff [oldVersionId]="oldVId" [newVersionId]="newVId"></app-version-diff>
        }
      </mat-card>

      <!-- 3) AUTO FEEDBACK -->
      <mat-card>
        <h3>3 · Auto PO Feedback</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Deliverable ID</mat-label>
            <input matInput type="number" [(ngModel)]="feedbackId">
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="feedbackVisible.set(true)">
            <mat-icon>auto_awesome</mat-icon> Générer
          </button>
        </div>
        @if (feedbackVisible() && feedbackId) {
          <app-auto-feedback [deliverableId]="feedbackId"></app-auto-feedback>
        }
      </mat-card>

      <!-- 4) DUPLICATES -->
      <mat-card>
        <h3>4 · Détection de doublons</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Deliverable ID</mat-label>
            <input matInput type="number" [(ngModel)]="dupId">
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="openDuplicates()">
            <mat-icon>content_copy</mat-icon> Vérifier
          </button>
        </div>
        @if (dupMsg()) { <p class="muted">{{ dupMsg() }}</p> }
      </mat-card>

      <!-- 5) ANALYTICS -->
      <mat-card>
        <h3>5 · PO Analytics Dashboard</h3>
        <a mat-flat-button color="primary" routerLink="/app/po-analytics">
          <mat-icon>insights</mat-icon> Ouvrir le dashboard
        </a>
      </mat-card>
    </div>
  `,
  styles: [`
    .itest { padding: 24px; max-width: 1000px; margin: 0 auto; font-family: 'Inter', sans-serif; }
    h1 { display: flex; align-items: center; gap: 8px; color: #111827; }
    .hint { color: #6b7280; margin-bottom: 18px; }
    mat-card { padding: 18px 20px; margin-bottom: 16px; }
    h3 { margin: 0 0 12px; color: #374151; }
    .full { width: 100%; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
    .summary-box { background: #f3f4f6; padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: .9rem; }
    .muted { color: #6b7280; }
  `]
})
export class IntelligenceTestComponent {
  private service = inject(DeliverableIntelligenceService);
  private dialog = inject(MatDialog);

  oldText = 'Login basique avec password.\nPas de MFA.';
  newText = 'Login renforcé.\nPaiement Stripe ajouté.';
  textDiff = signal<VersionDiff | null>(null);

  oldVId?: number;
  newVId?: number;
  summary = signal<AutoSummary | null>(null);

  feedbackId?: number;
  feedbackVisible = signal(false);

  dupId?: number;
  dupMsg = signal<string>('');

  runCompareText() {
    this.service.compareText(this.oldText, this.newText)
      .subscribe(d => this.textDiff.set(d));
  }

  runCompareVersions() {
    // Handled by <app-version-diff> via inputs.
    // Nothing to do — tapping the button just forces Angular change detection.
  }

  runSummary() {
    if (!this.oldVId || !this.newVId) return;
    this.service.summary(this.oldVId, this.newVId)
      .subscribe(s => this.summary.set(s));
  }

  openDuplicates() {
    if (!this.dupId) return;
    this.dupMsg.set('Recherche...');
    this.service.duplicates(this.dupId).subscribe({
      next: (r) => {
        this.dupMsg.set(
          r.matches.length === 0
            ? 'Aucun livrable similaire trouvé.'
            : `${r.matches.length} match(es) — ouverture du dialogue...`
        );
        this.dialog.open(DuplicateWarningDialogComponent, { data: r, width: '520px' });
      },
      error: () => this.dupMsg.set('Erreur — vérifie l’ID.'),
    });
  }
}
