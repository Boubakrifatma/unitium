package com.example.pi_projet.service;

import com.example.pi_projet.entity.ProjectMember.ProjectRole;
import com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Set;

@Component
public class ProjectRoleMapper {

    private static final Set<ProjectRole> ACADEMIC_ASSIGNABLE = Set.of(
        ProjectRole.PROFESSOR,
        ProjectRole.DEVELOPER,
        ProjectRole.REVIEWER,
        ProjectRole.OBSERVER
    );

    private static final Set<ProjectRole> ENTERPRISE_ASSIGNABLE = Set.of(
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.DEVELOPER,
        ProjectRole.REVIEWER,
        ProjectRole.OBSERVER
    );

    public ProjectRole parseNullable(String rawRole) {
        if (!StringUtils.hasText(rawRole)) {
            return null;
        }
        return ProjectRole.valueOf(rawRole.trim().toUpperCase(Locale.ROOT));
    }

    public ProjectRole resolveAssignmentRole(ProjectRole requested,
                                             WorkspaceRole workspaceRole,
                                             String orgType) {
        ProjectRole normalizedRequested = normalizeLegacy(requested, orgType);
        if (normalizedRequested != null && isAssignableForOrgType(normalizedRequested, orgType)) {
            return normalizedRequested;
        }

        ProjectRole normalizedWorkspaceRole = normalizeWorkspaceRole(workspaceRole, orgType);
        if (isAssignableForOrgType(normalizedWorkspaceRole, orgType)) {
            return normalizedWorkspaceRole;
        }

        return defaultRoleForOrgType(orgType);
    }

    public ProjectRole normalizeLegacy(ProjectRole role, String orgType) {
        return role;
    }

    public boolean isManageRole(ProjectRole role, String orgType) {
        ProjectRole normalized = normalizeLegacy(role, orgType);
        if (normalized == null) {
            return false;
        }
        return normalized == ProjectRole.PROJECT_MANAGER
            || normalized == ProjectRole.PROFESSOR;
    }

    public ProjectRole normalizeWorkspaceRole(WorkspaceRole workspaceRole, String orgType) {
        if (workspaceRole == null) {
            return defaultRoleForOrgType(orgType);
        }

        return switch (workspaceRole) {
            case OWNER, ADMIN, MANAGER -> ProjectRole.PROJECT_MANAGER;
            case TA -> ProjectRole.PROFESSOR;
            case STUDENT, EMPLOYEE, MEMBER -> ProjectRole.DEVELOPER;
            case VIEWER -> ProjectRole.OBSERVER;
        };
    }

    public boolean isAssignableForOrgType(ProjectRole role, String orgType) {
        if (role == null) {
            return false;
        }
        if (isAcademic(orgType)) {
            return ACADEMIC_ASSIGNABLE.contains(role);
        }
        return ENTERPRISE_ASSIGNABLE.contains(role);
    }

    public ProjectRole defaultRoleForOrgType(String orgType) {
        return ProjectRole.DEVELOPER;
    }

    private boolean isAcademic(String orgType) {
        return "academic".equalsIgnoreCase((orgType == null ? "" : orgType).trim());
    }
}