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
  projectId: string;
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

  create(milestone: Milestone): Observable<any> {
    return this.http.post(this.apiUrl, milestone);
  }

  update(id: number, milestone: Milestone): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, milestone);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
