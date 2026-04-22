package com.example.pi_projet.service;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.FORBIDDEN;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceAuthorizationService {

    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public boolean isGlobalAdmin(User user) {
        if (user == null || user.getRole() == null) {
            return false;
        }
        return user.getRole() == User.RoleName.SUPER_ADMIN || user.getRole() == User.RoleName.ADMIN;
    }

    public OrganizationMember requireSingleOrganizationMembership(Long userId) {
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        if (memberships.isEmpty()) {
            throw new Module2Exception(FORBIDDEN, "Authenticated user is not a member of any organization");
        }
        if (memberships.size() > 1) {
            throw new Module2Exception(FORBIDDEN, "Authenticated user belongs to multiple organizations, exactly one is required");
        }
        return memberships.get(0);
    }

    public OrganizationMember requireOrganizationMembership(Long userId, UUID orgId) {
        return organizationMemberRepository.findByOrganization_IdAndUserIdAndDeletedAtIsNull(orgId, userId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "You can act only inside your organization"));
    }

    public boolean isWorkspaceMember(UUID workspaceId, Long userId) {
        return workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
    }

    public boolean canViewAllWorkspacesInOrganization(User user, OrganizationMember membership) {
        if (isGlobalAdmin(user)) {
            return true;
        }
        if (isOrgAdmin(membership)) {
            return true;
        }
        return isTutorInAcademicOrganization(user, membership.getOrganization());
    }

    public boolean canViewWorkspace(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isEmpty()) {
            return false;
        }

        if (isOrgAdmin(membership.get()) || isTutorInAcademicOrganization(user, workspace.getOrganization())) {
            return true;
        }

        return isWorkspaceMember(workspace.getId(), user.getId());
    }

    public boolean canCreateWorkspace(User user, OrganizationMember membership) {
        if (isGlobalAdmin(user)) {
            return true;
        }
        if (isOrgAdmin(membership)) {
            return true;
        }
        return isManager(user) || isTutor(user);
    }

    public boolean canManageWorkspace(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        // Workspace OWNER/ADMIN can always manage their workspace regardless of org role
        if (isWorkspaceOwnerOrAdmin(workspace.getId(), user.getId())) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isEmpty()) {
            return false;
        }

        return isOrgAdmin(membership.get()) || isManager(user) || isTutorInAcademicOrganization(user, workspace.getOrganization());
    }

    public boolean canInviteOrAddMember(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        // Workspace OWNER/ADMIN can invite members
        if (isWorkspaceOwnerOrAdmin(workspace.getId(), user.getId())) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isEmpty()) {
            return false;
        }

        return isOrgAdmin(membership.get()) || isManager(user) || isTutor(user);
    }

    public boolean canEditOrRemoveWorkspaceMember(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        // Workspace OWNER/ADMIN can edit or remove members
        if (isWorkspaceOwnerOrAdmin(workspace.getId(), user.getId())) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isEmpty()) {
            return false;
        }

        return isOrgAdmin(membership.get()) || isTutorInAcademicOrganization(user, workspace.getOrganization());
    }

    public boolean canRemoveWorkspaceOwner(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isEmpty()) {
            return false;
        }

        return isOrgAdmin(membership.get());
    }

    public boolean canViewWorkspaceMembers(User user, Workspace workspace) {
        if (isGlobalAdmin(user)) {
            return true;
        }

        Optional<OrganizationMember> membership = findOrganizationMembership(user.getId(), workspace.getOrganization().getId());
        if (membership.isPresent() && (isOrgAdmin(membership.get()) || isTutorInAcademicOrganization(user, workspace.getOrganization()))) {
            return true;
        }

        return isWorkspaceMember(workspace.getId(), user.getId());
    }

    private Optional<OrganizationMember> findOrganizationMembership(Long userId, UUID orgId) {
        return organizationMemberRepository.findByOrganization_IdAndUserIdAndDeletedAtIsNull(orgId, userId);
    }

    private boolean isOrgAdmin(OrganizationMember membership) {
        if (membership == null || membership.getRole() == null) {
            return false;
        }

        return membership.getRole() == OrganizationMember.OrganizationRole.OWNER
            || membership.getRole() == OrganizationMember.OrganizationRole.ADMIN;
    }

    private boolean isManager(User user) {
        return user != null && user.getRole() == User.RoleName.MANAGER;
    }

    private boolean isTutor(User user) {
        return user != null && user.getRole() == User.RoleName.TUTOR;
    }

    private boolean isTutorInAcademicOrganization(User user, Organization organization) {
        if (!isTutor(user) || organization == null || organization.getOrgType() == null) {
            return false;
        }
        return organization.getOrgType() == Organization.OrgType.ACADEMIC;
    }

    private boolean isWorkspaceOwnerOrAdmin(UUID workspaceId, Long userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map(m -> m.getRole() == com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole.OWNER
                   || m.getRole() == com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole.ADMIN)
            .orElse(false);
    }
}
