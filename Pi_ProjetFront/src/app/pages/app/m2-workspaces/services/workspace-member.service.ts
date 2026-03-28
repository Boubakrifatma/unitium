import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, Observable } from "rxjs";
import { AvailableOrgMember, WorkspaceMember, WorkspaceMemberCapacity } from "../models/workspace-member.model";

interface RawWorkspaceMember {
    userId: number;
    role?: string;
    workspaceRole?: string;
    joinedAt?: string;
    status?: string;
    orgRole?: string;
    user?: {
        fullName?: string;
        email?: string;
        avatarUrl?: string;
    };
    fullName?: string;
    email?: string;
    avatarUrl?: string;
}

@Injectable({ providedIn: "root" })
export class WorkspaceMemberService {
    private readonly http = inject(HttpClient);
    private readonly base = "http://localhost:8084/api/v1/workspaces";

    getWorkspaceMembers(workspaceId: string): Observable<WorkspaceMember[]> {
        return this.http.get<RawWorkspaceMember[]>(`${this.base}/${workspaceId}/members`).pipe(
            map((rows) => rows.map((row) => this.toWorkspaceMember(row)))
        );
    }

    getAvailableMembers(workspaceId: string): Observable<AvailableOrgMember[]> {
        return this.http.get<AvailableOrgMember[]>(`${this.base}/${workspaceId}/available-members`);
    }

    getMemberCapacity(workspaceId: string): Observable<WorkspaceMemberCapacity> {
        return this.http.get<WorkspaceMemberCapacity>(`${this.base}/${workspaceId}/members/capacity`).pipe(
            map((row) => ({
                ...row,
                organizationMembers: Number(row?.organizationMembers ?? row?.currentMembers ?? 0),
            }))
        );
    }

    addMember(workspaceId: string, userId: number, role: string): Observable<WorkspaceMember> {
        return this.http.post<RawWorkspaceMember>(`${this.base}/${workspaceId}/members`, { userId, role }).pipe(
            map((row) => this.toWorkspaceMember(row))
        );
    }

    updateMemberRole(workspaceId: string, userId: number, role: string): Observable<WorkspaceMember> {
        return this.http.patch<RawWorkspaceMember>(`${this.base}/${workspaceId}/members/${userId}/role`, { role }).pipe(
            map((row) => this.toWorkspaceMember(row))
        );
    }

    removeMember(workspaceId: string, userId: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${workspaceId}/members/${userId}`);
    }

    transferOwner(workspaceId: string, newOwnerId: number): Observable<WorkspaceMember> {
        return this.http.patch<RawWorkspaceMember>(`${this.base}/${workspaceId}/transfer-owner`, { newOwnerId }).pipe(
            map((row) => this.toWorkspaceMember(row))
        );
    }

    private toWorkspaceMember(row: RawWorkspaceMember): WorkspaceMember {
        return {
            userId: row.userId,
            fullName: row.fullName || row.user?.fullName || `User #${row.userId}`,
            email: row.email || row.user?.email || "",
            avatarUrl: row.avatarUrl || row.user?.avatarUrl || "",
            workspaceRole: (row.workspaceRole || row.role || "VIEWER").toUpperCase(),
            orgRole: (row.orgRole || "member").toLowerCase(),
            joinedAt: row.joinedAt || "",
            status: (row.status || "ACTIVE").toUpperCase(),
        };
    }
}
