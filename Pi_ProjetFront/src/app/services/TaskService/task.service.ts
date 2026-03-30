import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskResponseDto {
  id: number;
  title: string;
  description?: string;
  status: string;
  taskType: string;
  priority?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  milestone?: { id: number };
  /** UUID projet — présent quand l’API charge la relation `project`. */
  project?: { id: string };
  assignedTo?: {
    id: number;
    fullName?: string;
  };
}

/** Body aligned with backend TaskCreateDto */
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
  assignedToId?: number | null;
  startDate?: string;
  dueDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiUrl = 'http://localhost:8084/api/tasks';

  constructor(private http: HttpClient) {}

  getAllTasks(): Observable<TaskResponseDto[]> {
    return this.http.get<TaskResponseDto[]>(this.apiUrl);
  }

  getTasksByMilestone(milestoneId: number): Observable<TaskResponseDto[]> {
    return this.http.get<TaskResponseDto[]>(`${this.apiUrl}/milestone/${milestoneId}`);
  }

  getById(id: number): Observable<TaskResponseDto> {
    return this.http.get<TaskResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(body: TaskWritePayload): Observable<TaskResponseDto> {
    return this.http.post<TaskResponseDto>(this.apiUrl, body);
  }

  update(id: number, body: TaskWritePayload): Observable<TaskResponseDto> {
    return this.http.put<TaskResponseDto>(`${this.apiUrl}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
