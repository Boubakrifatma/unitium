import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface M2TemplateSummary {
    id: string;
    name: string;
    templateType: "SCRUM" | "KANBAN" | "WATERFALL" | "CUSTOM";
    status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    isPublic: boolean;
    isFeatured: boolean;
    isTrending: boolean;
    isRecommended: boolean;
    previewImageUrl?: string;
    estimatedEffort?: "LOW" | "MEDIUM" | "HIGH";
    estimatedDurationDays?: number;
    difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    tags?: string;
    useCaseDescription?: string;
    teamStrategy?: "MANUAL" | "AUTO" | "HYBRID";
    rating: number;
    ratingCount: number;
    usageCount: number;
    version: number;
    createdBy: number;
    createdAt?: string;
    parentTemplateId?: string;
    organizationId?: string;
    // Detail-only fields (returned by getById):
    defaultProjectConfigJson?: string;
    defaultPhasesJson?: string;
    defaultMilestonesJson?: string;
    defaultTasksJson?: string;
    defaultRolesJson?: string;
    defaultChecklistJson?: string;
    teamRecommendationJson?: string;
    approvedBy?: number;
    approvedAt?: string;
    rejectionReason?: string;
}

export interface M2TemplatePage {
    content: M2TemplateSummary[];
    totalElements?: number;
}

@Injectable({ providedIn: "root" })
export class M2TemplateService {
    private readonly http = inject(HttpClient);
    private readonly base = "http://localhost:8084/api/project-templates";
    private readonly workspaceBase = "http://localhost:8084/api/v1/workspaces";

    getAll(page = 0, size = 50): Observable<M2TemplatePage> {
        return this.http.get<M2TemplatePage>(`${this.base}?page=${page}&size=${size}`);
    }

    getMyTemplates(userId: number, page = 0, size = 50): Observable<M2TemplatePage> {
        return this.http.get<M2TemplatePage>(`${this.base}?createdBy=${userId}&page=${page}&size=${size}`);
    }

    getById(id: string): Observable<M2TemplateSummary> {
        return this.http.get<M2TemplateSummary>(`${this.base}/${id}`);
    }

    getPublic(page = 0, size = 50): Observable<M2TemplatePage> {
        return this.http.get<M2TemplatePage>(`${this.base}/public?page=${page}&size=${size}`);
    }

    create(body: Record<string, unknown>): Observable<M2TemplateSummary> {
        return this.http.post<M2TemplateSummary>(this.base, body);
    }

    update(id: string, body: Record<string, unknown>): Observable<M2TemplateSummary> {
        return this.http.put<M2TemplateSummary>(`${this.base}/${id}`, body);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    publish(id: string): Observable<M2TemplateSummary> {
        return this.http.post<M2TemplateSummary>(`${this.base}/${id}/publish`, {});
    }

    approve(id: string): Observable<M2TemplateSummary> {
        return this.http.patch<M2TemplateSummary>(`${this.base}/${id}/approve`, {});
    }

    reject(id: string, reason: string): Observable<M2TemplateSummary> {
        return this.http.patch<M2TemplateSummary>(`${this.base}/${id}/reject`, { reason });
    }

    rate(id: string, rating: number): Observable<M2TemplateSummary> {
        return this.http.post<M2TemplateSummary>(`${this.base}/${id}/rate`, { rating });
    }

    fork(id: string): Observable<M2TemplateSummary> {
        return this.http.post<M2TemplateSummary>(`${this.base}/${id}/fork`, {});
    }

    getPending(page = 0, size = 50): Observable<M2TemplatePage> {
        return this.http.get<M2TemplatePage>(`${this.base}/pending?page=${page}&size=${size}`);
    }

    setFeatured(id: string, featured: boolean): Observable<M2TemplateSummary> {
        return this.http.patch<M2TemplateSummary>(`${this.base}/${id}/feature`, { featured });
    }

    setTrending(id: string, trending: boolean): Observable<M2TemplateSummary> {
        return this.http.patch<M2TemplateSummary>(`${this.base}/${id}/trending`, { trending });
    }

    createProjectFromTemplate(workspaceId: string, templateId: string, name?: string, startDate?: string, endDate?: string): Observable<Record<string, unknown>> {
        const body: Record<string, unknown> = {};
        if (name) body["name"] = name;
        if (startDate) body["startDate"] = startDate;
        if (endDate) body["endDate"] = endDate;
        return this.http.post<Record<string, unknown>>(
            `${this.workspaceBase}/${workspaceId}/projects/from-template/${templateId}`,
            body
        );
    }
}
