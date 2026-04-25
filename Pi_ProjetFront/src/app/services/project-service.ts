import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { M2WorkspaceService } from "../pages/app/m2-workspaces/m2-workspace.service";
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  visibility: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {

  private apiUrl = 'http://localhost:8084/api/v1/workspaces';

  constructor(private http: HttpClient, private workspaceService: M2WorkspaceService) {}

  private resolveWorkspaceId$(): Observable<string | null> {
    const stored = localStorage.getItem('currentWorkspaceId');
    if (stored) return of(stored);
    return this.workspaceService.getWorkspaces().pipe(
      map(ws => (ws && ws.length > 0) ? ws[0].id : null)
    );
  }

  getAll(): Observable<Project[]> {
    return this.resolveWorkspaceId$().pipe(
      switchMap((workspaceId) => {
        if (!workspaceId) return of([] as Project[]);
        return this.http.get<any>(`${this.workspaceBase}/${workspaceId}/projects`).pipe(
          map(page => (page && page.content) ? page.content as Project[] : (page as Project[]))
        );
      })
    );
  }

  /** Projects where the current user is actually a ProjectMember (no PUBLIC projects). */
  getMyProjects(): Observable<Project[]> {
    return this.http.get<any[]>('http://localhost:8084/api/projects').pipe(
      map(list => (list ?? []).map(p => ({
        id: p.id,
        name: p.name,
        status: p.status ?? '',
        visibility: p.visibility ?? '',
        endDate: p.endDate ?? undefined
      }) as Project))
    );
  }

  getById(projectId: string): Observable<Project> {
    return this.resolveWorkspaceId$().pipe(
      switchMap(workspaceId => {
        if (!workspaceId) return of(null as any);
        return this.http.get<any>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}`);
      }),
      map(p => p ? ({
        id: p.id,
        name: p.name,
        status: p.status ?? '',
        visibility: p.visibility ?? '',
        startDate: p.startDate ?? undefined,
        endDate: p.endDate ?? undefined
      }) as Project : { id: projectId, name: '', status: '', visibility: '' })
    );
  }

  getMembers(projectId: string): Observable<any[]> {
    return this.resolveWorkspaceId$().pipe(
      switchMap((workspaceId) => {
        if (!workspaceId) return of([] as any[]);
        return this.http.get<any[]>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/members`);
      })
    );
  }

  

  private workspaceBase = 'http://localhost:8084/api/v1/workspaces';

  getUserProjects(userId: number): Observable<Project[]> {
    // Try local storage first (common place to keep the selected workspace)
    const storedWorkspace = localStorage.getItem('currentWorkspaceId');
    if (storedWorkspace) {
      return this.http.get<any>(`${this.workspaceBase}/${storedWorkspace}/projects`).pipe(
        map(page => (page && page.content) ? page.content as Project[] : (page as Project[]))
      );
    }

    // Fallback: fetch available workspaces and use the first workspace's projects
    return this.workspaceService.getWorkspaces().pipe(
      switchMap((workspaces) => {
        if (!workspaces || workspaces.length === 0) return of([] as Project[]);
        const workspaceId = workspaces[0].id;
        return this.http.get<any>(`${this.workspaceBase}/${workspaceId}/projects`).pipe(
          map(page => (page && page.content) ? page.content as Project[] : (page as Project[]))
        );
      })
    );
  }
 
}
