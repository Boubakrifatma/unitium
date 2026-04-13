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

export interface M2PibBootstrapRequest {
    workspace_id: string;
    input_type: "text" | "document";
    description?: string | null;
    document_base64?: string | null;
    document_filename?: string | null;
}

export interface M2PibStage1Signals {
    embedding: number[];
    project_type: string;
    complexity: string;
    domain_tags: string[];
    detected_mode: string;
    constraints: string[];
    cold_start_mode: boolean;
}

export interface M2PibTemplateRecommendation {
    id: string;
    name: string;
    matchScore: number;
    completionRate: number;
    explanation: string;
}

export interface M2PibRoleRequirement {
    role: string;
    critical: boolean;
    confidence: number;
    countSuggested: number;
    cold_start_mode: boolean;
}

export interface M2PibCandidate {
    userId: number;
    name: string;
    fitScore: number;
    reasons: string[];
}

export interface M2PibRoleSuggestions {
    role: string;
    candidates: M2PibCandidate[];
}

export interface M2PibBootstrapResponse {
    workspace_id: string;
    input_type: string;
    stage1: M2PibStage1Signals;
    stage2: {
        cold_start_mode: boolean;
        templates: M2PibTemplateRecommendation[];
    };
    stage3: {
        cold_start_mode: boolean;
        required_roles: M2PibRoleRequirement[];
    };
    stage4: {
        cold_start_mode: boolean;
        suggestions: M2PibRoleSuggestions[];
    };
    capabilities: {
        stage2_ready: boolean;
        stage3_ready: boolean;
        stage4_ready: boolean;
    };
    cold_start_any: boolean;
    latency_ms: number;
    cache_hit: boolean;
    metadata: Record<string, string>;
}

export interface M2PibServerStatus {
    online: boolean;
    stage2_ready: boolean;
    stage3_ready: boolean;
    stage4_ready: boolean;
    model_version?: string;
    reason?: string;
}

export interface M2PibConfirmRoleSelection {
    role: string;
    critical: boolean;
    confidence: number;
    countSuggested: number;
}

export interface M2PibConfirmMemberSelection {
    role: string;
    userId: number;
    accepted: boolean;
    fitScore: number;
    reasons: string[];
}

export interface M2PibConfirmRequest {
    inputType: "text" | "document";
    projectName: string;
    projectDescription: string;
    visibility?: "PUBLIC" | "PRIVATE";
    selectedTemplateId?: string | null;
    selectedTemplateName?: string | null;
    stage1: {
        embedding?: number[];
        project_type: string;
        complexity: string;
        domain_tags: string[];
        detected_mode: string;
        constraints: string[];
        cold_start_mode?: boolean;
    };
    roles: M2PibConfirmRoleSelection[];
    members: M2PibConfirmMemberSelection[];
    coldStartAny?: boolean;
    modelVersion?: string;
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

    bootstrapProjectIntelligence(workspaceId: string, body: M2PibBootstrapRequest): Observable<M2PibBootstrapResponse> {
        return this.http.post<M2PibBootstrapResponse>(`${this.workspaceBase}/${workspaceId}/projects/pib/bootstrap`, body);
    }

    getProjectIntelligenceStatus(workspaceId: string): Observable<M2PibServerStatus> {
        return this.http.get<M2PibServerStatus>(`${this.workspaceBase}/${workspaceId}/projects/pib/status`);
    }

    confirmProjectIntelligence(workspaceId: string, body: M2PibConfirmRequest): Observable<M2ProjectSummary> {
        return this.http.post<M2ProjectSummary>(`${this.workspaceBase}/${workspaceId}/projects/pib/confirm`, body);
    }
}
