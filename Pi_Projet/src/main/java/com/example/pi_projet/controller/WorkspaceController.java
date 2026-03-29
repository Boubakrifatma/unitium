package com.example.pi_projet.controller;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole;
import com.example.pi_projet.exception.M2ValidationUtils;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2AuditLogService;
import com.example.pi_projet.service.WorkspaceMemberService;
import com.example.pi_projet.service.WorkspaceService;
import com.example.pi_projet.annotation.Authorized;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/v1/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final WorkspaceMemberService memberService;
    private final M2AuditLogService auditLogService;

    @GetMapping
    public List<Workspace> getVisibleWorkspaces(HttpServletRequest request) {
        return workspaceService.getVisibleForUser(requireCurrentUser(request));
    }

    @GetMapping("/{id}")
    public Workspace getById(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return workspaceService.getByIdVisibleForUser(id, currentUser);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Workspace createWorkspace(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String name = parseRequiredWorkspaceName(body.get("name"));
        String slug = parseOptionalSlug(body.get("slug"));
        UUID organizationId = parseOptionalUuid(body.getOrDefault("organizationId", body.get("orgId")));
        return workspaceService.createWorkspaceForCurrentUser(currentUser, name, slug, organizationId);
    }

    @PutMapping("/{id}")
    public Workspace update(@PathVariable UUID id,
                            @RequestBody Map<String, String> body,
                            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String name = parseRequiredWorkspaceName(body.get("name"));
        String slug = parseOptionalSlug(body.get("slug"));
        return workspaceService.update(id, name, slug, currentUser);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @RequestBody(required = false) Map<String, String> body,
                       HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String confirmName = body == null ? null : body.get("confirmName");
        workspaceService.delete(id, currentUser, confirmName);
    }

    @PostMapping("/{id}/restore")
    public Workspace restore(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return workspaceService.restore(id, currentUser);
    }

    // ── Members ───────────────────────────────────────────────

    @GetMapping("/{id}/members")
    public List<WorkspaceMember> getMembers(@PathVariable UUID id,
                                            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return memberService.getAll(id, currentUser.getId());
    }

    @GetMapping("/{id}/available-members")
    public List<Map<String, Object>> getAvailableMembers(@PathVariable UUID id,
                                                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return memberService.getAvailableMembers(id, currentUser.getId());
    }

    @GetMapping("/{id}/members/capacity")
    public Map<String, Object> getMemberCapacity(@PathVariable UUID id,
                                                 HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return memberService.getMemberCapacity(id, currentUser.getId());
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceMember addMember(@PathVariable UUID id,
                                     @RequestBody Map<String, Object> body,
                                     HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        Long userId = parseRequiredUserId(body.get("userId"));
        Object roleValue = body.get("role");
        String roleRaw = roleValue == null ? null : String.valueOf(roleValue);

        return memberService.addMember(
            id,
            userId,
            roleRaw,
            currentUser.getId()
        );
    }

    @PatchMapping("/{id}/members/{userId}/role")
    public WorkspaceMember updateRole(@PathVariable UUID id,
                                      @PathVariable Long userId,
                                      @RequestBody Map<String, String> body,
                                      HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String roleRaw = body.get("role");
        if (roleRaw == null || roleRaw.isBlank()) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "role is required");
        }

        WorkspaceRole parsedRole;
        try {
            parsedRole = WorkspaceRole.valueOf(roleRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid role");
        }

        return memberService.updateRole(id, userId,
            parsedRole,
            currentUser.getId());
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID id,
                              @PathVariable Long userId,
                              HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        memberService.remove(id, userId, currentUser.getId());
    }

    // ── Activity Log ──────────────────────────────────────────

    @GetMapping("/{id}/activity")
    public List<Map<String, Object>> getActivity(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "30") int limit,
            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        Workspace workspace = workspaceService.getByIdVisibleForUser(id, currentUser);
        UUID orgId = workspace.getOrganization() != null ? workspace.getOrganization().getId() : null;
        if (orgId == null) return List.of();
        return auditLogService.fetchWorkspaceLogs(orgId, id, Math.min(limit, 100));
    }

    @PatchMapping("/{id}/transfer-owner")
    public WorkspaceMember transferOwner(@PathVariable UUID id,
                                         @RequestBody Map<String, Object> body,
                                         HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        Long newOwnerId = M2ValidationUtils.requireLong(body.get("newOwnerId"), "newOwnerId");
        return memberService.transferOwner(id, newOwnerId, currentUser.getId());
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Missing authenticated user context");
        }
        return currentUser;
    }

    private String parseRequiredWorkspaceName(String value) {
        return M2ValidationUtils.requireLength(value, 3, 100, "Workspace name");
    }

    private String parseOptionalSlug(String value) {
        return M2ValidationUtils.validateSlug(value);
    }

    private UUID parseOptionalUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid organizationId UUID format.");
        }
    }

    private Long parseRequiredUserId(Object value) {
        return M2ValidationUtils.requireLong(value, "userId");
    }
}
