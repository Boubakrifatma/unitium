import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MilestoneRiskDto {
  milestoneId: number;
  milestoneName: string;
  plannedDueDate: string | null;
  predictedDueDate: string | null;
  delayDays: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  totalTasks: number;
  doneTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionPct: number;
  velocity: number;
  alerts: string[];
}

export interface ProjectAnalyticsDto {
  projectId: string;
  projectName: string;
  actualProgressPct: number;
  plannedProgressPct: number;
  scheduleVariance: number;
  overallRisk: 'low' | 'medium' | 'high';
  overallRiskScore: number;
  totalMilestones: number;
  completedMilestones: number;
  atRiskMilestones: number;
  missedMilestones: number;
  totalTasks: number;
  doneTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  criticalMilestones: MilestoneRiskDto[];
  burndownLabels: string[];
  burndownIdeal: number[];
  burndownActual: (number | null)[];
}

export interface WhatIfResultDto {
  triggeredByTaskId: number;
  triggeredByTaskTitle: string;
  hypotheticalDelayDays: number;
  totalCascadedTasks: number;
  affectedTasks: {
    taskId: number;
    taskTitle: string;
    originalDueDate: string | null;
    newDueDate: string | null;
    shiftDays: number;
  }[];
  affectedMilestones: {
    milestoneId: number;
    milestoneName: string;
    originalDueDate: string | null;
    newPredictedDate: string | null;
    newRiskScore: number;
    newRiskLevel: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private base = 'http://localhost:8084/api/analytics';

  constructor(private http: HttpClient) {}

  getProjectAnalytics(projectId: string): Observable<ProjectAnalyticsDto> {
    return this.http.get<ProjectAnalyticsDto>(`${this.base}/project/${projectId}`);
  }

  getWorkspaceAnalytics(workspaceId: string): Observable<ProjectAnalyticsDto[]> {
    return this.http.get<ProjectAnalyticsDto[]>(`${this.base}/workspace/${workspaceId}`);
  }

  getMilestoneRisk(milestoneId: number): Observable<MilestoneRiskDto> {
    return this.http.get<MilestoneRiskDto>(`${this.base}/milestone/${milestoneId}/risk`);
  }

  recalculateMilestone(milestoneId: number): Observable<MilestoneRiskDto> {
    return this.http.post<MilestoneRiskDto>(`${this.base}/milestone/${milestoneId}/recalculate`, {});
  }

  recalculateProject(projectId: string): Observable<MilestoneRiskDto[]> {
    return this.http.post<MilestoneRiskDto[]>(`${this.base}/project/${projectId}/recalculate`, {});
  }

  simulateWhatIf(taskId: number, delayDays: number): Observable<WhatIfResultDto> {
    return this.http.post<WhatIfResultDto>(`${this.base}/whatif`, { taskId, delayDays });
  }
}
