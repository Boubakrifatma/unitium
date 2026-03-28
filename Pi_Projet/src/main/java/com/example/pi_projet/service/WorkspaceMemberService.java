package com.example.pi_projet.service;

import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashSet;
import java.util.Comparator;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceMemberService {

    private final WorkspaceMemberRepository memberRepo;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceService workspaceService;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final JdbcTemplate jdbcTemplate;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceQuotaHelper quotaHelper;

    private static final Set<WorkspaceRole> ENTERPRISE_VALID_INVITE_ROLES = Set.of(
        WorkspaceRole.MANAGER,
        WorkspaceRole.EMPLOYEE,
        WorkspaceRole.VIEWER,
        WorkspaceRole.ADMIN
    );

    private static final Set<WorkspaceRole> ACADEMIC_VALID_INVITE_ROLES = Set.of(
        WorkspaceRole.TA,
        WorkspaceRole.STUDENT,
        WorkspaceRole.VIEWER,
        WorkspaceRole.ADMIN
    );

    public List<WorkspaceMember> getAll(UUID workspaceId, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));
        if (!authorizationService.canViewWorkspaceMembers(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only workspace members or org admins can view members");
        }
        return memberRepo.findAllByWorkspaceId(workspaceId);
    }

    public List<Map<String, Object>> getAvailableMembers(UUID workspaceId, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);

        enforceInvitePermission(workspace, requesterId);

        return queryAvailableOrgMembers(workspace.getOrganization().getId(), workspaceId);
    }

    public Map<String, Object> getMemberCapacity(UUID workspaceId, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        UUID orgId = workspace.getOrganization().getId();
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (!authorizationService.canViewWorkspaceMembers(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only workspace members or org admins can view member capacity");
        }

        long currentMembers = countActiveMembers(workspaceId);
        long organizationMembers = organizationMemberRepository.countByOrganization_IdAndDeletedAtIsNull(orgId);
        int maxMembers = quotaHelper.getMaxMembersPerWorkspaceStub(orgId);
        long remainingMembers = Math.max(0L, (long) maxMembers - currentMembers);
        String planName = quotaHelper.getPlanNameStub(orgId);
        String orgType = resolveWorkspaceOrgType(workspace);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currentMembers", currentMembers);
        payload.put("organizationMembers", organizationMembers);
        payload.put("maxMembers", maxMembers);
        payload.put("remainingMembers", remainingMembers);
        payload.put("planName", planName);
        payload.put("orgType", orgType);
        return payload;
    }

    @Transactional
    public WorkspaceMember add(UUID workspaceId, Long userId, WorkspaceRole role, Long requesterId) {
        return addMember(workspaceId, userId, role == null ? null : role.name(), requesterId);
    }

    @Transactional
    public WorkspaceMember addMember(UUID workspaceId, Long targetUserId, String requestedRoleRaw, Long requesterId) {
        // 1) Workspace exists.
        Workspace workspace = workspaceService.getById(workspaceId);
        UUID orgId = workspace.getOrganization().getId();
        String orgType = resolveWorkspaceOrgType(workspace);

        // 2) Workspace must have available seats in current plan/subscription.
        long currentMembers = countActiveMembers(workspaceId);
        int maxMembers = quotaHelper.getMaxMembersPerWorkspaceStub(orgId);
        if (currentMembers >= maxMembers) {
            throw new Module2Exception(FORBIDDEN, "Workspace member limit reached for your plan");
        }

        WorkspaceRole requestedRole = parseRequestedRole(requestedRoleRaw, orgType);

        // 3) Permission check (priority order based).
        enforceInvitePermission(workspace, requesterId);

        // 4) Target user must belong to workspace organization.
        if (!isUserInOrganization(orgId, targetUserId)) {
            throw new Module2Exception(NOT_FOUND, "User is not part of this organization");
        }

        // 5) Target user must not already be active member.
        if (isAlreadyActiveWorkspaceMember(workspaceId, targetUserId)) {
            throw new Module2Exception(CONFLICT, "User is already a member of this workspace");
        }

        // 6) Role must be valid for org type.
        if (!isRoleValidForOrgType(orgType, requestedRole)) {
            throw new Module2Exception(VALIDATION, "Invalid role for this organization type");
        }

        // 7) ADMIN cannot be assigned via invite flow.
        if (requestedRole == WorkspaceRole.ADMIN) {
            throw new Module2Exception(FORBIDDEN, "Admin role cannot be assigned via invite");
        }

        User inviter = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "You don't have permission to invite members"));

        if (restoreSoftDeletedMembership(workspaceId, targetUserId, requestedRole, requesterId)) {
            WorkspaceMember restored = memberRepo.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> new Module2Exception(INTERNAL, "Failed to restore workspace membership"));
            writeAuditInline(requesterId, orgId, restored.getId(), targetUserId, requestedRole);
            return restored;
        }

        WorkspaceMember saved;
        try {
            saved = memberRepo.save(WorkspaceMember.builder()
                .workspace(workspace)
                .userId(targetUserId)
                .role(requestedRole)
                .invitedByUser(inviter)
                .joinedAt(Instant.now())
                .build());
        } catch (DataIntegrityViolationException ex) {
            throw new Module2Exception(CONFLICT, "User is already a member of this workspace");
        }

        writeAuditInline(requesterId, orgId, saved.getId(), targetUserId, requestedRole);
        return saved;
    }

    @Transactional
    public WorkspaceMember updateRole(UUID workspaceId, Long userId, WorkspaceRole newRole, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (requesterId.equals(userId)) {
            throw new Module2Exception(FORBIDDEN, "You cannot change your own workspace role.");
        }

        if (!authorizationService.canEditOrRemoveWorkspaceMember(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only org admin, global admin, or academic tutor can update member role.");
        }

        String orgType = resolveWorkspaceOrgType(workspace);
        if (!isRoleValidForOrgType(orgType, newRole)) {
            throw new Module2Exception(VALIDATION, "Invalid role for this organization type");
        }
        if (newRole == WorkspaceRole.ADMIN) {
            throw new Module2Exception(FORBIDDEN, "Admin role cannot be assigned via role update");
        }

        WorkspaceMember m = memberRepo.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Member not found"));
        m.setRole(newRole);
        return memberRepo.save(m);
    }

    @Transactional
    public WorkspaceMember transferOwner(UUID workspaceId, Long newOwnerId, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);

        WorkspaceMember currentOwnerMember = memberRepo.findByWorkspaceIdAndUserId(workspaceId, requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "You are not a member of this workspace"));

        if (currentOwnerMember.getRole() != WorkspaceRole.OWNER) {
            throw new Module2Exception(FORBIDDEN, "Only the current workspace owner can transfer ownership");
        }

        if (requesterId.equals(newOwnerId)) {
            throw new Module2Exception(VALIDATION, "New owner must be a different user");
        }

        WorkspaceMember newOwnerMember = memberRepo.findByWorkspaceIdAndUserId(workspaceId, newOwnerId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Target user is not a member of this workspace"));

        currentOwnerMember.setRole(WorkspaceRole.ADMIN);
        memberRepo.save(currentOwnerMember);

        newOwnerMember.setRole(WorkspaceRole.OWNER);
        return memberRepo.save(newOwnerMember);
    }

    @Transactional
    public void remove(UUID workspaceId, Long userId, Long requesterId) {
        Workspace workspace = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "Missing authenticated user context"));

        if (requesterId.equals(userId)) {
            throw new Module2Exception(FORBIDDEN, "You cannot unassign yourself from this workspace.");
        }

        if (!authorizationService.canInviteOrAddMember(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can remove members in this organization.");
        }

        WorkspaceMember m = memberRepo.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Member not found"));

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

    private void enforceInvitePermission(Workspace workspace, Long requesterId) {
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(FORBIDDEN, "You don't have permission to invite members"));

        if (!authorizationService.canInviteOrAddMember(requester, workspace)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can invite members in this organization");
        }
    }

    private List<Map<String, Object>> queryAvailableOrgMembers(UUID orgId, UUID workspaceId) {
        List<OrganizationMember> orgMembers = organizationMemberRepository
            .findAllByOrganization_IdAndDeletedAtIsNull(orgId);
        if (orgMembers.isEmpty()) {
            return List.of();
        }

        Set<Long> workspaceUserIds = memberRepo.findAllByWorkspaceId(workspaceId)
            .stream()
            .map(WorkspaceMember::getUserId)
            .collect(Collectors.toCollection(HashSet::new));

        List<OrganizationMember> candidates = orgMembers.stream()
            .filter(m -> m.getUserId() != null && !workspaceUserIds.contains(m.getUserId()))
            .toList();
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<Long, User> usersById = userRepo.findAllById(
                candidates.stream().map(OrganizationMember::getUserId).distinct().toList()
            )
            .stream()
            .collect(Collectors.toMap(User::getId, user -> user));

        return candidates.stream()
            .filter(m -> usersById.containsKey(m.getUserId()))
            .map(m -> {
                User u = usersById.get(m.getUserId());
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("userId", u.getId());
                row.put("fullName", u.getFullName());
                row.put("email", u.getEmail());
                row.put("avatarUrl", u.getAvatarUrl());
                row.put("orgRole", m.getRole() != null ? m.getRole().name() : null);
                return row;
            })
            .sorted(Comparator.comparing(
                row -> String.valueOf(row.getOrDefault("fullName", "")),
                String.CASE_INSENSITIVE_ORDER
            ))
            .toList();
    }

    private boolean isUserInOrganization(UUID orgId, Long userId) {
        return organizationMemberRepository.existsByOrganization_IdAndUserIdAndDeletedAtIsNull(orgId, userId);
    }

    private boolean isAlreadyActiveWorkspaceMember(UUID workspaceId, Long userId) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND deleted_at IS NULL",
            Integer.class,
            workspaceId.toString(),
            userId
        );
        return count != null && count > 0;
    }

    private long countActiveMembers(UUID workspaceId) {
        Long count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ? AND deleted_at IS NULL",
            Long.class,
            workspaceId.toString()
        );
        return count == null ? 0L : count;
    }

    private boolean restoreSoftDeletedMembership(UUID workspaceId,
                                                 Long userId,
                                                 WorkspaceRole role,
                                                 Long inviterId) {
        int updated = memberRepo.restoreSoftDeletedMember(
            workspaceId,
            userId,
            role.name(),
            inviterId
        );
        return updated > 0;
    }

    private boolean isRoleValidForOrgType(String orgType, WorkspaceRole role) {
        if ("academic".equalsIgnoreCase(orgType)) {
            return ACADEMIC_VALID_INVITE_ROLES.contains(role);
        }
        return ENTERPRISE_VALID_INVITE_ROLES.contains(role);
    }

    private WorkspaceRole parseRequestedRole(String requestedRoleRaw, String orgType) {
        if (!StringUtils.hasText(requestedRoleRaw)) {
            return defaultInviteRoleForOrgType(orgType);
        }
        try {
            return WorkspaceRole.valueOf(requestedRoleRaw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION, "Invalid role for this organization type");
        }
    }

    private WorkspaceRole defaultInviteRoleForOrgType(String orgType) {
        return "academic".equalsIgnoreCase(orgType) ? WorkspaceRole.STUDENT : WorkspaceRole.EMPLOYEE;
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        String raw = workspace.getOrgType();
        if (!StringUtils.hasText(raw) && workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            raw = workspace.getOrganization().getOrgType().name();
        }
        return StringUtils.hasText(raw) ? raw.trim().toLowerCase(Locale.ROOT) : "enterprise";
    }

    private void writeAuditInline(Long requesterId,
                                  UUID orgId,
                                  UUID workspaceMemberId,
                                  Long targetUserId,
                                  WorkspaceRole role) {
        try {
            String details = "{\"targetUserId\":" + targetUserId + ",\"role\":\"" + role.name() + "\"}";
            jdbcTemplate.update(
                "INSERT INTO audit_logs (user_id, org_id, action_type, entity_type, entity_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
                requesterId,
                orgId.toString(),
                "ADD_WORKSPACE_MEMBER",
                "workspace_member",
                workspaceMemberId.toString(),
                details
            );
        } catch (Exception ignored) {
            // Audit insert is non-blocking for business action.
        }
    }

}
