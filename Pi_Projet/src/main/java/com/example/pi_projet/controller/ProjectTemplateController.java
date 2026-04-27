package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.exception.M2ValidationUtils;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.M2PublicIntegrationService;
import com.example.pi_projet.service.ProjectTemplateService;
import com.example.pi_projet.service.TemplateStructureService;
import com.example.pi_projet.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

@Authorized
@RestController
@RequestMapping("/api/project-templates")
@RequiredArgsConstructor
public class ProjectTemplateController {

    private final ProjectTemplateService projectTemplateService;
    private final TemplateStructureService templateStructureService;
    private final WorkspaceService workspaceService;
    private final M2PublicIntegrationService publicIntegrationService;

    /* ── Read ──────────────────────────────────────────────────── */

    @GetMapping
    public Page<ProjectTemplate> getAll(
            @RequestParam(required = false) Long createdBy,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String difficulty,
            @PageableDefault(size = 50) Pageable pageable,
            HttpServletRequest request) {

        requireCurrentUser(request);

        // If any search/filter param present → use the combined search query
        if (search != null || type != null || difficulty != null) {
            return projectTemplateService.search(search, type, status, difficulty, null, pageable);
        }

        if (createdBy != null) return projectTemplateService.getByCreatedBy(createdBy, pageable);

        if (status != null) {
            ProjectTemplate.TemplateStatus parsedStatus =
                M2ValidationUtils.requireEnum(status, ProjectTemplate.TemplateStatus.class, "status");
            return projectTemplateService.getByStatus(parsedStatus, pageable);
        }

        return projectTemplateService.getAll(pageable);
    }

    @GetMapping("/{id}")
    public Optional<ProjectTemplate> getById(@PathVariable UUID id, HttpServletRequest request) {
        requireCurrentUser(request);
        return projectTemplateService.getById(id);
    }

    @GetMapping("/{id}/lineage")
    public ProjectTemplateService.LineageNode getLineage(@PathVariable UUID id,
                                                         @RequestParam(defaultValue = "3") int maxDepth,
                                                         HttpServletRequest request) {
        requireCurrentUser(request);
        return projectTemplateService.getLineage(id, maxDepth);
    }

    @GetMapping("/public")
    public Page<ProjectTemplate> getPublic(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String difficulty,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {
        requireCurrentUser(request);
        if (search != null || type != null || difficulty != null) {
            return projectTemplateService.search(search, type,
                ProjectTemplate.TemplateStatus.APPROVED.name(), difficulty, true, pageable);
        }
        return projectTemplateService.getPublicTemplates(pageable);
    }

    @GetMapping("/my-favorites")
    public Page<ProjectTemplate> getMyFavorites(@PageableDefault(size = 50) Pageable pageable,
                                                  HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireFavoritePermission(currentUser);
        return projectTemplateService.getMyFavorites(currentUser.getId(), pageable);
    }

    @GetMapping("/pending")
    public Page<ProjectTemplate> getPending(@PageableDefault(size = 50) Pageable pageable,
                                             HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        return projectTemplateService.getByStatus(ProjectTemplate.TemplateStatus.PENDING_APPROVAL, pageable);
    }

    @GetMapping("/recommendations")
    public Map<String, Object> getRecommendations(
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String projectType,
            @RequestParam(required = false) String difficulty,
            @RequestParam(defaultValue = "10") Integer limit,
            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        String workspaceOrgType = null;
        if (workspaceId != null) {
            Workspace workspace = workspaceService.getByIdVisibleForUser(workspaceId, currentUser);
            if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
                workspaceOrgType = workspace.getOrgType();
            } else if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
                workspaceOrgType = workspace.getOrganization().getOrgType().name();
            }
        }

