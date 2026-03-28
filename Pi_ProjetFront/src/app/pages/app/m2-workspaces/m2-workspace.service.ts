import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface M2Workspace {
    id: string;
    name: string;
    slug: string;
    ownerId: number;
    orgType?: string;
    organizationId?: string;
    createdAt?: string;
    organization?: {
        id: string;
        name?: string;
        slug?: string;
        orgType?: string;
    };
}

export interface M2WorkspaceMember {
    id: string;
    userId: number;
    role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER" | string;
    joinedAt?: string;
    user?: {
        fullName?: string;
        email?: string;
        avatarUrl?: string;
    };
}

export interface M2AvailableOrgMember {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    orgRole: string;
}

export interface M2ProjectSummary {
    id: string;
    name: string;
    description?: string;
    status?: string;
    visibility?: "PUBLIC" | "PRIVATE" | string;
    createdAt?: string;
}

export interface M2ProjectPage {
    content: M2ProjectSummary[];
    totalElements?: number;
}

export interface M2CreateWorkspaceRequest {
    name: string;
    slug?: string;
    organizationId?: string;
    orgId?: string;
    ipAddress?: string;
}

export interface M2UpdateWorkspaceRequest {
    name: string;
    slug?: string;
}

@Injectable({ providedIn: "root" })
export class M2WorkspaceService {
    private http = inject(HttpClient);
    private base = "http://localhost:8084/api/v1/workspaces";

    getWorkspaces(): Observable<M2Workspace[]> {
        return this.http.get<M2Workspace[]>(this.base);
    }

    createWorkspace(body: M2CreateWorkspaceRequest): Observable<M2Workspace> {
        return this.http.post<M2Workspace>(this.base, body);
    }

    updateWorkspace(workspaceId: string, body: M2UpdateWorkspaceRequest): Observable<M2Workspace> {
        return this.http.put<M2Workspace>(`${this.base}/${workspaceId}`, body);
    }

    deleteWorkspace(workspaceId: string, confirmName: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${workspaceId}`, { body: { confirmName } });
    }

    restoreWorkspace(workspaceId: string): Observable<M2Workspace> {
        return this.http.post<M2Workspace>(`${this.base}/${workspaceId}/restore`, {});
    }

    getWorkspaceById(workspaceId: string): Observable<M2Workspace> {
        return this.http.get<M2Workspace>(`${this.base}/${workspaceId}`);
    }

    getWorkspaceMembers(workspaceId: string): Observable<M2WorkspaceMember[]> {
        return this.http.get<M2WorkspaceMember[]>(`${this.base}/${workspaceId}/members`);
    }

    getAvailableMembers(workspaceId: string): Observable<M2AvailableOrgMember[]> {
        return this.http.get<M2AvailableOrgMember[]>(`${this.base}/${workspaceId}/available-members`);
    }

    addWorkspaceMember(workspaceId: string, userId: number, role: string): Observable<M2WorkspaceMember> {
        return this.http.post<M2WorkspaceMember>(`${this.base}/${workspaceId}/members`, { userId, role });
    }

    updateWorkspaceMemberRole(workspaceId: string, userId: number, role: string): Observable<M2WorkspaceMember> {
        return this.http.patch<M2WorkspaceMember>(`${this.base}/${workspaceId}/members/${userId}/role`, { role });
    }

    removeWorkspaceMember(workspaceId: string, userId: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${workspaceId}/members/${userId}`);
    }

    getWorkspaceProjects(workspaceId: string, page = 0, size = 20): Observable<M2ProjectPage> {
        return this.http.get<M2ProjectPage>(`${this.base}/${workspaceId}/projects?page=${page}&size=${size}`);
    }
}
