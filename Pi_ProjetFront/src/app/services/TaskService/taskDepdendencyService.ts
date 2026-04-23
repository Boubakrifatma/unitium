import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskDependencyResponseDto {
  id: number;
  taskId: number;
  taskTitle: string;
  dependsOnTaskId: number;
  dependsOnTaskTitle: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
}

export interface TaskDependencyCreateDto {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
}

@Injectable({
  providedIn: 'root',
})
export class TaskDependencyService {
  private api = 'http://localhost:8084/api/task-dependencies';

  constructor(private http: HttpClient) {}

  // Le token est ajouté automatiquement par l'authInterceptor

  getAll(): Observable<TaskDependencyResponseDto[]> {
    return this.http.get<TaskDependencyResponseDto[]>(this.api);
  }

  getById(id: number): Observable<TaskDependencyResponseDto> {
    return this.http.get<TaskDependencyResponseDto>(`${this.api}/${id}`);
  }

  getDependenciesByTaskId(taskId: number): Observable<TaskDependencyResponseDto[]> {
    return this.http.get<TaskDependencyResponseDto[]>(`${this.api}/task/${taskId}`);
  }

  getDependentsForTaskId(taskId: number): Observable<TaskDependencyResponseDto[]> {
    return this.http.get<TaskDependencyResponseDto[]>(`${this.api}/dependents/${taskId}`);
  }

  getAllDependenciesForTask(taskId: number): Observable<TaskDependencyResponseDto[]> {
    return this.http.get<TaskDependencyResponseDto[]>(`${this.api}/all/${taskId}`);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  create(payload: TaskDependencyCreateDto): Observable<TaskDependencyResponseDto> {
    return this.http.post<TaskDependencyResponseDto>(this.api, payload, { headers: this.getHeaders() });
  }

  update(id: number, payload: Partial<TaskDependencyCreateDto>): Observable<TaskDependencyResponseDto> {
    return this.http.put<TaskDependencyResponseDto>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
