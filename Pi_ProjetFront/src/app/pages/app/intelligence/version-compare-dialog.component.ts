import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { VersionDiffComponent } from './version-diff.component';
import {
  DeliverableIntelligenceService,
  AutoSummary,
} from '../../../services/deliverable-intelligence.service';

interface VersionRef {
  id: number;
  versionNumber: number;
  submittedAt?: string;
}

export interface VersionCompareDialogData {
  deliverableTitle: string;
  versions: VersionRef[];
}

/**
 * Dialog that lets a manager pick two versions of the same deliverable
 * and displays the intelligent diff + NLP summary.
 */
@Component({
  selector: 'app-version-compare-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatSelectModule,
    VersionDiffComponent,
  ],
  template: `
    <div class="compare-dialog">

      <div class="head">
        <mat-icon>difference</mat-icon>
        <div>
          <h3>Comparer deux versions</h3>
          <p class="sub">{{ data.deliverableTitle }}</p>
        </div>
        <button mat-icon-button (click)="close()"><mat-icon>close</mat-icon></button>
      </div>

      <div class="pickers">
        <mat-form-field appearance="outline">
          <mat-label>Ancienne version</mat-label>
          <mat-select [(ngModel)]="oldId" (ngModelChange)="onChange()">
            @for (v of data.versions; track v.id) {
              <mat-option [value]="v.id">v{{ v.versionNumber }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-icon class="arrow">arrow_forward</mat-icon>

        <mat-form-field appearance="outline">
          <mat-label>Nouvelle version</mat-label>
          <mat-select [(ngModel)]="newId" (ngModelChange)="onChange()">
            @for (v of data.versions; track v.id) {
              <mat-option [value]="v.id">v{{ v.versionNumber }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (summary()) {
        <div class="summary">
          <mat-icon>summarize</mat-icon>
          <div>
            <b>{{ summary()!.summary }}</b>
            @if (summary()!.nlpSummary) {
              <div class="nlp">{{ summary()!.nlpSummary }}</div>
            }
          </div>
        </div>
      }

      @if (showDiff()) {
        <app-version-diff
          [oldVersionId]="oldId!"
          [newVersionId]="newId!">
        </app-version-diff>
      } @else {
        <div class="hint">
          <mat-icon>info</mat-icon>
          Sélectionne deux versions <b>différentes</b> pour afficher le diff.
        </div>
      }

      <div class="actions">
        <button mat-stroked-button (click)="close()">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    .compare-dialog {
      padding: 18px 22px; min-width: 600px; max-width: 760px;
      font-family: 'Inter', sans-serif;
    }
    .head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
      h3 { margin: 0; font-size: 1.05rem; color: #111827; }
      .sub { margin: 2px 0 0; font-size: 0.82rem; color: #6b7280; }
      > mat-icon { color: #2563eb; font-size: 28px; width: 28px; height: 28px; }
      button { margin-left: auto; }
    }
    .pickers {
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
      mat-form-field { flex: 1; }
      .arrow { color: #6b7280; }
    }
    .summary {
      display: flex; gap: 10px; padding: 10px 12px; background: #f0f9ff;
      border: 1px solid #bae6fd; border-radius: 8px; margin-bottom: 14px;
      font-size: 0.86rem; color: #0c4a6e;
      mat-icon { color: #0284c7; }
      .nlp { margin-top: 4px; font-style: italic; color: #075985; }
    }
    .hint {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 12px; color: #6b7280; font-size: 0.85rem;
      background: #f9fafb; border-radius: 8px;
    }
    .actions { display: flex; justify-content: flex-end; margin-top: 14px; }
  `]
})
export class VersionCompareDialogComponent {

  oldId?: number;
  newId?: number;
  summary = signal<AutoSummary | null>(null);

  showDiff = computed(() =>
    !!this.oldId && !!this.newId && this.oldId !== this.newId);

  constructor(
    public dialogRef: MatDialogRef<VersionCompareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VersionCompareDialogData,
    private intelligence: DeliverableIntelligenceService,
  ) {
    // Preselect the two newest versions if at least 2 exist
    const sorted = [...data.versions].sort((a, b) => a.versionNumber - b.versionNumber);
    if (sorted.length >= 2) {
      this.oldId = sorted[sorted.length - 2].id;
      this.newId = sorted[sorted.length - 1].id;
      this.loadSummary();
    }
  }

  onChange(): void {
    this.summary.set(null);
    this.loadSummary();
  }

  private loadSummary(): void {
    if (!this.oldId || !this.newId || this.oldId === this.newId) return;
    this.intelligence.summary(this.oldId, this.newId).subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
  }

  close(): void { this.dialogRef.close(); }
}
