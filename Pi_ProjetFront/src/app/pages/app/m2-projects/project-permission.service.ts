import { Injectable, computed, inject } from "@angular/core";
import { WorkspacePermissionService } from "../m2-workspaces/workspace-permission.service";

@Injectable({ providedIn: "root" })
export class ProjectPermissionService {
    private readonly workspacePermissions = inject(WorkspacePermissionService);

    readonly canCreateProject = computed(() =>
        this.workspacePermissions.isGlobalAdmin()
        || this.workspacePermissions.isOrgAdmin()
        || this.workspacePermissions.isManager()
        || this.workspacePermissions.isTutor()
    );

    readonly canManageProject = computed(() =>
        this.workspacePermissions.isGlobalAdmin()
        || this.workspacePermissions.isOrgAdmin()
        || this.workspacePermissions.isManager()
        || this.workspacePermissions.isTutor()
    );

    canUseCreateWithAi(orgType: string | null | undefined, workspaceRole?: string | null): boolean {
        const mode = (orgType || this.workspacePermissions.organizationType() || "ENTERPRISE").toUpperCase();
        const wsRole = (workspaceRole || "").toUpperCase();

        if (this.workspacePermissions.isGlobalAdmin() || this.workspacePermissions.isOrgAdmin()) {
            return true;
        }

        if (wsRole === "OWNER" || wsRole === "ADMIN" || wsRole === "MANAGER" || wsRole === "TA") {
            return true;
        }

        const userRole = this.workspacePermissions.userRole();
        if (mode === "ACADEMIC") {
            return this.workspacePermissions.isTutor() || this.workspacePermissions.isManager();
        }
        return this.workspacePermissions.isManager() || userRole === "PRODUCT_OWNER";
    }
}
