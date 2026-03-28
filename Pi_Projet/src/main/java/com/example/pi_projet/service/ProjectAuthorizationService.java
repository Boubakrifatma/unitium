package com.example.pi_projet.service;

import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.User.RoleName;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectAuthorizationService {

    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRoleMapper projectRoleMapper;

    public boolean canCreateProject(User requester, Workspace workspace) {
        if (requester == null || workspace == null || workspace.getOrganization() == null) {
            return false;
        }

        if (workspaceAuthorizationService.isGlobalAdmin(requester)) {
            return true;
        }

        try {
            OrganizationMember membership = workspaceAuthorizationService.requireOrganizationMembership(
                requester.getId(),
                workspace.getOrganization().getId()
            );
            return workspaceAuthorizationService.canCreateWorkspace(requester, membership);
        } catch (Module2Exception ex) {
            return false;
        }
    }

    public boolean canManageProject(User requester, Project project) {
        if (requester == null || project == null) {
            return false;
        }

        if (workspaceAuthorizationService.isGlobalAdmin(requester)) {
            return true;
        }

        if (hasProjectManageRole(project, requester.getId())) {
            return true;
        }

        if (canManageByWorkspace(requester, project.getWorkspace())) {
            return true;
        }

        // TUTOR and MANAGER with direct workspace membership can manage any project in that workspace
        Workspace ws = project.getWorkspace();
        if (ws != null) {
            RoleName role = requester.getRole();
            if ((role == RoleName.MANAGER || role == RoleName.TUTOR)
                    && workspaceAuthorizationService.isWorkspaceMember(ws.getId(), requester.getId())) {
                return true;
            }
        }

        return false;
    }

    public boolean canManageProjectMembers(User requester, Project project) {
        return canManageProject(requester, project);
    }

    public boolean canViewProjectMembers(User requester, Project project) {
        if (requester == null || project == null) {
            return false;
        }

        if (workspaceAuthorizationService.isGlobalAdmin(requester)) {
            return true;
        }

        if (projectMemberRepository.existsByProjectIdAndUserId(project.getId(), requester.getId())) {
            return true;
        }

        return canManageByWorkspace(requester, project.getWorkspace());
    }

    private boolean hasProjectManageRole(Project project, Long userId) {
        Optional<ProjectMember> membership = projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId);
        if (membership.isEmpty()) {
            return false;
        }

        String orgType = resolveWorkspaceOrgType(project.getWorkspace());
        return projectRoleMapper.isManageRole(membership.get().getRole(), orgType);
    }

    private boolean canManageByWorkspace(User requester, Workspace workspace) {
        return workspaceAuthorizationService.canInviteOrAddMember(requester, workspace);
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        if (workspace == null) {
            return "enterprise";
        }
        if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
            return workspace.getOrgType().trim().toLowerCase();
        }
        if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            return workspace.getOrganization().getOrgType().name().toLowerCase();
        }
        return "enterprise";
    }
}