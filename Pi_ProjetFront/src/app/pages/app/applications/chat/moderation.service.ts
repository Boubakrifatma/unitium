import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportRequest {
  messageId: number;
  roomId: number;
  category: string;
  description?: string;
  anonymous?: boolean;
}

export interface ModerationReport {
  id: number;
  messageId: number;
  messageContent: string;
  roomId: number;
  roomName: string;
  reporterId: number;
  reporterName: string;
  anonymous: boolean;
  category: string;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  aiSuggestion?: string;
  actionTaken?: string;
  createdAt: string;
  resolvedAt?: string;
  senderName: string;
  senderId: number;
}

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly BASE_URL = 'http://localhost:8084';

  pendingCount = signal<number>(0);

  constructor(private http: HttpClient) {}

  createReport(req: ReportRequest): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/chat/moderation/reports`, req);
  }

  getPendingReports(): Observable<ModerationReport[]> {
    return this.http.get<ModerationReport[]>(
      `${this.BASE_URL}/api/chat/moderation/reports/pending`,
    );
  }

  getAllReports(): Observable<ModerationReport[]> {
    return this.http.get<ModerationReport[]>(
      `${this.BASE_URL}/api/chat/moderation/reports/all`,
    );
  }

  getPendingReportCount(): Observable<number> {
    return this.http.get<number>(
      `${this.BASE_URL}/api/chat/moderation/reports/count`,
    );
  }

  takeAction(reportId: number, action: string, note?: string): Observable<any> {
    return this.http.put<any>(
      `${this.BASE_URL}/api/chat/moderation/reports/${reportId}/action`,
      { action, note: note ?? '' },
    );
  }

  dismissReport(reportId: number): Observable<any> {
    return this.http.put<any>(
      `${this.BASE_URL}/api/chat/moderation/reports/${reportId}/dismiss`,
      {},
    );
  }
}
