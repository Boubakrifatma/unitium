import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DeliverableService, Deliverable } from '../../../services/Deliverable.service';
import { ReviewService, DeliverableReviewDto } from '../../../services/review.service';

@Component({
  selector: 'app-deliverable-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './deliverable-detail-dialog.component.html',
  styleUrls: ['./deliverable-detail-dialog.component.scss']
})
export class DeliverableDetailDialogComponent implements OnInit {

  managerReview = signal<DeliverableReviewDto | null>(null);
  loadingReview = signal(true);

  constructor(
    public dialogRef: MatDialogRef<DeliverableDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Deliverable,
    public deliverableService: DeliverableService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.reviewService.getDeliverableReviews(this.data.id).subscribe({
      next: (reviews) => {
        // Prendre la dernière review du manager (celle avec un score)
        const withScore = reviews.filter(r => r.score != null).sort(
          (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
        );
        this.managerReview.set(withScore[0] ?? null);
        this.loadingReview.set(false);
      },
      error: () => this.loadingReview.set(false)
    });
  }

  getScoreTierLabel(score: number): string {
    if (score === 10) return 'Livrable validé ✓';
    if (score >= 7)   return 'Révision avec encouragement';
    return 'Révision requise';
  }

  getScoreTierColor(score: number): string {
    if (score === 10) return '#16a34a';
    if (score >= 7)   return '#d97706';
    return '#dc2626';
  }

  getScoreTierBg(score: number): string {
    if (score === 10) return '#dcfce7';
    if (score >= 7)   return '#fef3c7';
    return '#fee2e2';
  }

  close(): void {
    this.dialogRef.close();
  }

  edit(): void {
    this.dialogRef.close('edit');
  }

  getStatusColor(status: string): string {
    return this.deliverableService.getStatusColor(status) || 'primary';
  }
  getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'submitted': 'send',
    'revision_required': 'rate_review',
    'accepted_by_manager': 'check_circle',
    'in_progress': 'pending',
    'draft': 'edit_note'
  };
  return icons[status] || 'assignment';
}

getStatusGradient(status: string): string {
  const gradients: Record<string, string> = {
    'submitted': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'revision_required': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    'accepted_by_manager': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    'in_progress': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'draft': 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
  };
  return gradients[status] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

getStatusChipColor(status: string): string {
  const colors: Record<string, string> = {
    'submitted': '#2563eb',
    'revision_required': '#ea580c',
    'accepted_by_manager': '#16a34a',
    'in_progress': '#6d28d9',
    'draft': '#475569'
  };
  return colors[status] || '#4f46e5';
}
}