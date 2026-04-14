import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Milestone {
  id?: number;
  name: string;
  description?: string;
  dueDate?: string;
  status: string;
  completionPct?: number;
  /** Présent si l’API renvoie le projet à plat (création / formulaires). */
  projectId?: string;
  /** Backend JPA renvoie souvent le projet imbriqué plutôt que projectId. */
  project?: { id: string };
}

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {

  private apiUrl = 'http://localhost:8084/api/milestones';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(this.apiUrl);
  }

  getById(id: number): Observable<Milestone> {
    return this.http.get<Milestone>(`${this.apiUrl}/${id}`);
  }

  create(milestone: Milestone): Observable<any> {
    return this.http.post(this.apiUrl, milestone);
  }

  update(id: number, milestone: Milestone): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, milestone);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  suggestDescription(title: string): Observable<{ suggestion: string }> {
    return this.http.post<{ suggestion: string }>(
      'http://localhost:8084/api/ai/milestone-description-suggestion',
      { title }
    );
  }

  suggestTasks(title: string): Observable<{ suggestions: { title: string; description: string }[] }> {
    return this.http.post<{ suggestions: { title: string; description: string }[] }>(
      'http://localhost:8084/api/ai/milestone-task-suggestions',
      { title }
    );
  }
}
