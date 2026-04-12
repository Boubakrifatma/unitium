import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChurnPrediction {
  id: string;
  predictionDate: string;
  churnProbability: number;
  riskSegment: 'STABLE' | 'MEDIUM_RISK' | 'HIGH_RISK';
  actionTriggered: 'NONE' | 'EMAIL' | 'CS_CALL' | 'DISCOUNT_OFFER';
  actionTriggeredAt: string | null;
  wauRatio: number;
  mlUsageRate: number;
  supportTicketCount: number;
  lastLoginDeltaDays: number;
  planUtilizationPct: number;
  paymentFailuresCount: number;
  tenureMonths: number;
  modelVersion: string;
  organization?: { id: string; name: string; slug: string };
}

export interface MLHealth {
  status: string;
  model_loaded: boolean;
  model_version: string;
}

@Injectable({ providedIn: 'root' })
export class MlService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ml`;

  /** Force a prediction for one org */
  predictOrg(orgId: string): Observable<ChurnPrediction> {
    return this.http.post<ChurnPrediction>(`${this.base}/predict/${orgId}`, {});
  }

  /** Latest prediction for one org */
  getLatest(orgId: string): Observable<ChurnPrediction> {
    return this.http.get<ChurnPrediction>(`${this.base}/predictions/${orgId}/latest`);
  }

  /** Full prediction history for one org */
  getHistory(orgId: string): Observable<ChurnPrediction[]> {
    return this.http.get<ChurnPrediction[]>(`${this.base}/predictions/${orgId}/history`);
  }

  /** All HIGH_RISK orgs predicted today */
  getHighRiskToday(): Observable<ChurnPrediction[]> {
    return this.http.get<ChurnPrediction[]>(`${this.base}/predictions/high-risk/today`);
  }

  /** Trigger model retraining */
  triggerTraining(): Observable<{ result: string }> {
    return this.http.post<{ result: string }>(`${this.base}/train`, {});
  }

  /** FastAPI health */
  getMLHealth(): Observable<MLHealth> {
    return this.http.get<MLHealth>(`${this.base}/health`);
  }
}
