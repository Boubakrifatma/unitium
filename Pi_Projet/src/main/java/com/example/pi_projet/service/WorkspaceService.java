package com.example.pi_projet.service;

import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;

import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.extern.slf4j.Slf4j;
import com.example.pi_projet.entity.Organization;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.util.StringUtils;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepo;
    private final WorkspaceMemberRepository memberRepo;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final JdbcTemplate jdbcTemplate;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceQuotaHelper quotaHelper;
    private final M2AuditLogService auditLogService;

    @PersistenceContext
    private EntityManager em;

    public List<Workspace> getVisibleForUser(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        Long userId = currentUser.getId();
        if (authorizationService.isGlobalAdmin(currentUser)) {
            return workspaceRepo.findAll();
        }

        OrganizationMember membership = authorizationService.requireSingleOrganizationMembership(userId);
        UUID orgId = membership.getOrganization().getId();

        if (authorizationService.canViewAllWorkspacesInOrganization(currentUser, membership)) {
            return workspaceRepo.findAllByOrganizationId(orgId);
        }

        return workspaceRepo.findAllByMemberUserIdAndOrganizationId(userId, orgId);
    }

    public Workspace getById(UUID id) {
        return workspaceRepo.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Workspace not found: " + id));
    }

    @Transactional
    public Workspace createWorkspaceForCurrentUser(User currentUser, String name, String slug, UUID requestedOrgId) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        Long currentUserId = currentUser.getId();
        if (!userRepo.existsById(currentUserId)) {
            throw new Module2Exception(NOT_FOUND, "Requester user not found");
        }

        String finalName = (name != null ? name.trim() : "");
        if (!StringUtils.hasText(finalName)) {
            throw new Module2Exception(VALIDATION, "Workspace name is required");
        }

        String normalizedSlug = normalizeSlug(slug);
        if (!StringUtils.hasText(normalizedSlug)) {
            normalizedSlug = normalizeSlug(finalName);
        }
        if (!StringUtils.hasText(normalizedSlug)) {
            throw new Module2Exception(VALIDATION, "Workspace slug is required");
        }

        UUID orgId = resolveTargetOrganizationIdForCreate(currentUser, requestedOrgId);
        String orgType = quotaHelper.getOrgTypeStub(orgId);

        long currentCount = quotaHelper.countActiveWorkspaces(orgId);
        int maxAllowed = quotaHelper.getMaxWorkspacesStub(orgId);
        if (currentCount >= maxAllowed) {
            throw new Module2Exception(FORBIDDEN, "Workspace limit reached for your plan");
        }

        if (!authorizationService.isGlobalAdmin(currentUser)) {
            OrganizationMember membership = authorizationService.requireOrganizationMembership(currentUser.getId(), orgId);
            if (!authorizationService.canCreateWorkspace(currentUser, membership)) {
                throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can create workspaces.");
            }
        }

        if (workspaceRepo.existsByNameIgnoreCaseAndOrganizationId(finalName, orgId)) {
            throw new Module2Exception(CONFLICT, "A workspace named '" + finalName + "' already exists in this organization");
        }

        if (workspaceRepo.existsBySlugAndOrganizationId(normalizedSlug, orgId)) {
            throw new Module2Exception(CONFLICT, "Workspace slug already exists for this organization");
        }

        Workspace ws = Workspace.builder()
            .id(UUID.nameUUIDFromBytes((orgId + ":" + normalizedSlug).getBytes(StandardCharsets.UTF_8)))
            .name(finalName)
            .slug(normalizedSlug)
            .ownerId(currentUserId)
            .orgType(orgType)
            .build();

        Organization orgRef = em.getReference(Organization.class, orgId);
        ws.setOrganization(orgRef);

        ws = workspaceRepo.save(ws);

        WorkspaceMember ownerMember = WorkspaceMember.builder()
            .workspace(ws)
            .userId(currentUserId)
            .role(WorkspaceRole.OWNER)
            .invitedByUser(null)
            .joinedAt(Instant.now())
            .build();
        memberRepo.save(ownerMember);

        writeAuditLog(currentUserId, orgId, "CREATE_WORKSPACE", "workspace", ws.getId().toString(), null);
        return ws;
    }

    @Transactional
    public Workspace update(UUID id, String name, String slug, User requester) {
        if (requester == null || requester.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        Workspace ws = getById(id);
        assertCanManageWorkspaceLikeCreatePolicy(requester, ws);

        String finalName = (name != null ? name.trim() : "");
        if (!StringUtils.hasText(finalName)) {
            throw new Module2Exception(VALIDATION, "Workspace name is required");
        }
        if (!finalName.equalsIgnoreCase(ws.getName())
                && workspaceRepo.existsByNameIgnoreCaseAndOrganizationId(finalName, ws.getOrganization().getId())) {
            throw new Module2Exception(CONFLICT, "A workspace named '" + finalName + "' already exists in this organization");
        }
        ws.setName(finalName);

        if (slug != null) {
            String normalizedSlug = normalizeSlug(slug);
            if (!StringUtils.hasText(normalizedSlug)) {
                throw new Module2Exception(VALIDATION, "Workspace slug is required");
            }
            // Slug is immutable — the workspace UUID is derived from orgId+slug, so changing
            // it would silently break the UUID semantics without migrating existing references.
            if (!normalizedSlug.equalsIgnoreCase(ws.getSlug())) {
                throw new Module2Exception(VALIDATION, "Workspace slug cannot be changed after creation");
            }
        }

        Workspace saved = workspaceRepo.save(ws);
        writeAuditLog(requester.getId(), ws.getOrganization().getId(), "UPDATE_WORKSPACE", "workspace", ws.getId().toString(), null);
        return saved;
    }

    @Transactional
    public void delete(UUID id, User requester, String confirmName) {
        if (requester == null || requester.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        Workspace ws = getById(id);
        String expectedName = ws.getName() == null ? "" : ws.getName().trim();
        String providedName = confirmName == null ? "" : confirmName.trim();
        if (!StringUtils.hasText(providedName) || !expectedName.equals(providedName)) {
            throw new Module2Exception(VALIDATION, "Confirmation name does not match workspace name");
        }

        assertCanManageWorkspaceLikeCreatePolicy(requester, ws);
        workspaceRepo.delete(ws);
        writeAuditLog(requester.getId(), ws.getOrganization().getId(), "DELETE_WORKSPACE", "workspace", ws.getId().toString(), null);
    }

    @Transactional
    public Workspace restore(UUID id, User requester) {
        if (requester == null || requester.getId() == null) {
            throw new Module2Exception(FORBIDDEN, "Missing authenticated user context");
        }

        Workspace ws = workspaceRepo.findAnyByIdNative(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Workspace not found: " + id));

        assertCanManageWorkspaceLikeCreatePolicy(requester, ws);

        int updated = workspaceRepo.restoreSoftDeletedById(id);
        if (updated <= 0) {
            throw new Module2Exception(INTERNAL, "Unable to restore workspace");
        }

        writeAuditLog(requester.getId(), ws.getOrganization().getId(), "RESTORE_WORKSPACE", "workspace", ws.getId().toString(), null);
        return getById(id);
    }

    public Workspace getByIdVisibleForUser(UUID id, User requester) {
        Workspace workspace = getById(id);
        if (!authorizationService.canViewWorkspace(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Requester is not allowed to view this workspace");
        }
        return workspace;
    }

    public Map<String, Object> getWorkspaceCapacity(UUID workspaceId, Long requesterId) {
        Workspace workspace = getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (!authorizationService.canViewWorkspace(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only workspace members or org admins can view workspace capacity");
        }

        UUID orgId = workspace.getOrganization().getId();
        long currentWorkspaces = quotaHelper.countActiveWorkspaces(orgId);
        int maxWorkspaces = quotaHelper.getMaxWorkspacesStub(orgId);
        long remainingWorkspaces = Math.max(0L, (long) maxWorkspaces - currentWorkspaces);
        String planName = quotaHelper.getPlanNameStub(orgId);
        String orgType = resolveWorkspaceOrgType(workspace);

        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("currentWorkspaces", currentWorkspaces);
        payload.put("maxWorkspaces", maxWorkspaces);
        payload.put("remainingWorkspaces", remainingWorkspaces);
        payload.put("planName", planName);
        payload.put("orgType", orgType);
        return payload;
    }

    public Map<String, Object> getWorkspaceProjectCapacity(UUID workspaceId, Long requesterId) {
        Workspace workspace = getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (!authorizationService.canViewWorkspace(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only workspace members or org admins can view project capacity");
        }

        Long currentActiveProjects = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM projects WHERE workspace_id = ? AND deleted_at IS NULL AND UPPER(status) = 'ACTIVE'",
            Long.class,
            workspaceId.toString()
        );

        long activeProjects = currentActiveProjects == null ? 0L : currentActiveProjects;
        UUID orgId = workspace.getOrganization().getId();
        int maxActiveProjects = quotaHelper.getMaxProjectsStub(orgId);
        long remainingActiveProjects = Math.max(0L, (long) maxActiveProjects - activeProjects);
        String planName = quotaHelper.getPlanNameStub(orgId);
        String orgType = resolveWorkspaceOrgType(workspace);

        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("currentActiveProjects", activeProjects);
        payload.put("maxActiveProjects", maxActiveProjects);
        payload.put("remainingActiveProjects", remainingActiveProjects);
        payload.put("planName", planName);
        payload.put("orgType", orgType);
        return payload;
    }

    @Transactional
    public WorkspaceMember addMember(UUID workspaceId, Long targetUserId, WorkspaceRole requestedRole, Long requesterId, String ipAddress) {
        Workspace ws = getById(workspaceId);
        User targetUser = userRepo.findById(targetUserId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "User to invite not found"));
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        // Target user must be member of the organization
        UUID orgId = ws.getOrganization().getId();
        long currentMembers = memberRepo.countByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        int maxMembers = quotaHelper.getMaxMembersPerWorkspaceStub(orgId);
        if (currentMembers >= maxMembers) {
            throw new Module2Exception(FORBIDDEN, "Workspace member limit reached for your plan");
        }

        try {
            if (!authorizationService.canInviteOrAddMember(requester, ws)) {
                throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can invite members.");
            }

            String targetOrgRole = resolveOrganizationRole(orgId, targetUserId);
            if (!StringUtils.hasText(targetOrgRole)) {
                throw new Module2Exception(NOT_FOUND, "User is not a member of this organization.");
            }

            // Not already in workspace
            if (memberRepo.existsByWorkspaceIdAndUserId(workspaceId, targetUserId)) {
                throw new Module2Exception(CONFLICT, "This user is already a member of this workspace");
            }

            // Role assignment based on org type and target user role.
            String orgType = quotaHelper.getOrgTypeStub(orgId);
            WorkspaceRole finalRole = resolveWorkspaceRoleForInvite(orgType, targetUser.getRole(), requestedRole);

            WorkspaceMember m = WorkspaceMember.builder()
                    .workspace(ws)
                    .userId(targetUserId)
                    .role(finalRole)
                    .invitedByUser(requester)
                    .joinedAt(Instant.now())
                    .build();
            var saved = memberRepo.save(m);

            writeAuditLog(requesterId, orgId, "ADD_WORKSPACE_MEMBER", "workspace_member", saved.getId().toString(), ipAddress);
            return saved;
        } catch (EmptyResultDataAccessException ex) {
            throw new Module2Exception(NOT_FOUND, "User is not a member of this organization.");
        }
    }

    @Transactional
    public void removeMember(UUID workspaceId, Long userId, Long requesterId) {
        Workspace workspace = getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (requesterId.equals(userId)) {
            throw new Module2Exception(FORBIDDEN, "You cannot unassign yourself from this workspace.");
        }

        if (!authorizationService.canInviteOrAddMember(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can remove members.");
        }

        WorkspaceMember m = memberRepo.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Workspace member not found"));

        if (m.getRole() == WorkspaceRole.OWNER) {
            if (!authorizationService.canRemoveWorkspaceOwner(requester, workspace)) {
                throw new Module2Exception(FORBIDDEN, "Only org owner/admin or global admin can remove workspace owners.");
            }

            long ownerCount = memberRepo.countByWorkspaceIdAndRole(workspaceId, WorkspaceRole.OWNER);
            if (ownerCount <= 1) {
                throw new Module2Exception(FORBIDDEN, "Cannot remove the last workspace owner.");
            }
        }

        memberRepo.delete(m);
    }

    // ── auth helpers used by all services ────────────────────

    public void requireRole(UUID workspaceId, Long userId, WorkspaceRole... allowed) {
        // TODO: implement role checks integrating with security layer
    }

    public boolean isMember(UUID workspaceId, Long userId) {
        return memberRepo.existsByWorkspaceIdAndUserId(workspaceId, userId);
    }

    private void writeAuditLog(Long userId, UUID orgId, String actionType, String entityType, String entityId, String ipAddress) {
        // Delegate to adapter which can be swapped for Module 1's AuditLogService later
        try {
            auditLogService.writeAudit(userId, orgId, actionType, entityType, entityId, ipAddress);
        } catch (Exception e) {
            log.warn("Audit write failed: {}", e.getMessage());
        }
    }

    private String resolveOrganizationRole(UUID orgId, Long userId) {
        return jdbcTemplate.queryForObject(
            "SELECT role FROM org_members WHERE organization_id = ? AND user_id = ? AND deleted_at IS NULL",
            String.class,
            orgId.toString(),
            userId
        );
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        String raw = workspace.getOrgType();
        if (!StringUtils.hasText(raw)
            && workspace.getOrganization() != null
            && workspace.getOrganization().getOrgType() != null) {
            raw = workspace.getOrganization().getOrgType().name();
        }
        return StringUtils.hasText(raw) ? raw.trim().toLowerCase(Locale.ROOT) : "enterprise";
    }

    private void assertCanManageWorkspaceLikeCreatePolicy(User requester, Workspace workspace) {
        if (!authorizationService.canManageWorkspace(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only org admin, owner, or academic tutor can manage this workspace");
        }
    }

    public boolean isGlobalAdmin(User currentUser) {
        return authorizationService.isGlobalAdmin(currentUser);
    }

    private UUID resolveTargetOrganizationIdForCreate(User currentUser, UUID requestedOrgId) {
        if (authorizationService.isGlobalAdmin(currentUser)) {
            if (requestedOrgId != null) {
                ensureOrganizationExists(requestedOrgId);
                return requestedOrgId;
            }

            try {
                return authorizationService.requireSingleOrganizationMembership(currentUser.getId()).getOrganization().getId();
            } catch (Module2Exception ex) {
                return resolveAnyOrganizationIdForGlobalAdmin();
            }
        }

        OrganizationMember membership = authorizationService.requireSingleOrganizationMembership(currentUser.getId());
        UUID membershipOrgId = membership.getOrganization().getId();
        if (requestedOrgId != null && !requestedOrgId.equals(membershipOrgId)) {
            throw new Module2Exception(FORBIDDEN, "You can create workspaces only inside your organization");
        }
        return membershipOrgId;
    }

    @Transactional
    public Workspace ensureDefaultWorkspaceForOrganization(UUID orgId, Long ownerUserId, String orgType) {
        String normalizedOrgType = StringUtils.hasText(orgType) ? orgType.trim().toLowerCase(Locale.ROOT) : "enterprise";
        String defaultName = "academic".equalsIgnoreCase(normalizedOrgType) ? "Default Course" : "Default Team";
        String defaultSlug = normalizeSlug(defaultName);

        List<Workspace> existing = workspaceRepo.findAllByOrganizationId(orgId);
        if (!existing.isEmpty()) {
            Workspace candidate = existing.get(0);
            boolean changed = false;

            boolean looksLikeSystemDefault = existing.size() == 1 && (
                "default-team".equalsIgnoreCase(candidate.getSlug())
                    || "default-course".equalsIgnoreCase(candidate.getSlug())
                    || "Default Team".equalsIgnoreCase(candidate.getName())
                    || "Default Course".equalsIgnoreCase(candidate.getName())
            );

            if (looksLikeSystemDefault && !defaultName.equals(candidate.getName())) {
                candidate.setName(defaultName);
                changed = true;
            }
            if (looksLikeSystemDefault && !defaultSlug.equals(candidate.getSlug())) {
                candidate.setSlug(defaultSlug);
                changed = true;
            }
            if (!normalizedOrgType.equalsIgnoreCase(candidate.getOrgType())) {
                candidate.setOrgType(normalizedOrgType);
                changed = true;
            }

            Workspace saved = changed ? workspaceRepo.save(candidate) : candidate;

            ensureOwnerMembership(saved, ownerUserId);

            return saved;
        }

        // Guard: skip default workspace creation if org is already at its quota
        long currentCount = quotaHelper.countActiveWorkspaces(orgId);
        int maxAllowed = quotaHelper.getMaxWorkspacesStub(orgId);
        if (currentCount >= maxAllowed) {
            log.warn("[Workspace] Skipping default workspace for org {} — quota reached ({}/{})", orgId, currentCount, maxAllowed);
            return null;
        }

        Workspace workspace = Workspace.builder()
            .id(UUID.nameUUIDFromBytes((orgId + ":" + defaultSlug).getBytes(StandardCharsets.UTF_8)))
            .name(defaultName)
            .slug(defaultSlug)
            .ownerId(ownerUserId)
            .orgType(normalizedOrgType)
            .build();
        workspace.setOrganization(em.getReference(Organization.class, orgId));
        Workspace saved = workspaceRepo.save(workspace);

        ensureOwnerMembership(saved, ownerUserId);

        return saved;
    }

    private void ensureOwnerMembership(Workspace workspace, Long ownerUserId) {
        var existing = memberRepo.findByWorkspaceIdAndUserId(workspace.getId(), ownerUserId);
        if (existing.isPresent()) {
            WorkspaceMember row = existing.get();
            boolean changed = false;
            if (row.getRole() != WorkspaceRole.OWNER) {
                row.setRole(WorkspaceRole.OWNER);
                changed = true;
            }
            if (row.getJoinedAt() == null) {
                row.setJoinedAt(Instant.now());
                changed = true;
            }
            if (changed) {
                memberRepo.save(row);
            }
            return;
        }

        if (memberRepo.restoreSoftDeletedMember(
            workspace.getId(),
            ownerUserId,
            WorkspaceRole.OWNER.name(),
            null
        ) > 0) {
            return;
        }

        try {
            memberRepo.save(WorkspaceMember.builder()
                .workspace(workspace)
                .userId(ownerUserId)
                .role(WorkspaceRole.OWNER)
                .joinedAt(Instant.now())
                .build());
        } catch (DataIntegrityViolationException ex) {
            if (memberRepo.existsByWorkspaceIdAndUserId(workspace.getId(), ownerUserId)) {
                return;
            }
            if (memberRepo.restoreSoftDeletedMember(
                workspace.getId(),
                ownerUserId,
                WorkspaceRole.OWNER.name(),
                null
            ) > 0) {
                return;
            }
            throw ex;
        }
    }

    private void ensureOrganizationExists(UUID orgId) {
        Organization organization = em.find(Organization.class, orgId);
        if (organization == null) {
            throw new Module2Exception(NOT_FOUND, "Organization not found: " + orgId);
        }
    }

    private UUID resolveAnyOrganizationIdForGlobalAdmin() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1");
        if (rows.isEmpty()) {
            throw new Module2Exception(NOT_FOUND, "No organization is available for workspace creation");
        }

        Object orgIdValue = rows.get(0).get("id");
        if (orgIdValue == null) {
            throw new Module2Exception(INTERNAL, "Organization row is missing id value");
        }

        return parseUuidValue(orgIdValue);
    }

    private boolean isOrganizationScopedRole(User.RoleName role) {
        if (role == null) {
            return false;
        }

        return role == User.RoleName.MANAGER
            || role == User.RoleName.EMPLOYEE
            || role == User.RoleName.VIEWER
            || role == User.RoleName.TUTOR
            || role == User.RoleName.STUDENT
            || role == User.RoleName.PRODUCT_OWNER;
    }

    private WorkspaceRole resolveWorkspaceRoleForInvite(String orgType,
                                                        User.RoleName targetUserRole,
                                                        WorkspaceRole requestedRole) {
        WorkspaceRole safeRequestedRole = requestedRole != null ? requestedRole : WorkspaceRole.MEMBER;
        User.RoleName safeUserRole = targetUserRole != null ? targetUserRole : User.RoleName.EMPLOYEE;

        if ("academic".equalsIgnoreCase(orgType)) {
            return switch (safeUserRole) {
                case TUTOR, ADMIN, SUPER_ADMIN -> WorkspaceRole.ADMIN;
                case MANAGER, PRODUCT_OWNER -> WorkspaceRole.MANAGER;
                case STUDENT -> WorkspaceRole.MEMBER;
                case VIEWER -> WorkspaceRole.VIEWER;
                default -> safeRequestedRole;
            };
        }

        if (safeRequestedRole == WorkspaceRole.ADMIN) {
            throw new Module2Exception(FORBIDDEN, "Cannot assign admin role via this endpoint.");
        }

        return switch (safeUserRole) {
            case MANAGER, ADMIN, SUPER_ADMIN -> WorkspaceRole.MANAGER;
            case VIEWER -> WorkspaceRole.VIEWER;
            default -> WorkspaceRole.MEMBER;
        };
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

    private UUID parseUuidValue(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }

        if (value instanceof byte[] bytes) {
            if (bytes.length != 16) {
                throw new Module2Exception(INTERNAL, "Invalid binary UUID value length for organization membership");
            }

            long mostSignificantBits = 0;
            long leastSignificantBits = 0;

            for (int i = 0; i < 8; i++) {
                mostSignificantBits = (mostSignificantBits << 8) | (bytes[i] & 0xffL);
            }
            for (int i = 8; i < 16; i++) {
                leastSignificantBits = (leastSignificantBits << 8) | (bytes[i] & 0xffL);
            }

            return new UUID(mostSignificantBits, leastSignificantBits);
        }

        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(INTERNAL, "Invalid UUID value in organization membership context");
        }
    }

}
