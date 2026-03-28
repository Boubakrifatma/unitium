import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface M2ProjectSummary {
    id: string;
    name: string;
    description?: string;
    status?: string;
    visibility?: "PUBLIC" | "PRIVATE" | string;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    templateId?: string;
    phasesJson?: string;
    workspace?: {
        id: string;
    };
}

export interface M2ProjectMember {
    id: string;
    userId: number;
    role: string;
    assignedAt?: string;
    user?: {
        fullName?: string;
        email?: string;
        avatarUrl?: string;
    };
}

export interface M2ProjectPage {
    content: M2ProjectSummary[];
    totalElements?: number;
}

export interface M2AvailableWorkspaceMember {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl?: string;
    workspaceRole?: string;
}

@Injectable({ providedIn: "root" })
export class M2ProjectService {
    private readonly http = inject(HttpClient);
    private readonly workspaceBase = "http://localhost:8084/api/v1/workspaces";

    getProjects(workspaceId: string, page = 0, size = 20): Observable<M2ProjectPage> {
        return this.http.get<M2ProjectPage>(`${this.workspaceBase}/${workspaceId}/projects?page=${page}&size=${size}`);
    }

    getProjectById(workspaceId: string, projectId: string): Observable<M2ProjectSummary> {
        return this.http.get<M2ProjectSummary>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}`);
    }

    createProject(workspaceId: string, body: Record<string, unknown>): Observable<M2ProjectSummary> {
        return this.http.post<M2ProjectSummary>(`${this.workspaceBase}/${workspaceId}/projects`, body);
    }

    updateProject(workspaceId: string, projectId: string, body: Record<string, unknown>): Observable<M2ProjectSummary> {
        return this.http.put<M2ProjectSummary>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}`, body);
    }

    changeProjectStatus(workspaceId: string, projectId: string, status: string): Observable<M2ProjectSummary> {
        return this.http.patch<M2ProjectSummary>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/status`, { status });
    }

    archiveProject(workspaceId: string, projectId: string): Observable<void> {
        return this.http.delete<void>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}`);
    }

    hardDeleteProject(workspaceId: string, projectId: string): Observable<void> {
        return this.http.delete<void>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/permanent`);
    }

    getProjectMembers(workspaceId: string, projectId: string): Observable<M2ProjectMember[]> {
        return this.http.get<M2ProjectMember[]>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/members`);
    }

    getAvailableWorkspaceMembers(workspaceId: string, projectId: string): Observable<M2AvailableWorkspaceMember[]> {
        return this.http.get<M2AvailableWorkspaceMember[]>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/available-members`);
    }

    addProjectMember(workspaceId: string, projectId: string, userId: number, role?: string): Observable<M2ProjectMember> {
        return this.http.post<M2ProjectMember>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/members`, { userId, role });
    }

    updateProjectMemberRole(workspaceId: string, projectId: string, userId: number, role: string): Observable<M2ProjectMember> {
        return this.http.patch<M2ProjectMember>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/members/${userId}/role`, { role });
    }

    removeProjectMember(workspaceId: string, projectId: string, userId: number): Observable<void> {
        return this.http.delete<void>(`${this.workspaceBase}/${workspaceId}/projects/${projectId}/members/${userId}`);
    }

    bulkChangeStatus(workspaceId: string, projectIds: string[], status: string): Observable<M2ProjectSummary[]> {
        return this.http.patch<M2ProjectSummary[]>(`${this.workspaceBase}/${workspaceId}/projects/bulk-status`, { projectIds, status });
    }
}
