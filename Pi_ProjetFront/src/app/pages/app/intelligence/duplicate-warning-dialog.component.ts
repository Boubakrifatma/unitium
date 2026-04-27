import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DuplicateReport } from '../../../services/deliverable-intelligence.service';

/**
 * Popup shown when a newly submitted deliverable looks like a duplicate.
 */
@Component({
  selector: 'app-duplicate-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="duplicate-dialog">
      <div class="head">
        <mat-icon class="warn">warning_amber</mat-icon>
        <div>
          <h3>Livrable potentiellement dupliqué</h3>
          <p class="sub">
            Seuil d'alerte:
            <b>{{ (data.threshold * 100) | number:'1.0-0' }}%</b>
          </p>
        </div>
      </div>

      @if (data.matches.length === 0) {
        <p class="empty">Aucun doublon proche détecté.</p>
      } @else {
        <ul class="matches">
          @for (m of data.matches; track m.deliverableId) {
            <li [class.over-threshold]="m.similarity >= data.threshold">
              <div class="title">
                <b>{{ m.title }}</b>
                <span class="meta">par {{ m.submittedByName || '—' }} · #{{ m.deliverableId }}</span>
              </div>
              <div class="score">
                <span>{{ (m.similarity * 100) | number:'1.0-0' }}%</span>
              </div>
            </li>
          }
        </ul>
      }

      <div class="actions">
        <button mat-stroked-button mat-dialog-close>Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    .duplicate-dialog { padding: 20px; min-width: 420px; font-family: 'Inter', sans-serif; }
    .head { display: flex; gap: 12px; align-items: flex-start;
      .warn { color: #d97706; font-size: 32px; width: 32px; height: 32px; }
      h3 { margin: 0; font-size: 1.05rem; color: #111827; }
      .sub { margin: 4px 0 0; font-size: 0.82rem; color: #6b7280; }
    }
    .empty { color: #6b7280; padding: 12px 0; }
    .matches { list-style: none; padding: 0; margin: 14px 0; }
    .matches li { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;
      .meta { display: block; font-size: 0.75rem; color: #9ca3af; }
      .score span { font-weight: 700; color: #4b5563; }
      &.over-threshold { background: #fff7ed; border-color: #fdba74;
        .score span { color: #c2410c; } }
    }
    .actions { display: flex; justify-content: flex-end; margin-top: 8px; }
  `]
})
export class DuplicateWarningDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DuplicateWarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DuplicateReport
  ) {}
}
