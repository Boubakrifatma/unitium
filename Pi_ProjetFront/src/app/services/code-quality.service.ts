import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface QualitySummary {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  totalIssues: number;
  pmd:        { violations: number; priority1: number; priority2: number };
  checkstyle: { errors: number; warnings: number; total: number };
  spotbugs:   { bugs: number; high: number; medium: number; security: number };
  coverage:   {
    lineCoverage: number;   branchCoverage: number;  methodCoverage: number;
    lineCovered: number;    lineTotal: number;
    branchCovered: number;  branchTotal: number;
    error?: string;
  };
}

export interface PmdViolation {
  file: string; line: string; rule: string;
  ruleset: string; priority: string; message: string;
}

export interface CheckstyleIssue {
  file: string; line: string; severity: string; message: string; rule: string;
}

export interface SpotbugsIssue {
  type: string; category: string; priority: string;
  rank: string; file: string; message: string;
}

export interface AnalysisResult {
  exitCode: number; success: boolean; output: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CodeQualityService {

  private readonly base = 'http://localhost:8084/api/quality';

  constructor(private http: HttpClient) {}

  summary(): Observable<QualitySummary> {
    return this.http.get<QualitySummary>(`${this.base}/summary`);
  }

  pmd(): Observable<PmdViolation[]> {
    return this.http.get<PmdViolation[]>(`${this.base}/pmd`);
  }

  checkstyle(): Observable<CheckstyleIssue[]> {
    return this.http.get<CheckstyleIssue[]>(`${this.base}/checkstyle`);
  }

  spotbugs(): Observable<SpotbugsIssue[]> {
    return this.http.get<SpotbugsIssue[]>(`${this.base}/spotbugs`);
  }

  coverage(): Observable<any> {
    return this.http.get<any>(`${this.base}/coverage`);
  }

  runAnalysis(): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.base}/analyze`, {});
  }

  /** Analyse a GitHub repo/branch via GitHub API (no local clone needed). */
  analyzeRepo(owner: string, repo: string, branch: string): Observable<RepoAnalysisResult> {
    const params = new HttpParams()
      .set('owner', owner)
      .set('repo', repo)
      .set('branch', branch);
    return this.http.post<RepoAnalysisResult>(`${this.base}/analyze-repo`, null, { params });
  }
}

export interface RepoAnalysisResult {
  summary: QualitySummary & {
    filesAnalyzed: number;
    filesSkipped: number;
    repo: string;
    branch: string;
  };
  pmd: PmdViolation[];
  checkstyle: CheckstyleIssue[];
  spotbugs: SpotbugsIssue[];
}
