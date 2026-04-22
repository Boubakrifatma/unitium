// src/app/services/TaskService/task.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssignedTo {
  id: number;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface ProjectRef {
  id: string;
  name?: string;
}

export interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  taskType: string;
  status: string;
  priority: string;
  estimatedHours: number | null;
  actualHours: number | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  projectId: string | null;
  projectName: string | null;
  assignedToId: number | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  createdById: number | null;
  createdByName: string | null;
  parentTaskId?: number | null;
  parentTaskTitle?: string | null;
  milestoneId: number | null;
  milestoneName: string | null;
  isVisibleToAssignees: boolean;
  // used by AllTaskComponent which maps task.assignedTo?.fullName
  assignedTo?: AssignedTo;
  project?: ProjectRef;
}

export interface TaskWritePayload {
  title: string;
  description?: string;
  taskType: string;
  status: string;
  priority?: string;
  estimatedHours?: number;
  actualHours?: number;
  projectId: string;
  milestoneId?: number;
  assignedToId?: number;
  parentTaskId?: number;
  startDate?: string;
  dueDate?: string;
  isVisibleToAssignees?: boolean;
}

export interface UserDTO {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private api = 'http://localhost:8084/api/tasks';

  constructor(private http: HttpClient) {}

  private toLocalDateString(val: any): string | null {
    if (val == null) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string') {
      if (val.includes('T')) return val.split('T')[0];
      if (val.trim() === '') return null;
      return val;
    }
    try {
      // fallback: try to coerce to Date
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (_) {}
    return null;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Kanban (employé connecté) ──────────────────────────────────
  getMyTasks(): Observable<TaskResponseDto[]> {
    return this.http.get<TaskResponseDto[]>(
      `${this.api}/my-tasks`,
      { headers: this.getHeaders() }
    );
  }

  // ── Manager : tâches par milestone ────────────────────────────
  getTasksByMilestone(milestoneId: number): Observable<TaskResponseDto[]> {
    return this.http.get<TaskResponseDto[]>(
      `${this.api}/milestone/${milestoneId}/dto`,
      { headers: this.getHeaders() }
    );
  }

  // ── Détail d'une tâche ─────────────────────────────────────────
  getById(id: number): Observable<TaskResponseDto> {
    return this.http.get<TaskResponseDto>(
      `${this.api}/dto/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ── Créer ──────────────────────────────────────────────────────
  create(payload: TaskWritePayload): Observable<TaskResponseDto> {
    const body = { ...payload } as any;
    body.startDate = this.toLocalDateString(payload.startDate);
    body.dueDate = this.toLocalDateString(payload.dueDate);
    return this.http.post<TaskResponseDto>(
      this.api,
      body,
      { headers: this.getHeaders() }
    );
  }

  // ── Mettre à jour ──────────────────────────────────────────────
  update(id: number, payload: Partial<TaskWritePayload>): Observable<TaskResponseDto> {
    const body = { ...payload } as any;
    if (payload.startDate !== undefined) body.startDate = this.toLocalDateString(payload.startDate);
    if (payload.dueDate !== undefined) body.dueDate = this.toLocalDateString(payload.dueDate);
    return this.http.put<TaskResponseDto>(
      `${this.api}/${id}`,
      body,
      { headers: this.getHeaders() }
    );
  }

  // ── Mise à jour du statut (drag & drop Kanban) ─────────────────
  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(
      `${this.api}/${id}`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  // ── Supprimer ──────────────────────────────────────────────────
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ── Visibilité (manager/admin uniquement) ──────────────────────
  setVisibility(id: number, visible: boolean): Observable<TaskResponseDto> {
    return this.http.patch<TaskResponseDto>(
      `${this.api}/${id}/visibility?visible=${visible}`,
      null,
      { headers: this.getHeaders() }
    );
  }
}
