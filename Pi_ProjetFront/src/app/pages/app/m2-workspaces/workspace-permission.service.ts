import { Injectable, computed, inject } from "@angular/core";
import { AuthService } from "../../../auth/auth.service";
import { M2WorkspaceMember } from "./m2-workspace.service";

type WorkspaceMemberLike = M2WorkspaceMember | {
    userId: number;
    role?: string;
    workspaceRole?: string;
};

@Injectable({ providedIn: "root" })
export class WorkspacePermissionService {
    private readonly authService = inject(AuthService);

    readonly userRole = computed(() => (this.authService.currentUser()?.role || "").toUpperCase());
    readonly organizationMembershipRole = computed(() => (this.authService.currentOrganization()?.membershipRole || "").toUpperCase());
    readonly organizationType = computed(() => (this.authService.currentOrganization()?.organizationType || "").toUpperCase());

    readonly isGlobalAdmin = computed(() => this.userRole() === "SUPER_ADMIN" || this.userRole() === "ADMIN");
    readonly isOrgAdmin = computed(() => this.organizationMembershipRole() === "ADMIN" || this.organizationMembershipRole() === "OWNER");
    readonly isManager = computed(() => this.userRole() === "MANAGER");
    readonly isTutor = computed(() => this.userRole() === "TUTOR");
    readonly isAcademicTutor = computed(() => this.isTutor() && this.organizationType() === "ACADEMIC");

    readonly canCreateWorkspace = computed(() => this.isGlobalAdmin() || this.isOrgAdmin() || this.isManager() || this.isTutor());
    readonly canManageByRole = computed(() => this.isGlobalAdmin() || this.isOrgAdmin() || this.isAcademicTutor());

    canOpenWorkspaceFromList(workspaceId: string | null | undefined): boolean {
        return !!workspaceId && !!this.authService.currentUser();
    }

    getWorkspaceRoleForCurrentUser(members: WorkspaceMemberLike[]): string | null {
        const userId = this.authService.currentUser()?.id;
        if (!userId) {
            return null;
        }

        const member = members.find((m) => m.userId === userId);
        if (!member) {
            return null;
        }

        const role = "workspaceRole" in member ? member.workspaceRole : member.role;
        return (role || "").toUpperCase() || null;
    }

    canManageWorkspace(members: WorkspaceMemberLike[]): boolean {
        if (this.canManageByRole()) {
            return true;
        }

        const workspaceRole = this.getWorkspaceRoleForCurrentUser(members);
        return workspaceRole === "OWNER" || workspaceRole === "ADMIN" || workspaceRole === "MANAGER";
    }

    isReadOnlyWorkspace(members: WorkspaceMemberLike[]): boolean {
        const isWorkspaceMember = !!this.getWorkspaceRoleForCurrentUser(members);
        return isWorkspaceMember && !this.canManageWorkspace(members);
    }
}
