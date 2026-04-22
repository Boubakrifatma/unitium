package com.example.pi_projet.service;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.OrganizationRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.CONFLICT;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

@Service
@RequiredArgsConstructor
public class M2OrganizationProvisioningService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceService workspaceService;
    private final M2OrganizationService m2OrganizationService;

    @Transactional
    public ProvisionedOrganization createOrganizationForCurrentUser(User currentUser,
                                                                    String name,
                                                                    String slug,
                                                                    String orgTypeValue) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new Module2Exception(VALIDATION, "Missing authenticated user context");
        }

        String finalName = StringUtils.trimWhitespace(name);
        if (!StringUtils.hasText(finalName)) {
            throw new Module2Exception(VALIDATION, "Organization name is required");
        }

        String finalSlug = normalizeSlug(slug);
        if (!StringUtils.hasText(finalSlug)) {
            finalSlug = normalizeSlug(finalName);
        }
        if (!StringUtils.hasText(finalSlug)) {
            throw new Module2Exception(VALIDATION, "Organization slug is required");
        }

        if (organizationRepository.findBySlug(finalSlug).isPresent()) {
            throw new Module2Exception(CONFLICT, "Organization slug already exists");
        }

        // One active organization membership per user is enforced by schema.
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
        if (!memberships.isEmpty()) {
            throw new Module2Exception(CONFLICT, "User already belongs to an organization");
        }

        Organization org = organizationRepository.save(
            Organization.builder()
                .name(finalName)
                .slug(finalSlug)
                .ownerId(currentUser.getId())
                .orgType(parseOrgType(orgTypeValue))
                .build()
        );

        // Business invariant: organization creation automatically provisions default workspace.
        Workspace defaultWorkspace = ensureDefaultWorkspaceForOrganization(org, currentUser);
        ensureOrganizationMember(org, currentUser, OrganizationMember.OrganizationRole.ADMIN, currentUser, false);
        if (defaultWorkspace != null) {
            ensureWorkspaceOwner(defaultWorkspace, currentUser.getId(), currentUser);
        }

        return new ProvisionedOrganization(org, defaultWorkspace, true);
    }

    @Transactional
    public ProvisionedOrganization ensureScenarioOrganization(String slug,
                                                              String name,
                                                              Organization.OrgType orgType,
                                                              User owner,
                                                              OrganizationMember.OrganizationRole ownerRole) {
        Organization organization = findOrganization(slug, name);
        boolean created = false;
        if (organization == null) {
            organization = organizationRepository.save(
                Organization.builder()
                    .name(name)
                    .slug(slug)
                    .ownerId(owner.getId())
                    .orgType(orgType)
                    .build()
            );
            created = true;
        }

        // For deterministic scenario setup, keep owner and org role aligned with target org.
        ensureOrganizationMember(organization, owner, ownerRole, owner, true);

        // Even when org already exists, ensure invariant remains true.
        Workspace defaultWorkspace = ensureDefaultWorkspaceForOrganization(organization, owner);
        if (defaultWorkspace != null) {
            ensureWorkspaceOwner(defaultWorkspace, owner.getId(), owner);
        }

        return new ProvisionedOrganization(organization, defaultWorkspace, created);
    }

    private Organization findOrganization(String slug, String name) {
        return organizationRepository.findBySlug(slug)
            .orElseGet(() -> organizationRepository.findAll().stream()
                .filter(org -> name.equalsIgnoreCase(org.getName()))
                .findFirst()
                .orElse(null));
    }

    private Workspace ensureDefaultWorkspaceForOrganization(Organization organization, User owner) {
        String orgType = m2OrganizationService.getOrgType(organization.getId());
        return workspaceService.ensureDefaultWorkspaceForOrganization(
            organization.getId(),
            owner.getId(),
            orgType
        );
    }

    private void ensureOrganizationMember(Organization organization,
                                          User user,
                                          OrganizationMember.OrganizationRole role,
                                          User inviter,
                                          boolean allowReassignAcrossOrganizations) {
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(user.getId());

        if (memberships.isEmpty()) {
            organizationMemberRepository.save(OrganizationMember.builder()
                .organization(organization)
                .userId(user.getId())
                .role(role)
                .invitedByUser(inviter)
                .build());
            return;
        }

        if (memberships.size() > 1) {
            throw new Module2Exception(CONFLICT, "User has multiple active organization memberships");
        }

        OrganizationMember membership = memberships.get(0);
        boolean changed = false;

        if (!organization.getId().equals(membership.getOrganization().getId())) {
            if (!allowReassignAcrossOrganizations) {
                throw new Module2Exception(CONFLICT, "User already belongs to another organization");
            }
            membership.setOrganization(organization);
            changed = true;
        }

        if (membership.getRole() != role) {
            membership.setRole(role);
            changed = true;
        }

        if (membership.getInvitedByUser() == null && inviter != null) {
            membership.setInvitedByUser(inviter);
            changed = true;
        }

        if (changed) {
            organizationMemberRepository.save(membership);
        }
    }

    private void ensureWorkspaceOwner(Workspace workspace, Long userId, User inviter) {
        var membership = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspace.getId(), userId);
        if (membership.isPresent()) {
            WorkspaceMember existing = membership.get();
            if (existing.getRole() != WorkspaceMember.WorkspaceRole.OWNER) {
                existing.setRole(WorkspaceMember.WorkspaceRole.OWNER);
                existing.setInvitedByUser(inviter);
                if (existing.getJoinedAt() == null) {
                    existing.setJoinedAt(Instant.now());
                }
                workspaceMemberRepository.save(existing);
            }
            return;
        }

        Long inviterId = inviter != null ? inviter.getId() : null;
        if (workspaceMemberRepository.restoreSoftDeletedMember(
            workspace.getId(),
            userId,
            WorkspaceMember.WorkspaceRole.OWNER.name(),
            inviterId
        ) > 0) {
            return;
        }

        try {
            workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .userId(userId)
                .role(WorkspaceMember.WorkspaceRole.OWNER)
                .invitedByUser(inviter)
                .joinedAt(Instant.now())
                .build());
        } catch (DataIntegrityViolationException ex) {
            if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), userId)) {
                return;
            }
            if (workspaceMemberRepository.restoreSoftDeletedMember(
                workspace.getId(),
                userId,
                WorkspaceMember.WorkspaceRole.OWNER.name(),
                inviterId
            ) > 0) {
                return;
            }
            throw ex;
        }
    }

    private Organization.OrgType parseOrgType(String orgTypeValue) {
        if (!StringUtils.hasText(orgTypeValue)) {
            return Organization.OrgType.ENTERPRISE;
        }

        String normalized = orgTypeValue.trim().toUpperCase(Locale.ROOT);
        try {
            return Organization.OrgType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION, "Invalid organization type. Allowed: ENTERPRISE, ACADEMIC");
        }
    }

    private String normalizeSlug(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String base = value.trim().toLowerCase(Locale.ROOT);
        base = base.replaceAll("[^a-z0-9]+", "-");
        base = base.replaceAll("^-+", "").replaceAll("-+$", "");
        return base;
    }

    public record ProvisionedOrganization(Organization organization, Workspace defaultWorkspace, boolean created) {
    }
}