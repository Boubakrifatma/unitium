import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
    DashboardActivityResponse,
    DashboardFocusResponse,
    DashboardPortfolioResponse,
    DashboardTemplateResponse,
} from "./master-dashboard.models";

@Injectable({ providedIn: "root" })
export class MasterDashboardService {
    private readonly http = inject(HttpClient);
    private readonly base = "http://localhost:8084/api/v1/dashboard";

    getPortfolio(activityLimit = 20, milestoneLimit = 12, templateLimit = 3): Observable<DashboardPortfolioResponse> {
        return this.http.get<DashboardPortfolioResponse>(`${this.base}/portfolio`, {
            params: {
                activityLimit: String(activityLimit),
                milestoneLimit: String(milestoneLimit),
                templateLimit: String(templateLimit),
            },
        });
    }

    getProjectFocus(projectId: string, workspaceId?: string | null): Observable<DashboardFocusResponse> {
        let params = new HttpParams();
        if (workspaceId) {
            params = params.set("workspaceId", workspaceId);
        }
        return this.http.get<DashboardFocusResponse>(`${this.base}/projects/${projectId}/focus`, { params });
    }

    getActivity(limit = 30): Observable<DashboardActivityResponse> {
        return this.http.get<DashboardActivityResponse>(`${this.base}/activity`, {
            params: { limit: String(limit) },
        });
    }

    getTopTemplates(limit = 3): Observable<DashboardTemplateResponse> {
        return this.http.get<DashboardTemplateResponse>(`${this.base}/templates/top`, {
            params: { limit: String(limit) },
        });
    }
}
