package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.Project.ProjectStatus;
import com.example.pi_projet.entity.Project.Visibility;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectMember.ProjectRole;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.service.ProjectTemplateService;
import com.example.pi_projet.service.ProjectMemberService;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {
    private static final Pattern GITHUB_OWNER_REPO_PATTERN = Pattern.compile("^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$");
    private static final Pattern GITHUB_URL_PATTERN = Pattern.compile("^https?://(?:www\\.)?github\\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)(?:/.*)?$");

    private Project findOrThrow(UUID id) {
        return projectRepo.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found: " + id));
    }

    /** No-auth overload used by internal services (TaskService, MilestoneController). */
    public Project getById(UUID projectId) {
        return findOrThrow(projectId);
    }

    /** Recalculates project status based on task completion — called by TaskService. */
    @Transactional
    public void updateStatusFromTasks(UUID projectId) {
        // lightweight no-op hook: status recalculation is optional for now
        // future: query TaskRepository to compute % complete and update project status
    }

    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository projectMemberRepo;
    private final WorkspaceService workspaceService;
    private final ProjectTemplateService templateService;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final WorkspaceQuotaHelper quotaHelper;
    private final ProjectAuthorizationService projectAuthorizationService;
    private final ProjectRoleMapper projectRoleMapper;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final TemplateStructureService templateStructureService;
    private final M2AuditLogService auditLogService;
    private final M2PublicIntegrationService publicIntegrationService;

    public Page<Project> getVisible(UUID workspaceId, Long userId, Pageable pageable) {
        if (!userRepo.existsById(userId)) {
            throw new Module2Exception(NOT_FOUND, "Requester user not found");
        }

        User requester = userRepo.findById(userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        workspaceService.getById(workspaceId);
        if (!isGlobalAdminRole(requester.getRole()) && !workspaceService.isMember(workspaceId, userId)) {
            throw new Module2Exception(FORBIDDEN, "Requester is not a workspace member");
        }

        return projectRepo.findVisibleToUser(workspaceId, userId, pageable);
    }

    public Project getById(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        if (!projectMemberRepo.existsByProjectIdAndUserId(projectId, requesterId)
            && !projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Requester is not a project member");
        }
        return p;
    }

    public Map<String, Object> getProjectHealth(UUID workspaceId, UUID projectId, Long requesterId) {
        Project project = getById(projectId, requesterId);
        if (!project.getWorkspace().getId().equals(workspaceId)) {
            throw new Module2Exception(NOT_FOUND, "Project not found in this workspace");
        }

        Workspace workspace = project.getWorkspace();
        UUID orgId = workspace.getOrganization() != null ? workspace.getOrganization().getId() : null;

        long memberCount = projectMemberRepo.findAllByProjectId(projectId).size();
        long projectAgeDays = Math.max(1L, daysSince(project.getCreatedAt()));
        Instant statusRef = project.getUpdatedAt() != null ? project.getUpdatedAt() : project.getCreatedAt();
        long statusAgeDays = Math.max(0L, daysSince(statusRef));

        LocalDate today = LocalDate.now();
        Long daysToDeadline = project.getEndDate() == null ? null : ChronoUnit.DAYS.between(today, project.getEndDate());
        boolean terminalStatus = project.getStatus() == ProjectStatus.COMPLETED
            || project.getStatus() == ProjectStatus.CANCELLED
            || project.getStatus() == ProjectStatus.ARCHIVED;
        boolean overdue = daysToDeadline != null && daysToDeadline < 0 && !terminalStatus;

        long eventsLast14d = orgId == null
            ? 0L
            : auditLogService.countProjectEventsSince(orgId, projectId, Instant.now().minus(14, ChronoUnit.DAYS));

        long activeProjectsOrg = orgId == null ? 0L : quotaHelper.countActiveProjectsByOrg(orgId);
        int maxActiveProjects = orgId == null ? 0 : quotaHelper.getMaxProjectsStub(orgId);
        double quotaPressurePct = maxActiveProjects <= 0
            ? 0.0
            : round1(((double) activeProjectsOrg / (double) maxActiveProjects) * 100.0);

        double timelineScore = scoreTimeline(daysToDeadline, overdue, terminalStatus);
        double collaborationScore = memberCount == 0 ? 10.0 : Math.min(100.0, memberCount * 25.0);
        double activityScore = Math.min(100.0, eventsLast14d * 18.0);
        double statusScore = scoreForStatus(project.getStatus());
        if (!terminalStatus && statusAgeDays > 30) {
            statusScore = Math.max(15.0, statusScore - 15.0);
        }

        double healthScore = round1(
            (timelineScore * 0.35)
                + (collaborationScore * 0.25)
                + (activityScore * 0.20)
                + (statusScore * 0.20)
        );

        String riskLevel = healthScore >= 80.0 ? "LOW" : healthScore >= 60.0 ? "MEDIUM" : "HIGH";

        List<String> hints = new ArrayList<>();
        if (overdue) {
            hints.add("Project is past its target end date.");
        }
        if (daysToDeadline != null && daysToDeadline >= 0 && daysToDeadline <= 7 && !terminalStatus) {
            hints.add("Deadline is within the next 7 days.");
        }
        if (memberCount < 2) {
            hints.add("Add at least one more member to improve delivery resilience.");
        }
        if (eventsLast14d == 0) {
            hints.add("No recent project activity detected in the last 14 days.");
        }
        if (project.getStatus() == ProjectStatus.ON_HOLD) {
            hints.add("Project is on hold. Review blockers and set a resume plan.");
        }
        if (quotaPressurePct >= 85.0) {
            hints.add("Organization active-project quota is near capacity.");
        }
        if (hints.isEmpty()) {
            hints.add("Project health is stable.");
        }

        Map<String, Object> scores = new LinkedHashMap<>();
        scores.put("timeline", round1(timelineScore));
        scores.put("collaboration", round1(collaborationScore));
        scores.put("activity", round1(activityScore));
        scores.put("status", round1(statusScore));

        Map<String, Object> signals = new LinkedHashMap<>();
        signals.put("memberCount", memberCount);
        signals.put("eventsLast14d", eventsLast14d);
        signals.put("projectAgeDays", projectAgeDays);
        signals.put("statusAgeDays", statusAgeDays);
        signals.put("daysToDeadline", daysToDeadline);
        signals.put("quotaPressurePct", quotaPressurePct);
        signals.put("activeProjectsOrg", activeProjectsOrg);
        signals.put("maxActiveProjectsOrg", maxActiveProjects);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("projectId", projectId);
        payload.put("workspaceId", workspaceId);
        payload.put("projectName", project.getName());
        payload.put("status", project.getStatus());
        payload.put("healthScore", healthScore);
        payload.put("riskLevel", riskLevel);
        payload.put("scores", scores);
        payload.put("signals", signals);
        payload.put("hints", hints);
        payload.put("generatedAt", Instant.now());
        return payload;
    }

    @Transactional
    public Project create(UUID workspaceId, String name, String description,
                          Visibility visibility, LocalDate startDate, LocalDate endDate,
                          String githubRepoUrl,
                          Long requesterId) {
        if (!userRepo.existsById(requesterId)) throw new Module2Exception(NOT_FOUND, "Creator user not found");
        Workspace ws = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Creator user not found"));

        if (!projectAuthorizationService.canCreateProject(requester, ws)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can create projects.");
        }

        if (name == null || name.trim().isEmpty()) {
            throw new Module2Exception(VALIDATION, "Project name is required");
        }
        if (projectRepo.existsByNameIgnoreCaseAndWorkspaceId(name.trim(), workspaceId)) {
            throw new Module2Exception(CONFLICT, "A project named '" + name.trim() + "' already exists in this workspace");
        }

        java.util.UUID orgId = ws.getOrganization().getId();
        if (consumesProjectQuota(ProjectStatus.PLANNING)) {
            enforceProjectQuota(orgId);
        }

        Project p = Project.builder()
            .workspace(ws)
            .createdBy(requesterId)
            .name(name)
            .description(description)
            .githubRepoUrl(normalizeGithubRepoUrl(githubRepoUrl))
            .visibility(visibility != null ? visibility : Visibility.PRIVATE)
            .startDate(startDate)
            .endDate(endDate)
            .build();
        p = projectRepo.save(p);
        String orgType = resolveWorkspaceOrgType(ws);
        ProjectRole assigned = orgType.equals("academic") ? ProjectRole.PROFESSOR : ProjectRole.PROJECT_MANAGER;
        projectMemberRepo.save(ProjectMember.builder()
            .project(p).userId(requesterId).role(assigned).build());

        // audit log (via adapter)
        try {
            auditLogService.writeAudit(requesterId, orgId, "CREATE_PROJECT", "project",
                p.getId().toString(), p.getName(), workspaceId, null);
        } catch (Exception ignored) {}
        return p;
    }

    @Transactional
    public Project createProjectFromTemplate(UUID workspaceId,
                                             UUID templateId,
                                             String nameOverride,
                                             LocalDate startDate,
                                             LocalDate endDate,
                                             Long requesterId) {
        return createProjectFromTemplate(
            workspaceId,
            templateId,
            nameOverride,
            startDate,
            endDate,
            requesterId,
            null,
            null,
            null
        );
    }

    @Transactional
    public Project createProjectFromTemplate(UUID workspaceId,
                                             UUID templateId,
                                             String nameOverride,
                                             LocalDate startDate,
                                             LocalDate endDate,
                                             Long requesterId,
                                             String phasesOverrideJson,
                                             String milestonesOverrideJson,
                                             String tasksOverrideJson) {
        ProjectTemplate template = templateService.getById(templateId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        boolean isOwner = template.getCreatedBy() != null && template.getCreatedBy().equals(requesterId);
        if (template.getStatus() != ProjectTemplate.TemplateStatus.APPROVED && !isOwner) {
            throw new Module2Exception(FORBIDDEN, "Template must be APPROVED before use");
        }
        if (!userRepo.existsById(requesterId)) throw new Module2Exception(NOT_FOUND, "Creator user not found");

        Workspace ws = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Creator user not found"));
        if (!projectAuthorizationService.canCreateProject(requester, ws)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can create projects.");
        }

        String resolvedName = hasText(nameOverride) ? nameOverride.trim() : template.getName();
        if (projectRepo.existsByNameIgnoreCaseAndWorkspaceId(resolvedName, workspaceId)) {
            throw new Module2Exception(CONFLICT, "A project named '" + resolvedName + "' already exists in this workspace");
        }

        if (consumesProjectQuota(ProjectStatus.PLANNING)) {
            enforceProjectQuota(ws.getOrganization().getId());
        }

        String effectivePhasesJson = hasText(phasesOverrideJson) ? phasesOverrideJson : template.getDefaultPhasesJson();
        String effectiveMilestonesJson = hasText(milestonesOverrideJson) ? milestonesOverrideJson : template.getDefaultMilestonesJson();
        String effectiveTasksJson = hasText(tasksOverrideJson) ? tasksOverrideJson : template.getDefaultTasksJson();

        TemplateStructureService.NormalizedTemplateStructure structure =
            templateStructureService.normalizeTemplateStructure(
                effectivePhasesJson,
                effectiveMilestonesJson,
                effectiveTasksJson,
                "Project template structure"
            );

        Project p = Project.builder()
            .workspace(ws)
            .templateId(template.getId())
            .createdBy(requesterId)
            .name(resolvedName)
            .description(template.getUseCaseDescription())
            .visibility(template.getDefaultVisibility() == ProjectTemplate.DefaultVisibility.PUBLIC ? Visibility.PUBLIC : Visibility.PRIVATE)
            .startDate(startDate)
            .endDate(endDate)
            .phasesJson(structure.phasesJson())
            .build();
        p = projectRepo.save(p);

        String orgType = resolveWorkspaceOrgType(ws);
        projectMemberRepo.save(ProjectMember.builder()
            .project(p)
            .userId(requesterId)
            .role(orgType.equals("academic") ? ProjectRole.PROFESSOR : ProjectRole.PROJECT_MANAGER)
            .build());

        provisionProjectTimelineFromTemplate(p, requester, startDate, structure);

        // atomic usage increment — avoids race condition under concurrent requests
        templateService.incrementUsageCount(templateId);
        return p;
    }

    @Transactional
    public Project assignMemberToProject(UUID projectId, Long userId, ProjectRole role, Long assignedBy) {
        Project project = findOrThrow(projectId);
        // member must exist in workspace
        if (!userRepo.existsById(userId)) throw new Module2Exception(NOT_FOUND, "User to assign not found");
        if (!workspaceService.isMember(project.getWorkspace().getId(), userId)) {
            throw new Module2Exception(BAD_REQUEST, "User is not a member of the project's workspace");
        }
        if (projectMemberRepo.existsByProjectIdAndUserId(projectId, userId)) {
            throw new Module2Exception(CONFLICT, "This user is already a member of this project");
        }
        var assigner = userRepo.findById(assignedBy).orElseThrow(() -> new Module2Exception(NOT_FOUND, "Assigner user not found"));
        if (!projectAuthorizationService.canManageProjectMembers(assigner, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to add project members");
        }

        WorkspaceMember workspaceMember = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(project.getWorkspace().getId(), userId)
            .orElseThrow(() -> new Module2Exception(BAD_REQUEST, "User is not a member of the project's workspace"));

        String orgType = resolveWorkspaceOrgType(project.getWorkspace());
        ProjectRole finalRole = projectRoleMapper.resolveAssignmentRole(role, workspaceMember.getRole(), orgType);

        // If a soft-deleted record exists for this (project, user) pair, restore it instead of
        // inserting a new row — otherwise the DB UNIQUE constraint on (project_id, user_id) would
        // raise a 500 when re-inviting a previously removed member.
        if (projectMemberRepo.countSoftDeleted(projectId, userId) > 0) {
            projectMemberRepo.restoreSoftDeleted(projectId, userId, finalRole.name());
            return project;
        }

        ProjectMember pm = ProjectMember.builder()
            .project(project).userId(userId).role(finalRole).assignedByUser(assigner).build();
        pm = projectMemberRepo.save(pm);
        return project;
    }

    @Transactional
    public Project update(UUID projectId, String name, String description,
                          Visibility visibility, LocalDate startDate, LocalDate endDate,
                          boolean githubRepoUrlProvided, String githubRepoUrl,
                          Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to update project");
        }

        if (name != null)        p.setName(name);
        if (description != null) p.setDescription(description);
        if (visibility != null)  p.setVisibility(visibility);
        if (startDate != null)   p.setStartDate(startDate);
        if (endDate != null)     p.setEndDate(endDate);
        if (githubRepoUrlProvided) p.setGithubRepoUrl(normalizeGithubRepoUrl(githubRepoUrl));
        return projectRepo.save(p);
    }

    public Map<String, Object> getProjectRepoInsights(UUID workspaceId, UUID projectId, Long requesterId) {
        Project project = getById(projectId, requesterId);
        if (!project.getWorkspace().getId().equals(workspaceId)) {
            throw new Module2Exception(NOT_FOUND, "Project not found in this workspace");
        }

        String normalizedUrl = normalizeGithubRepoUrl(project.getGithubRepoUrl());
        if (normalizedUrl == null) {
            Map<String, Object> emptyPayload = new LinkedHashMap<>();
            emptyPayload.put("provider", "GitHub");
            emptyPayload.put("projectId", projectId.toString());
            emptyPayload.put("workspaceId", workspaceId.toString());
            emptyPayload.put("repoLinked", false);
            emptyPayload.put("githubRepoUrl", null);
            emptyPayload.put("warning", "No GitHub repository linked to this project yet.");
            return emptyPayload;
        }

        String repoFullName = extractOwnerRepo(normalizedUrl);
        if (repoFullName == null) {
            throw new Module2Exception(VALIDATION, "Stored GitHub repository URL is invalid");
        }

        Map<String, Object> payload = publicIntegrationService.getRepoInsights(repoFullName);
        payload.put("projectId", projectId.toString());
        payload.put("workspaceId", workspaceId.toString());
        payload.put("repoLinked", true);
        payload.put("githubRepoUrl", normalizedUrl);
        return payload;
    }

    private void provisionProjectTimelineFromTemplate(Project project,
                                                      User creator,
                                                      LocalDate projectStartDate,
                                                      TemplateStructureService.NormalizedTemplateStructure structure) {
        if (structure.milestones().isEmpty() && structure.tasks().isEmpty()) {
            return;
        }

        Map<String, Milestone> milestonesByKey = new LinkedHashMap<>();
        Map<String, Integer> milestoneOffsetByKey = new LinkedHashMap<>();
        Map<String, String> phaseNamesByKey = structure.phases().stream()
            .collect(java.util.stream.Collectors.toMap(
                TemplateStructureService.PhaseSpec::key,
                TemplateStructureService.PhaseSpec::name,
                (left, right) -> left,
                LinkedHashMap::new
            ));
        int inferredMilestoneIndex = 0;

        for (TemplateStructureService.MilestoneSpec spec : structure.milestones()) {
            if (!spec.enabled()) continue;

            Milestone milestone = new Milestone();
            milestone.setProject(project);
            milestone.setName(spec.name());
            milestone.setDescription(spec.description());
            milestone.setStatus(Milestone.MilestoneStatus.valueOf(spec.status().toLowerCase(Locale.ROOT)));
            milestone.setCompletionPct(spec.completionPct());
            milestone.setCreatedBy(creator);
            milestone.setDueDate(resolveDateFromOffset(projectStartDate, spec.offsetDays()));
            milestone.setIsGate(spec.isGate());
            milestone.setPhaseKey(spec.phaseKey());
            milestone.setPhaseName(spec.phaseKey() == null ? null : phaseNamesByKey.get(spec.phaseKey()));
            milestone.setMilestoneIndex(spec.milestoneIndex() == null ? inferredMilestoneIndex : spec.milestoneIndex());
            milestone.setSourceMilestoneKey(spec.key());

            Milestone saved = milestoneRepository.save(milestone);
            milestonesByKey.put(spec.key(), saved);
            milestoneOffsetByKey.put(spec.key(), spec.offsetDays());
            inferredMilestoneIndex++;
        }

        Map<String, Task> tasksByKey = new LinkedHashMap<>();
        Map<String, String> parentReferences = new LinkedHashMap<>();

        for (TemplateStructureService.TaskSpec spec : structure.tasks()) {
            if (!spec.enabled()) continue;
            if (spec.milestoneKey() != null && !milestonesByKey.containsKey(spec.milestoneKey())) continue;

            Task task = Task.builder()
                .project(project)
                .milestone(spec.milestoneKey() != null ? milestonesByKey.get(spec.milestoneKey()) : null)
                .title(spec.title())
                .description(spec.description())
                .taskType(Task.TaskType.valueOf(spec.taskType().toLowerCase(Locale.ROOT)))
                .status(Task.TaskStatus.valueOf(spec.status().toLowerCase(Locale.ROOT)))
                .priority(Task.TaskPriority.valueOf(spec.priority().toLowerCase(Locale.ROOT)))
                .estimatedHours(spec.estimatedHours())
                .createdBy(creator)
                .startDate(resolveTaskStartDate(projectStartDate, spec, milestoneOffsetByKey))
                .dueDate(resolveTaskDueDate(projectStartDate, spec, milestoneOffsetByKey))
                .build();

            Task saved = taskRepository.save(task);
            tasksByKey.put(spec.key(), saved);

            if (spec.parentTaskKey() != null && !spec.parentTaskKey().isBlank()) {
                parentReferences.put(spec.key(), spec.parentTaskKey());
            }
        }

        for (Map.Entry<String, String> parentRef : parentReferences.entrySet()) {
            Task child = tasksByKey.get(parentRef.getKey());
            Task parent = tasksByKey.get(parentRef.getValue());
            if (child == null || parent == null || child.getId().equals(parent.getId())) continue;

            child.setParentTask(parent);
            taskRepository.save(child);
        }
    }

    private LocalDate resolveTaskStartDate(LocalDate projectStartDate,
                                           TemplateStructureService.TaskSpec spec,
                                           Map<String, Integer> milestoneOffsetByKey) {
        Integer startOffset = spec.startOffsetDays();
        if (startOffset == null && spec.milestoneKey() != null) {
            startOffset = milestoneOffsetByKey.get(spec.milestoneKey());
        }
        return resolveDateFromOffset(projectStartDate, startOffset);
    }

    private LocalDate resolveTaskDueDate(LocalDate projectStartDate,
                                         TemplateStructureService.TaskSpec spec,
                                         Map<String, Integer> milestoneOffsetByKey) {
        Integer dueOffset = spec.dueOffsetDays();
        Integer inferredStartOffset = spec.startOffsetDays();

        if (inferredStartOffset == null && spec.milestoneKey() != null) {
            inferredStartOffset = milestoneOffsetByKey.get(spec.milestoneKey());
        }

        if (dueOffset == null && inferredStartOffset != null && spec.estimatedHours() != null && spec.estimatedHours() > 0f) {
            int estimatedDays = Math.max(1, (int) Math.ceil(spec.estimatedHours() / 8.0));
            dueOffset = inferredStartOffset + estimatedDays;
        }

        if (dueOffset == null) {
            dueOffset = inferredStartOffset;
        }

        return resolveDateFromOffset(projectStartDate, dueOffset);
    }

    private LocalDate resolveDateFromOffset(LocalDate projectStartDate, Integer offsetDays) {
        if (projectStartDate == null || offsetDays == null) return null;
        return projectStartDate.plusDays(Math.max(0, offsetDays));
    }

    private void validateJson(String json, String fieldName) {
        if (json == null || json.isBlank()) return;
        try {
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
        } catch (Exception e) {
            throw new Module2Exception(VALIDATION, fieldName + " contains invalid JSON");
        }
    }

    /**
     * Valid project status transitions following software project lifecycle best practices:
     * - Any active state can be CANCELLED
     * - CANCELLED can be re-opened to PLANNING
     * - COMPLETED → ARCHIVED for archival (soft-delete equivalent)
     */
    private static final java.util.Map<ProjectStatus, java.util.List<ProjectStatus>> VALID_TRANSITIONS;
    static {
        VALID_TRANSITIONS = new java.util.HashMap<>();
        VALID_TRANSITIONS.put(ProjectStatus.PLANNING,   java.util.List.of(ProjectStatus.ACTIVE, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.ACTIVE,     java.util.List.of(ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.ON_HOLD,    java.util.List.of(ProjectStatus.ACTIVE, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.COMPLETED,  java.util.List.of(ProjectStatus.ARCHIVED));
        VALID_TRANSITIONS.put(ProjectStatus.CANCELLED,  java.util.List.of(ProjectStatus.PLANNING));
        VALID_TRANSITIONS.put(ProjectStatus.ARCHIVED,   java.util.List.of());
    }

    @Transactional
    public Project changeStatus(UUID projectId, ProjectStatus status, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to change project status");
        }

        var allowedTo = VALID_TRANSITIONS.getOrDefault(p.getStatus(), java.util.List.of());
        if (!allowedTo.contains(status)) {
            throw new Module2Exception(BAD_REQUEST, String.format(
                "Cannot move project from %s to %s. Allowed transitions: %s.",
                p.getStatus(), status, allowedTo));
        }

        enforceQuotaForTransition(p, status);

        p.setStatus(status);
        return projectRepo.save(p);
    }

    @Transactional
    public List<Project> bulkChangeStatus(UUID workspaceId, List<UUID> projectIds,
                                           ProjectStatus newStatus, Long requesterId) {
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        UUID orgId = workspaceService.getById(workspaceId).getOrganization().getId();
        long currentQuotaProjects = quotaHelper.countActiveProjectsByOrg(orgId);
        int maxAllowed = quotaHelper.getMaxProjectsStub(orgId);

        List<Project> updated = new ArrayList<>();
        for (UUID pid : projectIds) {
            try {
                Project p = findOrThrow(pid);
                if (!p.getWorkspace().getId().equals(workspaceId)) continue;
                if (!projectAuthorizationService.canManageProject(requester, p)) continue;
                var allowedTo = VALID_TRANSITIONS.getOrDefault(p.getStatus(), java.util.List.of());
                if (!allowedTo.contains(newStatus)) continue;

                boolean currentlyConsumes = consumesProjectQuota(p.getStatus());
                boolean willConsume = consumesProjectQuota(newStatus);
                if (!currentlyConsumes && willConsume) {
                    if (currentQuotaProjects >= maxAllowed) {
                        continue;
                    }
                    currentQuotaProjects++;
                } else if (currentlyConsumes && !willConsume) {
                    currentQuotaProjects = Math.max(0L, currentQuotaProjects - 1L);
                }

                p.setStatus(newStatus);
                updated.add(projectRepo.save(p));
            } catch (Exception ignored) {}
        }
        return updated;
    }

    @Transactional
    public void delete(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to delete/archive project");
        }
        p.setStatus(ProjectStatus.ARCHIVED);
        projectRepo.save(p);
    }

    @Transactional
    public void hardDelete(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to permanently delete project");
        }
        // Hard-delete members first (bypasses soft-delete filter), then the project row itself
        projectMemberRepo.hardDeleteAllByProjectId(projectId);
        projectRepo.hardDeleteById(projectId);
    }

    // No access checks for static demo
    private void checkAccess(Project p, Long userId) {
        // No-op
    }

    public void requireProjectRole(UUID projectId, Long userId, ProjectRole... allowed) {
        // No-op for static demo
    }

    private boolean isGlobalAdminRole(User.RoleName role) {
        return role == User.RoleName.SUPER_ADMIN
            || role == User.RoleName.ADMIN;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void enforceProjectQuota(UUID orgId) {
        long current = quotaHelper.countActiveProjectsByOrg(orgId);
        int maxAllowed = quotaHelper.getMaxProjectsStub(orgId);
        if (current >= maxAllowed) {
            throw new Module2Exception(PAYMENT_REQUIRED, String.format("Active project quota exceeded: %d/%d", current, maxAllowed));
        }
    }

    private void enforceQuotaForTransition(Project project, ProjectStatus newStatus) {
        if (consumesProjectQuota(newStatus) && !consumesProjectQuota(project.getStatus())) {
            enforceProjectQuota(project.getWorkspace().getOrganization().getId());
        }
    }

    private boolean consumesProjectQuota(ProjectStatus status) {
        return status == ProjectStatus.ACTIVE;
    }

    private long daysSince(Instant instant) {
        if (instant == null) {
            return 0L;
        }
        return Math.max(0L, ChronoUnit.DAYS.between(instant, Instant.now()));
    }

    private double scoreTimeline(Long daysToDeadline, boolean overdue, boolean terminalStatus) {
        if (terminalStatus) {
            return 100.0;
        }
        if (daysToDeadline == null) {
            return 70.0;
        }
        if (overdue) {
            return 25.0;
        }
        if (daysToDeadline <= 3) {
            return 45.0;
        }
        if (daysToDeadline <= 7) {
            return 60.0;
        }
        return 85.0;
    }

    private double scoreForStatus(ProjectStatus status) {
        if (status == null) {
            return 55.0;
        }
        return switch (status) {
            case COMPLETED -> 100.0;
            case ARCHIVED -> 90.0;
            case ACTIVE -> 82.0;
            case PLANNING -> 68.0;
            case ON_HOLD -> 40.0;
            case CANCELLED -> 30.0;
        };
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
            return workspace.getOrgType().trim().toLowerCase();
        }
        if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            return workspace.getOrganization().getOrgType().name().toLowerCase();
        }
        return "enterprise";
    }

    private String normalizeGithubRepoUrl(String raw) {
        if (raw == null) return null;
        String candidate = raw.trim();
        if (candidate.isBlank()) return null;

        Matcher ownerRepo = GITHUB_OWNER_REPO_PATTERN.matcher(candidate);
        if (ownerRepo.matches()) {
            return "https://github.com/" + ownerRepo.group(1) + "/" + stripGitSuffix(ownerRepo.group(2));
        }

        Matcher githubUrl = GITHUB_URL_PATTERN.matcher(candidate);
        if (githubUrl.matches()) {
            String owner = githubUrl.group(1);
            String repo = stripGitSuffix(githubUrl.group(2));
            return "https://github.com/" + owner + "/" + repo;
        }

        throw new Module2Exception(VALIDATION,
            "GitHub repository must be owner/repository or a valid github.com URL");
    }

    private String extractOwnerRepo(String normalizedUrl) {
        Matcher githubUrl = GITHUB_URL_PATTERN.matcher(normalizedUrl == null ? "" : normalizedUrl);
        if (!githubUrl.matches()) return null;
        return githubUrl.group(1) + "/" + stripGitSuffix(githubUrl.group(2));
    }

    private String stripGitSuffix(String repo) {
        if (repo == null) return "";
        return repo.endsWith(".git") ? repo.substring(0, repo.length() - 4) : repo;
    }
}
