package com.example.pi_projet.controller;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2AdminService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin-only REST controller. Every endpoint calls requireAdminRole() before
 * executing — callers must be ADMIN or SUPER_ADMIN. Returns raw maps so no
 * new DTO classes are needed (cross-entity join results).
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class M2AdminController {

    private final M2AdminService m2AdminService;

    // ── Stats ──────────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public Map<String, Object> getStats(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.getStats(user);
    }

    // ── Workspaces ────────────────────────────────────────────────────────

    @GetMapping("/workspaces")
    public List<Map<String, Object>> getWorkspaces(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.getAdminWorkspaces(user);
    }

    @DeleteMapping("/workspaces/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWorkspace(@PathVariable UUID id, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        m2AdminService.adminSoftDeleteWorkspace(id, user);
    }

    @PostMapping("/workspaces/{id}/restore")
    public Map<String, Object> restoreWorkspace(@PathVariable UUID id, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.adminRestoreWorkspace(id, user);
    }

    // ── Projects ──────────────────────────────────────────────────────────

    @GetMapping("/projects")
    public List<Map<String, Object>> getProjects(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.getAdminProjects(user);
    }

    @PatchMapping("/projects/{id}/visibility")
    public Map<String, Object> toggleVisibility(@PathVariable UUID id, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.adminToggleProjectVisibility(id, user);
    }

    @DeleteMapping("/projects/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable UUID id, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        m2AdminService.adminSoftDeleteProject(id, user);
    }

    // ── Quota monitor ─────────────────────────────────────────────────────

    @GetMapping("/orgs/quota")
    public List<Map<String, Object>> getOrgQuota(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        requireAdminRole(user);
        return m2AdminService.getOrgQuotaSummary(user);
    }

    // ── Template ratings ──────────────────────────────────────────────────

    @GetMapping("/templates/ratings")
    public List<Map<String, Object>> getTemplateRatings(HttpServletRequest request) {
        requireAdminRole(requireCurrentUser(request));
        return m2AdminService.getTemplateRatings();
    }

    // ── Auth helpers ──────────────────────────────────────────────────────

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Missing authenticated user context");
        }
        return currentUser;
    }

    private void requireAdminRole(User user) {
        if (user.getRole() != User.RoleName.ADMIN && user.getRole() != User.RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Only ADMIN or SUPER_ADMIN can access the admin panel");
        }
    }
}
