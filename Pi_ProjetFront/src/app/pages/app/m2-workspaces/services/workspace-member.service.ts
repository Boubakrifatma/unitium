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

// Track removed members for undo
interface RemovedMemberRecord {
    workspaceId: string;
    userId: number;
    role: string;
    removedAt: number;
}

@Injectable({ providedIn: "root" })
export class WorkspaceMemberService {
    private readonly http = inject(HttpClient);
    private readonly base = "http://localhost:8084/api/v1/workspaces";

    // Store removed members (max 10 for 5 minutes each)
    private removedMembers: RemovedMemberRecord[] = [];

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

    removeMember(workspaceId: string, userId: number, currentRole?: string): Observable<void> {
        // Track this removal for undo
        if (currentRole) {
            this.trackRemovedMember(workspaceId, userId, currentRole);
        }
        return this.http.delete<void>(`${this.base}/${workspaceId}/members/${userId}`);
    }

    undoRemoveMember(workspaceId: string, userId: number): Observable<WorkspaceMember> {
        // Re-add the member with their previous role
        const record = this.removedMembers.find((r) => r.workspaceId === workspaceId && r.userId === userId);
        const role = record?.role || "MEMBER";

        // Remove from tracking
        this.removedMembers = this.removedMembers.filter((r) => !(r.workspaceId === workspaceId && r.userId === userId));

        return this.addMember(workspaceId, userId, role);
    }

    canUndoRemoval(workspaceId: string, userId: number): boolean {
        return this.removedMembers.some((r) => r.workspaceId === workspaceId && r.userId === userId);
    }

    transferOwner(workspaceId: string, newOwnerId: number): Observable<WorkspaceMember> {
        return this.http.patch<RawWorkspaceMember>(`${this.base}/${workspaceId}/transfer-owner`, { newOwnerId }).pipe(
            map((row) => this.toWorkspaceMember(row))
        );
    }

    private trackRemovedMember(workspaceId: string, userId: number, role: string): void {
        const record: RemovedMemberRecord = {
            workspaceId,
            userId,
            role,
            removedAt: Date.now(),
        };

        this.removedMembers.push(record);

        // Keep only 10 entries and clean up old ones (older than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        this.removedMembers = this.removedMembers.filter((r) => r.removedAt > fiveMinutesAgo).slice(-10);
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
