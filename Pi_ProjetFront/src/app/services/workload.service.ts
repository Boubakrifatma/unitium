import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UrgentTaskInfo {
  taskId: number;
  title: string;
  projectName: string;
  projectColor: string;
  dueDate: string | null;
  daysLeft: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: string;
  deadlineLabel: string;
}

export interface PlanTask {
  taskId: number;
  title: string;
  projectName: string;
  projectColor: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: string;
  dueDate: string | null;
  daysLeft: number;
  deadlineLabel: string;
}

export interface DayPlanEntry {
  dayName: string;
  date: string;
  isToday: boolean;
  tasks: PlanTask[];
  dayScore: number;
  isOverloaded: boolean;
}

export interface WorkloadPressure {
  score: number;
  level: 'CALM' | 'MEDIUM' | 'HIGH_STRESS';
  levelLabel: string;
  color: string;
  message: string;
  urgentCount: number;
  upcomingCount: number;
  overdueCount: number;
  totalActiveTasks: number;
  urgentTasks: UrgentTaskInfo[];
  weeklyPlan: DayPlanEntry[];
}

@Injectable({ providedIn: 'root' })
export class WorkloadService {
  private readonly api = 'http://localhost:8084/api/workload';

  readonly pressure   = signal<WorkloadPressure | null>(null);
  readonly loading    = signal(false);
  readonly loadError  = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadPressure(): Observable<WorkloadPressure> {
    this.loading.set(true);
    this.loadError.set(null);
    return this.http
      .get<WorkloadPressure>(`${this.api}/pressure`, { headers: this.headers() })
      .pipe(
        tap({
          next : d  => { this.pressure.set(d); this.loading.set(false); },
          error: e  => { this.loadError.set(e?.message ?? 'Failed'); this.loading.set(false); },
        })
      );
  }

  /** Client-side pressure score for tasks already loaded in the Kanban */
  static computeScore(tasks: { dueDate?: string | null; difficulty?: string | null; priority?: string | null }[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let score = 0;
    for (const t of tasks) {
      if (t.dueDate) {
        const due  = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
        if      (days < 0) score += 4;
        else if (days < 2) score += 3;
        else if (days < 5) score += 2;
        else if (days < 7) score += 1;
      }
      const diff = t.difficulty ?? deriveDiff(t.priority);
      score += diff === 'easy' ? 1 : diff === 'hard' ? 3 : 2;
    }
    return score;
  }
}

function deriveDiff(priority?: string | null): string {
  if (!priority) return 'medium';
  if (priority === 'low')  return 'easy';
  if (priority === 'high' || priority === 'critical') return 'hard';
  return 'medium';
}
