import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskResponseDto {
  id: number;
  title: string;
  status: string;
  taskType: string;
  priority: string;
  estimatedHours: number;
  actualHours: number;
  dueDate: string;

  milestone?: {
    id: number;
  };

  assignedTo?: {
    fullName: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private apiUrl = 'http://localhost:8084/api/tasks';

  constructor(private http: HttpClient) {}

  // 🔥 PAS DE FILTRE ICI
 getAllTasks(): Observable<TaskResponseDto[]> {
  return this.http.get<TaskResponseDto[]>('http://localhost:8084/api/tasks');
}
}
