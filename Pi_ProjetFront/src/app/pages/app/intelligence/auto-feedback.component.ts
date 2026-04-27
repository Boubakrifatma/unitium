import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  AutoFeedback,
  DeliverableIntelligenceService,
} from '../../../services/deliverable-intelligence.service';

/**
 * Inline panel that shows the automatic PO feedback for a deliverable.
 * Meant to be embedded inside the PO review dialog or PO deliverables list.
 */
@Component({
  selector: 'app-auto-feedback',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="auto-feedback">
      <div class="header">
        <mat-icon>auto_awesome</mat-icon>
        <h4>Feedback automatique</h4>
      </div>

      @if (loading()) {
        <p class="muted"><mat-icon class="spin">sync</mat-icon> Analyse...</p>
      } @else if (data()) {
        @if (data()!.feedback.length === 0) {
          <p class="ok"><mat-icon>check_circle</mat-icon> Tout semble bon.</p>
        } @else {
          <ul class="items">
            @for (f of data()!.feedback; track f) {
              <li><mat-icon>error_outline</mat-icon> {{ f }}</li>
            }
          </ul>
        }

        <div class="meta">
          <span class="similarity">
            <mat-icon>compare_arrows</mat-icon>
            Similarité tâche/description:
            <b>{{ (data()!.taskDescriptionSimilarity * 100) | number:'1.0-0' }}%</b>
          </span>
          <span class="suggestion" [attr.data-decision]="data()!.suggestedDecision">
            <mat-icon>tips_and_updates</mat-icon>
            Décision suggérée: <b>{{ data()!.suggestedDecision }}</b>
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .auto-feedback {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 14px 16px; font-family: 'Inter', sans-serif;
    }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
      mat-icon { color: #7c3aed; }
      h4 { margin: 0; font-size: 0.95rem; color: #1f2937; }
    }
    .muted { color: #6b7280; display: flex; align-items: center; gap: 6px; }
    .spin  { animation: spin 1s linear infinite; }
    .ok    { color: #059669; display: flex; align-items: center; gap: 6px; }
    .items { list-style: none; padding: 0; margin: 6px 0;
      li { display: flex; gap: 6px; align-items: flex-start; color: #92400e;
           padding: 4px 0; font-size: 0.88rem;
           mat-icon { color: #d97706; font-size: 17px; width: 17px; height: 17px; } }
    }
    .meta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px;
      font-size: 0.8rem; color: #374151;
      span { display: inline-flex; align-items: center; gap: 4px;
             mat-icon { font-size: 15px; width: 15px; height: 15px; color: #6b7280; } }
      .suggestion[data-decision="validated"]   b { color: #059669; }
      .suggestion[data-decision="rejected"]    b { color: #dc2626; }
      .suggestion[data-decision="major_rework"] b { color: #b45309; }
    }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `]
})
export class AutoFeedbackComponent implements OnChanges {
  @Input() deliverableId!: number;

  private service = inject(DeliverableIntelligenceService);
  data = signal<AutoFeedback | null>(null);
  loading = signal(false);

  ngOnChanges(): void {
    if (!this.deliverableId) return;
    this.loading.set(true);
    this.service.feedback(this.deliverableId).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
