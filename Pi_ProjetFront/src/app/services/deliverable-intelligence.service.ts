import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ═════════════════════════════════════════════════════════════════════════
// Deliverable Intelligence — client types
// ═════════════════════════════════════════════════════════════════════════

export interface ChangedLine {
  before: string;
  after: string;
}

export type KeywordChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED';
export type KeywordRiskLevel  = 'HIGH' | 'MEDIUM' | 'FEATURE_UPDATE' | 'LOW';

export interface KeywordChange {
  keyword: string;
  type: KeywordChangeType;
  riskLevel: KeywordRiskLevel;
}

export type HighlightKind  = 'ADDED' | 'REMOVED' | 'CHANGED';
export type HighlightColor = 'RED' | 'GREEN' | 'YELLOW';

export interface HighlightedLine {
  text: string;
  kind: HighlightKind;
  color: HighlightColor;
  critical: boolean;
  matchedKeywords: string[];
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  added: string[];
  removed: string[];
  changed: ChangedLine[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
  impactLevel: 'MINOR' | 'MEDIUM' | 'MAJOR';
  regressionDetected: boolean;
  regressionReason: string | null;
  importantKeywords: string[];
  keywordChanges: KeywordChange[];
  highlightedLines: HighlightedLine[];
  criticalChangesOnly: boolean;
}

export interface AutoSummary {
  summary: string;
  nlpSummary: string | null;
  impactLevel: 'MINOR' | 'MEDIUM' | 'MAJOR';
}

export interface AutoFeedback {
  deliverableId: number;
  feedback: string[];
  taskDescriptionSimilarity: number;
  suggestedDecision: 'validated' | 'minor_changes' | 'major_rework' | 'rejected';
}

export interface DuplicateMatch {
  deliverableId: number;
  title: string;
  submittedByName: string | null;
  similarity: number;
}

export interface DuplicateReport {
  deliverableId: number;
  duplicateWarning: boolean;
  threshold: number;
  matches: DuplicateMatch[];
}

export interface RejectionReasonCount {
  reason: string;
  count: number;
}

export interface PoDecisionAnalytics {
  totalDecisions: number;
  acceptanceRate: number;
  rejectionRate: number;
  decisionBreakdown: Record<string, number>;
  topRejectionReasons: RejectionReasonCount[];
  insights: string[];
}

export interface DeliverableComparisonSide {
  deliverableId: number;
  title: string;
  submittedById: number | null;
  submittedByName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  textLength: number;
  extracted: boolean;
}

export interface DeliverableComparison {
  left: DeliverableComparisonSide;
  right: DeliverableComparisonSide;
  similarity: number;
  possiblePlagiarism: boolean;
  diff: VersionDiff;
}

// ═════════════════════════════════════════════════════════════════════════
// Service
// ═════════════════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class DeliverableIntelligenceService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8084/api/deliverable-intelligence';

  compareVersions(oldVersionId: number, newVersionId: number): Observable<VersionDiff> {
    return this.http.get<VersionDiff>(
      `${this.base}/compare/versions?oldVersionId=${oldVersionId}&newVersionId=${newVersionId}`
    );
  }

  compareText(oldText: string, newText: string): Observable<VersionDiff> {
    return this.http.post<VersionDiff>(`${this.base}/compare/text`, { oldText, newText });
  }

  summary(oldVersionId: number, newVersionId: number): Observable<AutoSummary> {
    return this.http.get<AutoSummary>(
      `${this.base}/summary?oldVersionId=${oldVersionId}&newVersionId=${newVersionId}`
    );
  }

  feedback(deliverableId: number): Observable<AutoFeedback> {
    return this.http.get<AutoFeedback>(`${this.base}/feedback/${deliverableId}`);
  }

  duplicates(deliverableId: number): Observable<DuplicateReport> {
    return this.http.get<DuplicateReport>(`${this.base}/duplicates/${deliverableId}`);
  }

  analytics(projectId?: string): Observable<PoDecisionAnalytics> {
    const q = projectId ? `?projectId=${projectId}` : '';
    return this.http.get<PoDecisionAnalytics>(`${this.base}/analytics${q}`);
  }

  /** Tutor: compare actual file content (PDF/DOCX) of two deliverables. */
  compareDeliverables(leftId: number, rightId: number): Observable<DeliverableComparison> {
    return this.http.get<DeliverableComparison>(
      `${this.base}/compare/deliverables?leftId=${leftId}&rightId=${rightId}`
    );
  }
}