        return projectTemplateService.getRecommendations(
            currentUser.getId(),
            projectType,
            difficulty,
            workspaceOrgType,
            limit
        );
    }

    @GetMapping("/{id}/analytics")
    public Map<String, Object> getTemplateAnalytics(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        ProjectTemplate template = projectTemplateService.getById(id)
            .orElseThrow(() -> new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, "Template not found"));

        boolean isAdmin = currentUser.getRole() == User.RoleName.ADMIN || currentUser.getRole() == User.RoleName.SUPER_ADMIN;
        boolean isOwner = template.getCreatedBy() != null && template.getCreatedBy().equals(currentUser.getId());
        boolean publicApproved = Boolean.TRUE.equals(template.getIsPublic())
            && template.getStatus() == ProjectTemplate.TemplateStatus.APPROVED;

        if (!publicApproved && !isOwner && !isAdmin) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "You are not allowed to view analytics for this template");
        }

        return projectTemplateService.getTemplateAnalytics(id, currentUser.getId());
    }

    @GetMapping("/cover-suggestions")
    public Map<String, Object> getCoverSuggestions(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "12") Integer pageSize,
            HttpServletRequest request) {
        requireCurrentUser(request);
        if (query == null || query.trim().isEmpty()) {
            throw new Module2Exception(VALIDATION, "q is required");
        }
        return publicIntegrationService.getTemplateCoverSuggestions(query.trim(), pageSize == null ? 12 : pageSize);
    }

    @GetMapping("/academic-sources")
    public Map<String, Object> getAcademicSources(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "8") Integer perPage,
            @RequestParam(required = false) UUID workspaceId,
            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        if (query == null || query.trim().isEmpty()) {
            throw new Module2Exception(VALIDATION, "q is required");
        }

        if (workspaceId != null) {
            Workspace workspace = workspaceService.getByIdVisibleForUser(workspaceId, currentUser);
            String orgType = workspace.getOrgType();
            if ((orgType == null || orgType.isBlank())
                && workspace.getOrganization() != null
                && workspace.getOrganization().getOrgType() != null) {
                orgType = workspace.getOrganization().getOrgType().name();
            }

            if (orgType == null || !"ACADEMIC".equalsIgnoreCase(orgType)) {
                throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Academic source pack is only available for academic workspaces");
            }
        }

        return publicIntegrationService.getAcademicSources(query.trim(), perPage == null ? 8 : perPage);
    }

    /* ── Write ─────────────────────────────────────────────────── */

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectTemplate create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        String name         = M2ValidationUtils.requireTemplateName((String) body.get("name"));
        String typeRaw      = body.get("templateType") != null ? body.get("templateType").toString() : null;
        String descRaw      = body.get("useCaseDescription") != null ? body.get("useCaseDescription").toString() : null;
        String tagsRaw      = body.get("tags") != null ? body.get("tags").toString() : null;
        String previewUrl   = body.get("previewImageUrl") != null ? body.get("previewImageUrl").toString() : null;
        String phasesJsonRaw = templateStructureService.toOptionalJson(body.get("defaultPhasesJson"), "defaultPhasesJson");
        String milestonesJsonRaw = templateStructureService.toOptionalJson(body.get("defaultMilestonesJson"), "defaultMilestonesJson");
        String tasksJsonRaw = templateStructureService.toOptionalJson(body.get("defaultTasksJson"), "defaultTasksJson");
        TemplateStructureService.NormalizedTemplateStructure normalizedStructure =
            templateStructureService.normalizeTemplateStructure(phasesJsonRaw, milestonesJsonRaw, tasksJsonRaw, "Template structure");

        String phasesJson = normalizedStructure.phasesJson();
        String milestonesJson = normalizedStructure.milestonesJson();
        String tasksJson = normalizedStructure.tasksJson();
        String rolesJson    = M2ValidationUtils.validateJsonIfPresent(
            templateStructureService.toOptionalJson(body.get("defaultRolesJson"), "defaultRolesJson"), "Roles JSON");
        String configJson   = M2ValidationUtils.validateJsonIfPresent(
            templateStructureService.toOptionalJson(body.get("defaultProjectConfigJson"), "defaultProjectConfigJson"), "Config JSON");

        Integer durationDays = null;
        if (body.get("estimatedDurationDays") != null) {
            durationDays = M2ValidationUtils.requireIntRange(
                body.get("estimatedDurationDays"), 1, 3650, "estimatedDurationDays");
        }

        ProjectTemplate template = new ProjectTemplate();
        template.setName(name);
        template.setCreatedBy(currentUser.getId());

        if (typeRaw != null && !typeRaw.isBlank()) {
            template.setTemplateType(
                M2ValidationUtils.parseEnum(typeRaw, ProjectTemplate.TemplateType.class, "templateType"));
        }
        if (body.get("estimatedEffort") != null) {
            template.setEstimatedEffort(
                M2ValidationUtils.parseEnum(body.get("estimatedEffort").toString(),
                    ProjectTemplate.EstimatedEffort.class, "estimatedEffort"));
        }
        if (body.get("difficultyLevel") != null) {
            template.setDifficultyLevel(
                M2ValidationUtils.parseEnum(body.get("difficultyLevel").toString(),
                    ProjectTemplate.DifficultyLevel.class, "difficultyLevel"));
        }
        if (body.get("teamStrategy") != null) {
            template.setTeamStrategy(
                M2ValidationUtils.parseEnum(body.get("teamStrategy").toString(),
                    ProjectTemplate.TeamStrategy.class, "teamStrategy"));
        }
        if (descRaw != null)      template.setUseCaseDescription(M2ValidationUtils.limitLength(descRaw, 2000, "Use case description"));
        if (tagsRaw != null)      template.setTags(M2ValidationUtils.limitLength(tagsRaw, 500, "Tags"));
        if (previewUrl != null)   template.setPreviewImageUrl(previewUrl.trim());
        if (durationDays != null) template.setEstimatedDurationDays(durationDays);
        if (phasesJson != null)   template.setDefaultPhasesJson(phasesJson);
        if (milestonesJson != null) template.setDefaultMilestonesJson(milestonesJson);
        if (tasksJson != null)      template.setDefaultTasksJson(tasksJson);
        if (rolesJson != null)    template.setDefaultRolesJson(rolesJson);
        if (configJson != null)   template.setDefaultProjectConfigJson(configJson);

        return projectTemplateService.createTemplate(template);
    }

    @PutMapping("/{id}")
    public ProjectTemplate update(@PathVariable UUID id,
                                   @RequestBody Map<String, Object> body,
                                   HttpServletRequest request) {
        requireCurrentUser(request);
        ProjectTemplate existing = projectTemplateService.getById(id)
            .orElseThrow(() -> new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, "Template not found"));

        String name = M2ValidationUtils.requireTemplateName((String) body.get("name"));

        boolean phasesProvided = body.containsKey("defaultPhasesJson");
        boolean milestonesProvided = body.containsKey("defaultMilestonesJson");
        boolean tasksProvided = body.containsKey("defaultTasksJson");

        String phasesCandidate = phasesProvided
            ? templateStructureService.toOptionalJson(body.get("defaultPhasesJson"), "defaultPhasesJson")
            : existing.getDefaultPhasesJson();
        String milestonesCandidate = milestonesProvided
            ? templateStructureService.toOptionalJson(body.get("defaultMilestonesJson"), "defaultMilestonesJson")
            : existing.getDefaultMilestonesJson();
        String tasksCandidate = tasksProvided
            ? templateStructureService.toOptionalJson(body.get("defaultTasksJson"), "defaultTasksJson")
            : existing.getDefaultTasksJson();

        TemplateStructureService.NormalizedTemplateStructure normalizedStructure =
            templateStructureService.normalizeTemplateStructure(
                phasesCandidate,
                milestonesCandidate,
                tasksCandidate,
                "Template structure"
            );

        String phasesJson = phasesProvided ? normalizedStructure.phasesJson() : null;
        String milestonesJson = milestonesProvided ? normalizedStructure.milestonesJson() : null;
        String tasksJson = tasksProvided ? normalizedStructure.tasksJson() : null;
        String rolesJson  = M2ValidationUtils.validateJsonIfPresent(
                templateStructureService.toOptionalJson(body.get("defaultRolesJson"), "defaultRolesJson"), "Roles JSON");
        String configJson = M2ValidationUtils.validateJsonIfPresent(
                templateStructureService.toOptionalJson(body.get("defaultProjectConfigJson"), "defaultProjectConfigJson"), "Config JSON");

        Integer durationDays = null;
        if (body.get("estimatedDurationDays") != null) {
            durationDays = M2ValidationUtils.requireIntRange(
                body.get("estimatedDurationDays"), 1, 3650, "estimatedDurationDays");
        }

        ProjectTemplate patch = new ProjectTemplate();
        patch.setName(name);

        if (body.get("templateType") != null) {
            patch.setTemplateType(M2ValidationUtils.parseEnum(
                body.get("templateType").toString(), ProjectTemplate.TemplateType.class, "templateType"));
        }
        if (body.get("estimatedEffort") != null) {
            patch.setEstimatedEffort(M2ValidationUtils.parseEnum(
                body.get("estimatedEffort").toString(), ProjectTemplate.EstimatedEffort.class, "estimatedEffort"));
        }
        if (body.get("difficultyLevel") != null) {
            patch.setDifficultyLevel(M2ValidationUtils.parseEnum(
                body.get("difficultyLevel").toString(), ProjectTemplate.DifficultyLevel.class, "difficultyLevel"));
        }
        if (body.get("teamStrategy") != null) {
            patch.setTeamStrategy(M2ValidationUtils.parseEnum(
                body.get("teamStrategy").toString(), ProjectTemplate.TeamStrategy.class, "teamStrategy"));
        }
        if (body.get("useCaseDescription") != null) {
            patch.setUseCaseDescription(
                M2ValidationUtils.limitLength(body.get("useCaseDescription").toString(), 2000, "Use case description"));
        }
        if (body.get("tags") != null) {
            patch.setTags(M2ValidationUtils.limitLength(body.get("tags").toString(), 500, "Tags"));
        }
        if (durationDays != null) patch.setEstimatedDurationDays(durationDays);
        if (phasesJson != null)   patch.setDefaultPhasesJson(phasesJson);
        if (milestonesJson != null) patch.setDefaultMilestonesJson(milestonesJson);
        if (tasksJson != null)      patch.setDefaultTasksJson(tasksJson);
        if (rolesJson != null)    patch.setDefaultRolesJson(rolesJson);
        if (configJson != null)   patch.setDefaultProjectConfigJson(configJson);

        return projectTemplateService.update(id, patch);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, HttpServletRequest request) {
        requireCurrentUser(request);
        projectTemplateService.delete(id);
    }

    /* ── Lifecycle ─────────────────────────────────────────────── */

    @PostMapping("/{id}/publish")
    public ProjectTemplate publish(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectTemplateService.publishTemplate(id, currentUser.getId());
    }

    @PatchMapping("/{id}/approve")
    public ProjectTemplate approve(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        return projectTemplateService.approveTemplate(id, currentUser.getId());
    }

    @PatchMapping("/{id}/reject")
    public ProjectTemplate reject(@PathVariable UUID id,
                                   @RequestBody Map<String, Object> body,
                                   HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        String reason = M2ValidationUtils.requireNonBlank(
            body.get("reason") != null ? body.get("reason").toString() : null, "Rejection reason");
        return projectTemplateService.rejectTemplate(id, currentUser.getId(), reason);
    }

    /* ── Community ─────────────────────────────────────────────── */

    @PostMapping("/{id}/rate")
    public ProjectTemplate rate(@PathVariable UUID id,
                                 @RequestBody Map<String, Object> body,
                                 HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        int rating = M2ValidationUtils.requireIntRange(body.get("rating"), 1, 5, "rating");
        return projectTemplateService.rateTemplate(id, rating, currentUser.getId());
    }

    /* ── Admin signals ─────────────────────────────────────────── */

    @PatchMapping("/{id}/feature")
    public ProjectTemplate setFeatured(@PathVariable UUID id,
                                        @RequestBody Map<String, Object> body,
                                        HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        boolean featured = Boolean.parseBoolean(body.getOrDefault("featured", false).toString());
        return projectTemplateService.featureTemplate(id, featured);
    }

    @PatchMapping("/{id}/trending")
    public ProjectTemplate setTrending(@PathVariable UUID id,
                                        @RequestBody Map<String, Object> body,
                                        HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        boolean trending = Boolean.parseBoolean(body.getOrDefault("trending", false).toString());
        return projectTemplateService.trendingTemplate(id, trending);
    }

    @PatchMapping("/{id}/recommend")
    public ProjectTemplate setRecommended(@PathVariable UUID id,
                                           @RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        boolean recommended = Boolean.parseBoolean(body.getOrDefault("recommended", false).toString());
        return projectTemplateService.recommendTemplate(id, recommended);
    }

    /* ── Favorites ─────────────────────────────────────────────── */

    @PostMapping("/{id}/favorite")
    public Map<String, Object> toggleFavorite(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireFavoritePermission(currentUser);
        return projectTemplateService.toggleFavorite(id, currentUser.getId());
    }

    @GetMapping("/{id}/favorite/status")
    public Map<String, Object> getFavoriteStatus(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireFavoritePermission(currentUser);
        return projectTemplateService.getFavoriteStatus(id, currentUser.getId());
    }

    /* ── Fork ──────────────────────────────────────────────────── */

    @PostMapping("/{id}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectTemplate fork(@PathVariable UUID id, HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return projectTemplateService.forkTemplate(id, currentUser.getId());
    }

    /* ── Auth helpers ──────────────────────────────────────────── */

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Missing authenticated user context");
        }
        return currentUser;
    }

    private void requireFavoritePermission(User user) {
        User.RoleName role = user.getRole();
        if (role != User.RoleName.TUTOR && role != User.RoleName.MANAGER) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Only tutors and managers can favorite templates");
        }
    }

    private void requireAdminRole(User user) {
        if (user.getRole() != User.RoleName.ADMIN && user.getRole() != User.RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Only ADMIN or SUPER_ADMIN can perform this action");
        }
    }
}
