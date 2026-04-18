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
    favorited?: boolean;
    favoriteCount?: number;
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

export interface M2TemplateLineageNode {
    id: string;
    name: string;
    createdBy: number;
    rating: number;
    ratingCount: number;
    usageCount: number;
    status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    createdAt?: string;
    children: M2TemplateLineageNode[];
}

export interface M2TemplateRecommendationItem {
    templateId: string;
    name: string;
    templateType: "SCRUM" | "KANBAN" | "WATERFALL" | "CUSTOM";
    difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    score: number;
    rating: number;
    ratingCount: number;
    usageCount: number;
    favoriteCount: number;
    isFeatured: boolean;
    isTrending: boolean;
    isRecommended: boolean;
    favoritedByCurrentUser: boolean;
    reasons: string[];
}

export interface M2TemplateRecommendationsResponse {
    generatedAt: string;
    limit: number;
    count: number;
    context: {
        projectType?: string;
        difficulty?: string;
        workspaceOrgType?: string;
    };
    items: M2TemplateRecommendationItem[];
}

export interface M2TemplateAnalyticsResponse {
    templateId: string;
    name: string;
    status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    isPublic: boolean;
    favoritedByCurrentUser: boolean;
    totals: {
        favoriteCount: number;
        ratingCount: number;
        usageCount: number;
        averageRating: number;
    };
    recent: {
        favorites7d: number;
        favorites30d: number;
        ratings7d: number;
        ratings30d: number;
    };
    ratingDistribution: Record<number, number>;
    scores: {
        qualityScore: number;
        growthScore: number;
        usageVelocityPerWeek: number;
    };
    generatedAt: string;
}

export interface M2TemplateCoverSuggestion {
    id?: string;
    title?: string;
    thumbnail?: string;
    creator?: string;
    license?: string;
    licenseVersion?: string;
    provider?: string;
    url?: string;
    foreignLandingUrl?: string;
}

export interface M2TemplateCoverSuggestionsResponse {
    provider: string;
    providerUrl: string;
    query: string;
    generatedAt: string;
    providerStatus: "live" | "fallback";
    warning?: string;
    count: number;
    items: M2TemplateCoverSuggestion[];
}

export interface TemplateLaunchOverrides {
    phases?: Array<Record<string, unknown>> | string;
    milestones?: Array<Record<string, unknown>> | string;
    tasks?: Array<Record<string, unknown>> | string;
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

    getLineage(id: string, maxDepth = 4): Observable<M2TemplateLineageNode> {
        return this.http.get<M2TemplateLineageNode>(`${this.base}/${id}/lineage?maxDepth=${maxDepth}`);
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

    setRecommended(id: string, recommended: boolean): Observable<M2TemplateSummary> {
        return this.http.patch<M2TemplateSummary>(`${this.base}/${id}/recommend`, { recommended });
    }

    search(params: { search?: string; type?: string; difficulty?: string; status?: string; page?: number; size?: number }): Observable<M2TemplatePage> {
        const p = new URLSearchParams();
        if (params.search)     p.set('search',     params.search);
        if (params.type)       p.set('type',        params.type);
        if (params.difficulty) p.set('difficulty',  params.difficulty);
        if (params.status)     p.set('status',      params.status);
        p.set('page', String(params.page ?? 0));
        p.set('size', String(params.size ?? 50));
        return this.http.get<M2TemplatePage>(`${this.base}/public?${p.toString()}`);
    }

    getRecommendations(params: {
        workspaceId?: string;
        projectType?: string;
        difficulty?: string;
        limit?: number;
    } = {}): Observable<M2TemplateRecommendationsResponse> {
        const p = new URLSearchParams();
        if (params.workspaceId) p.set("workspaceId", params.workspaceId);
        if (params.projectType) p.set("projectType", params.projectType);
        if (params.difficulty) p.set("difficulty", params.difficulty);
        p.set("limit", String(params.limit ?? 10));
        return this.http.get<M2TemplateRecommendationsResponse>(`${this.base}/recommendations?${p.toString()}`);
    }

    getTemplateAnalytics(id: string): Observable<M2TemplateAnalyticsResponse> {
        return this.http.get<M2TemplateAnalyticsResponse>(`${this.base}/${id}/analytics`);
    }

    getCoverSuggestions(query: string, pageSize = 12): Observable<M2TemplateCoverSuggestionsResponse> {
        const p = new URLSearchParams();
        p.set("q", query);
        p.set("pageSize", String(pageSize));
        return this.http.get<M2TemplateCoverSuggestionsResponse>(`${this.base}/cover-suggestions?${p.toString()}`);
    }

    toggleFavorite(id: string): Observable<{ favorited: boolean; favoriteCount: number }> {
        return this.http.post<{ favorited: boolean; favoriteCount: number }>(`${this.base}/${id}/favorite`, {});
    }

    getMyFavorites(page = 0, size = 50): Observable<M2TemplatePage> {
        return this.http.get<M2TemplatePage>(`${this.base}/my-favorites?page=${page}&size=${size}`);
    }

    getFavoriteStatus(id: string): Observable<{ favorited: boolean; favoriteCount: number }> {
        return this.http.get<{ favorited: boolean; favoriteCount: number }>(`${this.base}/${id}/favorite/status`);
    }

    createProjectFromTemplate(
        workspaceId: string,
        templateId: string,
        name?: string,
        startDate?: string,
        endDate?: string,
        overrides?: TemplateLaunchOverrides
    ): Observable<Record<string, unknown>> {
        const body: Record<string, unknown> = {};

        const hasValue = (value: unknown): boolean => {
            if (value === null || value === undefined) return false;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === "string") return value.trim().length > 0;
            return true;
        };

        if (name) body["name"] = name;
        if (startDate) body["startDate"] = startDate;
        if (endDate) body["endDate"] = endDate;
        if (hasValue(overrides?.phases)) body["phases"] = overrides?.phases as unknown;
        if (hasValue(overrides?.milestones)) body["milestones"] = overrides?.milestones as unknown;
        if (hasValue(overrides?.tasks)) body["tasks"] = overrides?.tasks as unknown;

        return this.http.post<Record<string, unknown>>(
            `${this.workspaceBase}/${workspaceId}/projects/from-template/${templateId}`,
            body
        );
    }
}
