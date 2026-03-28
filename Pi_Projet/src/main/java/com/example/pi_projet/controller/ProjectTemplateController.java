package com.example.pi_projet.controller;

import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.M2ValidationUtils;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.ProjectTemplateService;
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

@RestController
@RequestMapping("/api/project-templates")
@RequiredArgsConstructor
public class ProjectTemplateController {

    private final ProjectTemplateService projectTemplateService;

    /* ── Read ──────────────────────────────────────────────────── */

    @GetMapping
    public Page<ProjectTemplate> getAll(
            @RequestParam(required = false) Long createdBy,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 50) Pageable pageable,
            HttpServletRequest request) {

        requireCurrentUser(request);

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

    @GetMapping("/public")
    public Page<ProjectTemplate> getPublic(@PageableDefault(size = 20) Pageable pageable,
                                            HttpServletRequest request) {
        requireCurrentUser(request);
        return projectTemplateService.getPublicTemplates(pageable);
    }

    @GetMapping("/pending")
    public Page<ProjectTemplate> getPending(@PageableDefault(size = 50) Pageable pageable,
                                             HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        requireAdminRole(currentUser);
        return projectTemplateService.getByStatus(ProjectTemplate.TemplateStatus.PENDING_APPROVAL, pageable);
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
        String phasesJson   = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultPhasesJson") != null ? body.get("defaultPhasesJson").toString() : null, "Phases JSON");
        String rolesJson    = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultRolesJson") != null ? body.get("defaultRolesJson").toString() : null, "Roles JSON");
        String configJson   = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultProjectConfigJson") != null ? body.get("defaultProjectConfigJson").toString() : null, "Config JSON");

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
        if (rolesJson != null)    template.setDefaultRolesJson(rolesJson);
        if (configJson != null)   template.setDefaultProjectConfigJson(configJson);

        return projectTemplateService.createTemplate(template);
    }

    @PutMapping("/{id}")
    public ProjectTemplate update(@PathVariable UUID id,
                                   @RequestBody Map<String, Object> body,
                                   HttpServletRequest request) {
        requireCurrentUser(request);

        String name = M2ValidationUtils.requireTemplateName((String) body.get("name"));

        String phasesJson = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultPhasesJson") != null ? body.get("defaultPhasesJson").toString() : null, "Phases JSON");
        String rolesJson  = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultRolesJson") != null ? body.get("defaultRolesJson").toString() : null, "Roles JSON");
        String configJson = M2ValidationUtils.validateJsonIfPresent(
                body.get("defaultProjectConfigJson") != null ? body.get("defaultProjectConfigJson").toString() : null, "Config JSON");

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

    private void requireAdminRole(User user) {
        if (user.getRole() != User.RoleName.ADMIN && user.getRole() != User.RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Only ADMIN or SUPER_ADMIN can perform this action");
        }
    }
}
