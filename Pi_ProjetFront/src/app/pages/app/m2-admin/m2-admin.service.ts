import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface AdminStats {
    totalWorkspaces: number;
    totalProjects: number;
    publishedTemplates: number;
    pendingTemplates: number;
    totalOrgs: number;
    quotaAlerts: number;
}

export interface AdminWorkspaceRow {
    id: string;
    name: string;
    slug: string;
    org_type: string;
    created_at: string;
    deleted_at: string | null;
    org_name: string;
    organization_type: string;
    plan_name: string;
    max_workspaces: number;
    max_members_per_ws: number;
    max_active_projects: number;
    member_count: number;
    project_count: number;
    org_ws_count: number;
}

export interface AdminProjectRow {
    id: string;
    name: string;
    status: string;
    visibility: string;
    created_at: string;
    deleted_at: string | null;
    start_date: string | null;
    end_date: string | null;
    workspace_name: string;
    workspace_id: string;
    org_name: string;
    org_type: string;
    member_count: number;
}

export interface OrgQuotaRow {
    id: string;
    name: string;
    org_type: string;
    plan_name: string;
    max_workspaces: number;
    max_members_per_ws: number;
    max_active_projects: number;
    ws_count: number;
    project_count: number;
}

export interface TemplateRatingRow {
    id: string;
    name: string;
    template_type: string;
    usage_count: number;
    rating: number;
    rating_count: number;
    is_featured: boolean;
    is_trending: boolean;
    is_recommended: boolean;
    favorite_count: number;
    org_name: string;
}

@Injectable({ providedIn: "root" })
export class M2AdminService {
    private readonly http = inject(HttpClient);
    private readonly base = "http://localhost:8084/api/v1/admin";

    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(`${this.base}/stats`);
    }

    getWorkspaces(): Observable<AdminWorkspaceRow[]> {
        return this.http.get<AdminWorkspaceRow[]>(`${this.base}/workspaces`);
    }

    deleteWorkspace(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/workspaces/${id}`);
    }

    restoreWorkspace(id: string): Observable<Record<string, unknown>> {
        return this.http.post<Record<string, unknown>>(`${this.base}/workspaces/${id}/restore`, {});
    }

    getProjects(): Observable<AdminProjectRow[]> {
        return this.http.get<AdminProjectRow[]>(`${this.base}/projects`);
    }

    toggleProjectVisibility(id: string): Observable<Record<string, unknown>> {
        return this.http.patch<Record<string, unknown>>(`${this.base}/projects/${id}/visibility`, {});
    }

    deleteProject(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/projects/${id}`);
    }

    getOrgQuota(): Observable<OrgQuotaRow[]> {
        return this.http.get<OrgQuotaRow[]>(`${this.base}/orgs/quota`);
    }

    getTemplateRatings(): Observable<TemplateRatingRow[]> {
        return this.http.get<TemplateRatingRow[]>(`${this.base}/templates/ratings`);
    }
}
