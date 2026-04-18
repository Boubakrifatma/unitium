package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.Project.ProjectStatus;
import com.example.pi_projet.entity.Project.Visibility;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2AuditLogService;
import com.example.pi_projet.service.ProjectIntelligenceService;
import com.example.pi_projet.service.ProjectMemberService;
import com.example.pi_projet.service.ProjectService;
import com.example.pi_projet.service.TemplateStructureService;
import com.example.pi_projet.service.readme.ProjectReadmeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.util.DigestUtils;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project management endpoints")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;
    private final ProjectIntelligenceService projectIntelligenceService;
    private final TemplateStructureService templateStructureService;
    private final ProjectReadmeService projectReadmeService;
    private final M2AuditLogService auditLogService;

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

    @GetMapping("/{projectId}/health")
    public Map<String, Object> getProjectHealth(@PathVariable UUID workspaceId,
                                                @PathVariable UUID projectId,
                                                HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectService.getProjectHealth(workspaceId, projectId, currentUser.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@PathVariable UUID workspaceId,
                          @RequestBody Map<String, Object> body,
                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String name = parseRequiredName(body.get("name"));
        LocalDate startDate = parseOptionalDate(body.get("startDate"), "startDate");
        LocalDate endDate = parseOptionalDate(body.get("endDate"), "endDate");
        validateDateRange(startDate, endDate);
        Visibility visibility = parseOptionalVisibility(body.get("visibility"));
        String githubRepoUrl = parseOptionalRepoUrl(body.get("githubRepoUrl"));
        return projectService.create(workspaceId, name, (String) body.get("description"),
            visibility, startDate, endDate, githubRepoUrl, currentUser.getId());
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
        LocalDate endDate = parseOptionalDate(body.get("endDate"), "endDate");
        validateDateRange(startDate, endDate);

        String phasesOverrideJson = pickFirstJson(body,
            "phases",
            "phasesJson",
            "selectedPhases",
            "selectedPhasesJson",
            "defaultPhasesJson"
        );
        String milestonesOverrideJson = pickFirstJson(body,
            "milestones",
            "milestonesJson",
            "selectedMilestones",
            "selectedMilestonesJson",
            "defaultMilestonesJson"
        );
        String tasksOverrideJson = pickFirstJson(body,
            "tasks",
            "tasksJson",
            "selectedTasks",
            "selectedTasksJson",
            "defaultTasksJson"
        );

        return projectService.createProjectFromTemplate(
            workspaceId,
            templateId,
            nameOverride,
            startDate,
            endDate,
            currentUser.getId(),
            phasesOverrideJson,
            milestonesOverrideJson,
            tasksOverrideJson
        );
    }

    @PostMapping("/pib/bootstrap")
    public Map<String, Object> pibBootstrap(@PathVariable UUID workspaceId,
                                            @RequestBody Map<String, Object> body,
                                            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String inputType = body.get("input_type") != null ? body.get("input_type").toString() : "text";
        String description = body.get("description") != null ? body.get("description").toString() : null;
        String documentBase64 = body.get("document_base64") != null ? body.get("document_base64").toString() : null;
        String documentFilename = body.get("document_filename") != null ? body.get("document_filename").toString() : null;
        return projectIntelligenceService.bootstrapProject(
                workspaceId, inputType, description, documentBase64, documentFilename, currentUser.getId());
    }

    @GetMapping("/pib/status")
    public Map<String, Object> pibStatus(@PathVariable UUID workspaceId,
                                         HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectIntelligenceService.getMlServiceStatus(workspaceId, currentUser.getId());
    }

    @PostMapping("/pib/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    public Project pibConfirm(@PathVariable UUID workspaceId,
                              @RequestBody Map<String, Object> body,
                              HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectIntelligenceService.confirmProject(workspaceId, body, currentUser.getId());
    }

    @PutMapping("/{projectId}")
    public Project update(@PathVariable UUID workspaceId,
                          @PathVariable UUID projectId,
                          @RequestBody Map<String, Object> body,
                          HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        String nameRaw = body.get("name") != null ? ((String) body.get("name")).trim() : null;
        if (nameRaw != null) {
            if (nameRaw.isBlank())
                throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot be blank.");
            if (nameRaw.length() < 3)
                throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name must be at least 3 characters.");
            if (nameRaw.length() > 150)
                throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot exceed 150 characters.");
        }
        LocalDate startDate = parseOptionalDate(body.get("startDate"), "startDate");
        LocalDate endDate = parseOptionalDate(body.get("endDate"), "endDate");
        validateDateRange(startDate, endDate);
        Visibility visibility = body.get("visibility") != null ? parseOptionalVisibility(body.get("visibility")) : null;
        boolean githubRepoProvided = body.containsKey("githubRepoUrl");
        String githubRepoUrl = parseOptionalRepoUrl(body.get("githubRepoUrl"));
        return projectService.update(projectId, nameRaw, (String) body.get("description"),
            visibility, startDate, endDate, githubRepoProvided, githubRepoUrl, currentUser.getId());
    }

        @GetMapping("/{projectId}/repo-insights")
        public Map<String, Object> getProjectRepoInsights(@PathVariable UUID workspaceId,
                                  @PathVariable UUID projectId,
                                  HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectService.getProjectRepoInsights(workspaceId, projectId, currentUser.getId());
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
        List<UUID> projectIds = new ArrayList<>();
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

    @GetMapping(value = "/{projectId}/readme", produces = "text/markdown")
    public ResponseEntity<byte[]> downloadReadme(@PathVariable UUID workspaceId,
                                                 @PathVariable UUID projectId,
                                                 @RequestParam(defaultValue = "fast") String mode,
                                                 @RequestParam(defaultValue = "true") boolean download,
                                                 HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        ProjectReadmeService.GeneratedReadme generated =
            projectReadmeService.generate(workspaceId, projectId, currentUser.getId(), mode);

        byte[] payload = generated.markdown().getBytes(StandardCharsets.UTF_8);
        String eTag = "\"" + DigestUtils.md5DigestAsHex(payload) + "\"";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/markdown; charset=UTF-8"));
        headers.setETag(eTag);
        headers.setLastModified(generated.lastModified().toEpochMilli());
        headers.set("X-Readme-Mode", generated.mode());
        headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
            "Content-Disposition,ETag,Last-Modified,X-Readme-Mode");

        if (download) {
            headers.setContentDisposition(
                ContentDisposition.attachment().filename(generated.fileName()).build()
            );
        } else {
            headers.setContentDisposition(
                ContentDisposition.inline().filename(generated.fileName()).build()
            );
        }

        if (etagMatches(request.getHeader(HttpHeaders.IF_NONE_MATCH), eTag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).headers(headers).build();
        }

        if (generated.orgId() != null) {
            auditLogService.writeAudit(
                currentUser.getId(),
                generated.orgId(),
                "PROJECT_README_GENERATED",
                "project",
                projectId.toString(),
                generated.projectName(),
                workspaceId,
                request.getRemoteAddr()
            );
        }

        return ResponseEntity.ok()
            .headers(headers)
            .contentLength(payload.length)
            .body(payload);
    }

    // ── Project Members ───────────────────────────────────────────────────────

    @GetMapping("/{projectId}/members")
    public List<Map<String, Object>> getMembers(@PathVariable UUID workspaceId,
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
        try {
            userId = Long.parseLong(userIdRaw.trim());
        } catch (NumberFormatException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "userId must be a valid number.");
        }
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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
        if (name.isBlank())
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot be blank.");
        if (name.length() < 3)
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name must be at least 3 characters.");
        if (name.length() > 150)
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, "Project name cannot exceed 150 characters.");
        return name;
    }

    private LocalDate parseOptionalDate(Object raw, String field) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isBlank()) return null;
        try {
            return LocalDate.parse(s);
        } catch (Exception ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION,
                    "Invalid date format for " + field + ". Use YYYY-MM-DD.");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION,
                    "End date must be on or after the start date.");
        }
    }

    private Visibility parseOptionalVisibility(Object raw) {
        if (raw == null) return Visibility.PUBLIC;
        try {
            return Visibility.valueOf(raw.toString().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION,
                    "Invalid visibility value. Use PUBLIC or PRIVATE.");
        }
    }

    private String parseOptionalRepoUrl(Object raw) {
        if (raw == null) return null;
        String value = raw.toString().trim();
        return value.isBlank() ? null : value;
    }

    private String pickFirstJson(Map<String, Object> body, String... candidateKeys) {
        for (String key : candidateKeys) {
            if (!body.containsKey(key)) continue;
            String json = templateStructureService.toOptionalJson(body.get(key), key);
            if (json != null) return json;
        }
        return null;
    }

    private boolean etagMatches(String ifNoneMatch, String currentEtag) {
        if (ifNoneMatch == null || ifNoneMatch.isBlank()) {
            return false;
        }
        if (ifNoneMatch.contains("*")) {
            return true;
        }
        for (String token : ifNoneMatch.split(",")) {
            String normalized = token.trim();
            if (normalized.startsWith("W/")) {
                normalized = normalized.substring(2).trim();
            }
            if (normalized.equals(currentEtag)) {
                return true;
            }
        }
        return false;
    }
}
