import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubmitReviewRequest {
  versionId: number | null;  // null → backend uses latest version or auto-creates one
  score: number;             // 0–10
  feedbackText: string;      // min 10 chars
}

export interface PoReviewRequest {
  decision: 'ACCEPTED' | 'REVISION_REQUIRED' | 'REJECTED';
  feedbackText: string;
}

export interface DeliverableReviewDto {
  id: number;
  deliverableId: number;
  versionId: number;
  reviewerId: number;
  reviewerName: string;
  reviewerRole: string;
  score: number;
  feedbackText: string;
  decision: string;  // 'pending' | 'accepted' | 'revision_required' | 'rejected'
  reviewedAt: string;
}

export interface DeliverableWithReviewDto {
  deliverableId: number;
  taskId: number;
  projectId: string;
  employeeId: number;
  employeeName: string;
  title: string;
  description: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeKb: number | null;
  currentVersion: number;
  overallStatus: string;
  latestManagerReview: DeliverableReviewDto | null;
  latestPoReview: DeliverableReviewDto | null;
  submittedAt: string;
  lastReviewedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {

  private managerApiUrl = 'http://localhost:8084/api/reviews/manager';
  private poApiUrl = 'http://localhost:8084/api/reviews/po';

  constructor(private http: HttpClient) {}

  // ── Manager ──────────────────────────────────────────────────────────────

  submitManagerReview(
    deliverableId: number,
    reviewerId: number,
    request: SubmitReviewRequest
  ): Observable<DeliverableWithReviewDto> {
    return this.http.post<DeliverableWithReviewDto>(
      `${this.managerApiUrl}/${deliverableId}?reviewerId=${reviewerId}`,
      request
    );
  }

  getDeliverableReviews(deliverableId: number): Observable<DeliverableReviewDto[]> {
    return this.http.get<DeliverableReviewDto[]>(`${this.managerApiUrl}/${deliverableId}`);
  }

  // ── PO ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/reviews/po/project/{projectId}/pending
   * Livrables acceptés par le manager, en attente de décision PO
   */
  getPendingPOReviews(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.poApiUrl}/project/${projectId}/pending`);
  }

  /**
   * POST /api/reviews/po/{deliverableId}?poId={id}
   * PO soumet sa décision finale
   */
  submitPOReview(
    deliverableId: number,
    poId: number,
    request: PoReviewRequest
  ): Observable<DeliverableWithReviewDto> {
    return this.http.post<DeliverableWithReviewDto>(
      `${this.poApiUrl}/${deliverableId}?poId=${poId}`,
      request
    );
  }

  // ── AI Recommendations ───────────────────────────────────────────────────

  getAiRecommendations(payload: {
    deliverableTitle: string;
    taskTitle: string | null;
    description: string;
    score: number;
  }): Observable<{ recommendations: string }> {
    return this.http.post<{ recommendations: string }>(
      'http://localhost:8084/api/ai/review-recommendations',
      payload
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getDecisionLabel(decision: string): string {
    const labels: Record<string, string> = {
      'accepted': 'Accepté', 'revision_required': 'Révision requise',
      'rejected': 'Rejeté', 'pending': 'En attente'
    };
    return labels[decision] ?? decision;
  }

  getDecisionColor(decision: string): string {
    const colors: Record<string, string> = {
      'accepted': '#27ae60', 'revision_required': '#e67e22',
      'rejected': '#e74c3c', 'pending': '#95a5a6'
    };
    return colors[decision] ?? '#95a5a6';
  }
}
