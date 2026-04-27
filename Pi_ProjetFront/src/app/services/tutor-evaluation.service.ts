import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentDeliverable } from './student-deliverable.service';

// ── Diff types ────────────────────────────────────────────────────────────────

export type LineType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export interface DetailedDiffLine {
  oldLineNumber: number | null;
  newLineNumber: number | null;
  type: LineType;
  content: string;
  oldContent: string | null;
}

export interface DiffSection {
  sectionIndex: number;
  oldStartLine: number;
  newStartLine: number;
  addedInSection: number;
  removedInSection: number;
  modifiedInSection: number;
  lines: DetailedDiffLine[];
}

export interface DetailedComparisonResult {
  leftDeliverableId: number | null;
  rightDeliverableId: number | null;
  leftTitle: string;
  rightTitle: string;
  leftStudentName: string | null;
  rightStudentName: string | null;
  totalAdded: number;
  totalRemoved: number;
  totalModified: number;
  totalUnchanged: number;
  similarityScore: number;
  similarityPct: string;
  impactLevel: 'MINOR' | 'MEDIUM' | 'MAJOR';
  possiblePlagiarism: boolean;
  suggestedScore: number;
  sections: DiffSection[];
  totalSections: number;
}

export interface PaginatedDiffResult {
  page: number;
  pageSize: number;
  totalSections: number;
  totalPages: number;
  totalAdded: number;
  totalRemoved: number;
  totalModified: number;
  similarityScore: number;
  similarityPct: string;
  impactLevel: string;
  possiblePlagiarism: boolean;
  suggestedScore: number;
  leftDeliverableId: number | null;
  rightDeliverableId: number | null;
  leftTitle: string;
  rightTitle: string;
  leftStudentName: string | null;
  rightStudentName: string | null;
  sections: DiffSection[];
}

export interface TutorEvaluationRequest {
  decision: 'ACCEPTED' | 'REJECTED';
  score: number | null;
  feedback: string;
}

@Injectable({ providedIn: 'root' })
export class TutorEvaluationService {

  private readonly base = 'http://localhost:8084/api/tutor';

  constructor(private http: HttpClient) {}

  compare(leftId: number, rightId: number): Observable<DetailedComparisonResult> {
    const params = new HttpParams().set('leftId', leftId).set('rightId', rightId);
    return this.http.post<DetailedComparisonResult>(`${this.base}/compare`, null, { params });
  }

  comparePaged(leftId: number, rightId: number, page = 0, pageSize = 5): Observable<PaginatedDiffResult> {
    const params = new HttpParams()
      .set('leftId', leftId).set('rightId', rightId)
      .set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedDiffResult>(`${this.base}/compare/paged`, { params });
  }

  getStoredComparison(deliverableId: number, page = 0, pageSize = 5): Observable<PaginatedDiffResult> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedDiffResult>(
      `${this.base}/compare/stored/${deliverableId}`, { params });
  }

  evaluate(deliverableId: number, tutorId: number,
           request: TutorEvaluationRequest): Observable<StudentDeliverable> {
    const params = new HttpParams().set('tutorId', tutorId);
    return this.http.post<StudentDeliverable>(
      `${this.base}/evaluate/${deliverableId}`, request, { params });
  }

  downloadReport(deliverableId: number, organization = 'Institution'): Observable<Blob> {
    const params = new HttpParams().set('organization', organization);
    return this.http.get(`${this.base}/report/${deliverableId}`,
      { params, responseType: 'blob' });
  }
}
