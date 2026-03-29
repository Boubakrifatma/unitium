package com.example.pi_projet.controller;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.Project.ProjectStatus;
import com.example.pi_projet.entity.Project.Visibility;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.ProjectMemberService;
import com.example.pi_projet.service.ProjectService;
import com.example.pi_projet.annotation.Authorized;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    @GetMapping
    public Page<Project> getAll(@PathVariable UUID workspaceId,
                                HttpServletRequest request,
                                @PageableDefault(size = 20) Pageable pageable) {
        User currentUser = requireCurrentUser(request);
        return projectService.getVisible(workspaceId, currentUser.getId(), pageable);
    }

    @GetMapping("/{projectId}")
    public Project getById(@PathVariable UUID workspaceId,
                           @PathVariable UUID projectId,
                           HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectService.getById(projectId, currentUser.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@PathVariable UUID workspaceId,
                          @RequestBody Map<String, Object> body,
                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String name = parseRequiredName(body.get("name"));
        LocalDate startDate = parseOptionalDate(body.get("startDate"), "startDate");
        LocalDate endDate   = parseOptionalDate(body.get("endDate"),   "endDate");
        validateDateRange(startDate, endDate);
        Visibility visibility = parseOptionalVisibility(body.get("visibility"));
        return projectService.create(workspaceId, name, (String) body.get("description"),
            visibility, startDate, endDate, currentUser.getId());
    }

    @PostMapping("/from-template/{templateId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Project createFromTemplate(@PathVariable UUID workspaceId,
                                      @PathVariable UUID templateId,
                                      @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String nameOverride = body.containsKey("name") ? (String) body.get("name") : null;
        LocalDate startDate = parseOptionalDate(body.get("startDate"), "startDate");
        LocalDate endDate   = parseOptionalDate(body.get("endDate"),   "endDate");
        validateDateRange(startDate, endDate);
        return projectService.createProjectFromTemplate(workspaceId, templateId, nameOverride, startDate, endDate, currentUser.getId());
    }

    @PutMapping("/{projectId}")
    public Project update(@PathVariable UUID workspaceId,
                          @PathVariable UUID projectId,
                          @RequestBody Map<String, Object> body,
                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String nameRaw = body.get("name") != null ? ((String) body.get("name")).trim() : null;
        if (nameRaw != null) {
            if (nameRaw.isBlank())       throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot be blank.");
            if (nameRaw.length() < 3)    throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name must be at least 3 characters.");
            if (nameRaw.length() > 150)  throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot exceed 150 characters.");
        }
        LocalDate startDate = parseOptionalDate(body.get("startDate"), "startDate");
        LocalDate endDate   = parseOptionalDate(body.get("endDate"),   "endDate");
        validateDateRange(startDate, endDate);
        Visibility visibility = body.get("visibility") != null ? parseOptionalVisibility(body.get("visibility")) : null;
        return projectService.update(projectId, nameRaw, (String) body.get("description"),
            visibility, startDate, endDate, currentUser.getId());
    }

    @PatchMapping("/{projectId}/status")
    public Project changeStatus(@PathVariable UUID workspaceId,
                                @PathVariable UUID projectId,
                                @RequestBody Map<String, String> body,
                                HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String statusRaw = body.get("status");
        if (statusRaw == null || statusRaw.isBlank())
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "status is required.");
        ProjectStatus status;
        try {
            status = ProjectStatus.valueOf(statusRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid status value: " + statusRaw);
        }
        return projectService.changeStatus(projectId, status, currentUser.getId());
    }

    @PatchMapping("/bulk-status")
    public List<Project> bulkChangeStatus(@PathVariable UUID workspaceId,
                                           @RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        Object idsRaw = body.get("projectIds");
        if (!(idsRaw instanceof List<?>)) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "projectIds must be a list");
        }
        List<UUID> projectIds = new java.util.ArrayList<>();
        for (Object item : (List<?>) idsRaw) {
            try {
                projectIds.add(UUID.fromString(item.toString()));
            } catch (IllegalArgumentException ex) {
                throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid UUID in projectIds: " + item);
            }
        }
        if (projectIds.isEmpty()) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "projectIds must not be empty");
        }

        String statusRaw = body.get("status") != null ? body.get("status").toString() : null;
        if (statusRaw == null || statusRaw.isBlank()) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "status is required");
        }
        ProjectStatus newStatus;
        try {
            newStatus = ProjectStatus.valueOf(statusRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid status: " + statusRaw);
        }

        return projectService.bulkChangeStatus(workspaceId, projectIds, newStatus, currentUser.getId());
    }

    @DeleteMapping("/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID workspaceId,
                       @PathVariable UUID projectId,
                       HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        projectService.delete(projectId, currentUser.getId());
    }

    @DeleteMapping("/{projectId}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hardDelete(@PathVariable UUID workspaceId,
                           @PathVariable UUID projectId,
                           HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        projectService.hardDelete(projectId, currentUser.getId());
    }


    // ── Project Members ───────────────────────────────────────

    @GetMapping("/{projectId}/members")
    public List<ProjectMember> getMembers(@PathVariable UUID workspaceId,
                                          @PathVariable UUID projectId,
                                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectMemberService.getAll(projectId, currentUser.getId());
    }

    @GetMapping("/{projectId}/available-members")
    public List<Map<String, Object>> getAvailableMembers(@PathVariable UUID workspaceId,
                                                          @PathVariable UUID projectId,
                                                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectMemberService.getAvailableWorkspaceMembers(workspaceId, projectId, currentUser.getId());
    }

    @PostMapping("/{projectId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectMember addMember(@PathVariable UUID workspaceId,
                                   @PathVariable UUID projectId,
                                   @RequestBody Map<String, String> body,
                                   HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String userIdRaw = body.get("userId");
        if (userIdRaw == null || userIdRaw.isBlank())
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "userId is required.");
        long userId;
        try { userId = Long.parseLong(userIdRaw.trim()); }
        catch (NumberFormatException ex) { throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "userId must be a valid number."); }

        String role = body.get("role");
        if (role == null || role.isBlank())
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "role is required.");

        return projectMemberService.add(projectId, userId, role.trim(), currentUser.getId());
    }

    @PatchMapping("/{projectId}/members/{userId}/role")
    public ProjectMember updateMemberRole(@PathVariable UUID workspaceId,
                                          @PathVariable UUID projectId,
                                          @PathVariable Long userId,
                                          @RequestBody Map<String, String> body,
                                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String role = body.get("role");
        if (role == null || role.isBlank())
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "role is required.");
        return projectMemberService.updateRole(projectId, userId, role.trim(), currentUser.getId());
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID workspaceId,
                             @PathVariable UUID projectId,
                             @PathVariable Long userId,
                             HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        projectMemberService.remove(projectId, userId, currentUser.getId());
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Missing authenticated user context");
        }
        return currentUser;
    }

    private String parseRequiredName(Object raw) {
        if (raw == null) throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name is required.");
        String name = raw.toString().trim();
        if (name.isBlank())    throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot be blank.");
        if (name.length() < 3) throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name must be at least 3 characters.");
        if (name.length() > 150) throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot exceed 150 characters.");
        return name;
    }

    private LocalDate parseOptionalDate(Object raw, String field) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isBlank()) return null;
        try {
            return LocalDate.parse(s);
        } catch (Exception ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid date format for " + field + ". Use YYYY-MM-DD.");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "End date must be on or after the start date.");
        }
    }

    private Visibility parseOptionalVisibility(Object raw) {
        if (raw == null) return Visibility.PUBLIC;
        try {
            return Visibility.valueOf(raw.toString().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Invalid visibility value. Use PUBLIC or PRIVATE.");
        }
    }
}
