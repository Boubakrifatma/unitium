import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskRiskResult {
  riskScore:      number;   // 0.0 – 1.0
  highRisk:       boolean;
  threshold:      number;
  method:         string;
  reasoning:      string | null;
  userWorkload:   number;
  fallback:       boolean;
  fallbackReason: string | null;
}

@Injectable({ providedIn: 'root' })
export class RiskPredictionService {

  private api = 'http://localhost:8084/api/tasks';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Ask the backend to assess ML risk for a task payload WITHOUT saving it.
   * The returned observable emits a {@link TaskRiskResult}.
   */
  checkRisk(payload: any): Observable<TaskRiskResult> {
    return this.http.post<TaskRiskResult>(
      `${this.api}/check-risk`,
      payload,
      { headers: this.getHeaders() }
    );
  }
}
