package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardAggregationService {

    private static final List<String> PHASE_COLORS = List.of(
        "#2A9D8F", "#E76F51", "#264653", "#E9C46A", "#457B9D", "#F4A261"
    );

    private final WorkspaceService workspaceService;
    private final ProjectService projectService;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectTemplateService projectTemplateService;
    private final M2AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> buildPortfolio(User currentUser,
                                              int activityLimit,
                                              int milestoneLimit,
                                              int templateLimit) {
        int safeActivityLimit = clamp(activityLimit, 5, 100);
        int safeMilestoneLimit = clamp(milestoneLimit, 3, 40);
        int safeTemplateLimit = clamp(templateLimit, 1, 12);

        List<Workspace> visibleWorkspaces = workspaceService.getVisibleForUser(currentUser);
        Map<String, Object> workspaceOverview = workspaceService.getWorkspacesOverview(currentUser.getId());

        List<Project> visibleProjects = loadVisibleProjects(visibleWorkspaces, currentUser.getId());
        Map<UUID, Project> projectsById = visibleProjects.stream()
            .collect(Collectors.toMap(Project::getId, p -> p, (left, right) -> left, LinkedHashMap::new));
        List<Project> dedupedProjects = new ArrayList<>(projectsById.values());
        List<UUID> projectIds = dedupedProjects.stream().map(Project::getId).toList();

        Map<UUID, Map<String, Object>> healthByProject = loadProjectHealth(currentUser, dedupedProjects);

        Map<UUID, Map<String, Long>> taskStatusByProject = projectIds.isEmpty()
            ? Map.of()
            : toEnumCountMap(taskRepository.countByProjectAndStatus(projectIds));

        Map<UUID, Map<String, Long>> taskPriorityByProject = projectIds.isEmpty()
            ? Map.of()
            : toEnumCountMap(taskRepository.countByProjectAndPriority(projectIds));

        LocalDate today = LocalDate.now();

        Map<UUID, Long> overdueTaskByProject = projectIds.isEmpty()
            ? Map.of()
            : toCountMap(taskRepository.countOverdueByProjectIds(projectIds, today, Task.TaskStatus.done));

        Map<UUID, Long> criticalOrBlockedByProject = projectIds.isEmpty()
            ? Map.of()
            : toCountMap(taskRepository.countCriticalOrBlockedByProjectIds(
                projectIds,
                Task.TaskStatus.done,
                Task.TaskStatus.blocked,
                Task.TaskPriority.critical
            ));

        Map<UUID, Long> memberCountByProject = projectIds.isEmpty()
            ? Map.of()
            : toCountMap(projectMemberRepository.countByProjectIds(projectIds));

        Map<UUID, List<Map<String, Object>>> memberPreviewByProject = projectIds.isEmpty()
            ? Map.of()
            : toMemberPreview(projectMemberRepository.findMemberPreviewRows(projectIds), 4);

        List<Milestone> milestones = projectIds.isEmpty()
            ? List.of()
            : milestoneRepository.findByProject_IdInAndDueDateIsNotNullOrderByDueDateAsc(projectIds);

        Map<UUID, Long> openMilestoneByProject = new HashMap<>();
        Map<UUID, Long> overdueMilestoneByProject = new HashMap<>();
        List<Map<String, Object>> milestoneCountdown = new ArrayList<>();

        for (Milestone milestone : milestones) {
            Project project = milestone.getProject();
            if (project == null || project.getId() == null) {
                continue;
            }

            UUID projectId = project.getId();
            LocalDate dueDate = milestone.getDueDate();
            boolean completed = milestone.getStatus() == Milestone.MilestoneStatus.completed;

            if (!completed) {
                openMilestoneByProject.merge(projectId, 1L, Long::sum);
            }

            if (!completed && dueDate != null && dueDate.isBefore(today)) {
                overdueMilestoneByProject.merge(projectId, 1L, Long::sum);
            }

            if (!completed && dueDate != null && milestoneCountdown.size() < safeMilestoneLimit) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", milestone.getId());
                row.put("projectId", projectId.toString());
                row.put("projectName", project.getName());
                row.put("name", milestone.getName());
                row.put("dueDate", dueDate.toString());
                row.put("daysRemaining", ChronoUnit.DAYS.between(today, dueDate));
                row.put("status", milestone.getStatus() == null ? null : milestone.getStatus().name());
                milestoneCountdown.add(row);
            }
        }

        List<Map<String, Object>> projectCards = buildProjectCards(
            dedupedProjects,
            healthByProject,
            taskStatusByProject,
            taskPriorityByProject,
            overdueTaskByProject,
            criticalOrBlockedByProject,
            openMilestoneByProject,
            overdueMilestoneByProject,
            memberCountByProject,
            memberPreviewByProject
        );

        Map<UUID, List<Project>> projectsByWorkspace = dedupedProjects.stream()
            .collect(Collectors.groupingBy(project -> project.getWorkspace().getId(), LinkedHashMap::new, Collectors.toList()));

        Map<UUID, List<Map<String, Object>>> projectCardsByWorkspace = projectCards.stream()
            .collect(Collectors.groupingBy(card -> asUuid(card.get("workspaceId")), LinkedHashMap::new, Collectors.toList()));

        Map<UUID, Map<String, Object>> overviewByWorkspace = indexWorkspaceOverviewRows(workspaceOverview);

        List<Map<String, Object>> workspaceCards = buildWorkspaceCards(
            visibleWorkspaces,
            projectsByWorkspace,
            projectCardsByWorkspace,
            overviewByWorkspace
        );

        List<Map<String, Object>> activity = collectActivityRows(visibleWorkspaces, safeActivityLimit);
        List<Map<String, Object>> templates = projectTemplateService.getTopFeaturedOrTrendingTemplates(safeTemplateLimit);

        long totalTasks = projectCards.stream()
            .map(card -> asObjectMap(card.get("taskSummary")))
            .mapToLong(summary -> asLong(summary.get("total")))
            .sum();

        long urgentProjects = projectCards.stream()
            .filter(card -> asBoolean(asObjectMap(card.get("urgent")).get("isUrgent")))
            .count();

        double healthAverage = projectCards.isEmpty()
            ? 0.0
            : round1(projectCards.stream().mapToDouble(card -> asDouble(card.get("healthScore"))).average().orElse(0.0));

        String healthState = healthAverage >= 80.0 ? "HEALTHY" : healthAverage >= 60.0 ? "WATCH" : "AT_RISK";

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("workspaces", visibleWorkspaces.size());
        metrics.put("projects", dedupedProjects.size());
        metrics.put("tasks", totalTasks);
        metrics.put("members", asLong(readNested(workspaceOverview, "members", "visibleUnique")));

        Map<String, Object> globalHealth = new LinkedHashMap<>();
        globalHealth.put("score", healthAverage);
        globalHealth.put("state", healthState);
        globalHealth.put("urgentProjects", urgentProjects);
        globalHealth.put("label", buildGlobalHealthLabel(healthAverage, urgentProjects));

        List<String> warnings = new ArrayList<>();
        if (dedupedProjects.isEmpty()) {
            warnings.add("No visible projects were found for this user scope.");
        }
        if (milestoneCountdown.isEmpty()) {
            warnings.add("No upcoming milestones are currently scheduled.");
        }
        if (templates.isEmpty()) {
            warnings.add("No featured or trending templates are available right now.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("metrics", metrics);
        payload.put("globalHealth", globalHealth);
        payload.put("workspaces", workspaceCards);
        payload.put("projects", projectCards);
        payload.put("milestonesCountdown", milestoneCountdown);
        payload.put("activity", activity);
        payload.put("templatesTrending", templates);
        payload.put("warnings", warnings);
        return payload;
    }

    public Map<String, Object> buildProjectFocus(User currentUser, UUID workspaceId, UUID projectId) {
        Project project = projectService.getById(projectId, currentUser.getId());
        UUID resolvedWorkspaceId = project.getWorkspace().getId();

        if (workspaceId != null && !workspaceId.equals(resolvedWorkspaceId)) {
            throw new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, "Project not found in this workspace");
        }

        Map<String, Object> health = projectService.getProjectHealth(resolvedWorkspaceId, projectId, currentUser.getId());
        LocalDate today = LocalDate.now();

        List<Task> tasks = taskRepository.findByProject_Id(projectId);
        List<Milestone> milestones = new ArrayList<>(milestoneRepository.findByProject_Id(projectId));
        milestones.sort(Comparator.comparing(Milestone::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));

        Map<String, Long> statusCounts = createTaskStatusShape();
        Map<String, Long> priorityCounts = createTaskPriorityShape();
        Map<Long, Long> taskCountByMilestone = new HashMap<>();

        long overdueTasks = 0L;
        long blockedTasks = 0L;
        long criticalTasks = 0L;

        for (Task task : tasks) {
            if (task.getStatus() != null) {
                statusCounts.merge(task.getStatus().name(), 1L, Long::sum);
            }
            if (task.getPriority() != null) {
                priorityCounts.merge(task.getPriority().name(), 1L, Long::sum);
            }
            if (task.getMilestone() != null && task.getMilestone().getId() != null) {
                taskCountByMilestone.merge(task.getMilestone().getId(), 1L, Long::sum);
            }

            if (task.getDueDate() != null && task.getDueDate().isBefore(today) && task.getStatus() != Task.TaskStatus.done) {
                overdueTasks++;
            }
            if (task.getStatus() == Task.TaskStatus.blocked) {
                blockedTasks++;
            }
            if (task.getPriority() == Task.TaskPriority.critical && task.getStatus() != Task.TaskStatus.done) {
                criticalTasks++;
            }
        }

        long totalTasks = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        long completedTasks = statusCounts.getOrDefault(Task.TaskStatus.done.name(), 0L);

        Map<String, Object> timeline = computeTimeline(project.getStartDate(), project.getEndDate(), today);
        double timelineProgress = asDouble(timeline.get("progressPct"));
        List<Map<String, Object>> phaseSegments = buildPhaseSegments(project.getPhasesJson(), timelineProgress);

        long overdueMilestones = 0L;
        List<Map<String, Object>> milestoneMarkers = new ArrayList<>();

        for (int i = 0; i < milestones.size(); i++) {
            Milestone milestone = milestones.get(i);
            LocalDate dueDate = milestone.getDueDate();
            boolean completed = milestone.getStatus() == Milestone.MilestoneStatus.completed;

            if (!completed && dueDate != null && dueDate.isBefore(today)) {
                overdueMilestones++;
            }

            Map<String, Object> marker = new LinkedHashMap<>();
            marker.put("id", milestone.getId());
            marker.put("name", milestone.getName());
            marker.put("status", milestone.getStatus() == null ? null : milestone.getStatus().name());
            marker.put("dueDate", dueDate == null ? null : dueDate.toString());
            marker.put("daysRemaining", dueDate == null ? null : ChronoUnit.DAYS.between(today, dueDate));
            marker.put("positionPct", timelinePositionPct(project.getStartDate(), project.getEndDate(), dueDate, i, milestones.size()));
            marker.put("taskCount", taskCountByMilestone.getOrDefault(milestone.getId(), 0L));
            milestoneMarkers.add(marker);
        }

        List<Map<String, Object>> upcomingMilestones = milestoneMarkers.stream()
            .filter(marker -> {
                String dueDate = asString(marker.get("dueDate"));
                String status = asString(marker.get("status"));
                return StringUtils.hasText(dueDate) && !Milestone.MilestoneStatus.completed.name().equals(status);
            })
            .sorted(Comparator.comparing(marker -> asString(marker.get("dueDate"))))
            .limit(6)
            .toList();

        Map<UUID, List<Map<String, Object>>> memberPreviewByProject = toMemberPreview(
            projectMemberRepository.findMemberPreviewRows(List.of(projectId)),
            12
        );
        List<Map<String, Object>> memberItems = memberPreviewByProject.getOrDefault(projectId, List.of());

        long memberCount = toCountMap(projectMemberRepository.countByProjectIds(List.of(projectId)))
            .getOrDefault(projectId, (long) memberItems.size());

        Map<String, Object> projectInfo = new LinkedHashMap<>();
        projectInfo.put("id", project.getId().toString());
        projectInfo.put("workspaceId", resolvedWorkspaceId.toString());
        projectInfo.put("workspaceName", project.getWorkspace().getName());
        projectInfo.put("name", project.getName());
        projectInfo.put("description", project.getDescription());
        projectInfo.put("status", project.getStatus() == null ? null : project.getStatus().name());
        projectInfo.put("visibility", project.getVisibility() == null ? null : project.getVisibility().name());
        projectInfo.put("startDate", project.getStartDate() == null ? null : project.getStartDate().toString());
        projectInfo.put("endDate", project.getEndDate() == null ? null : project.getEndDate().toString());

        Map<String, Object> taskSummary = new LinkedHashMap<>();
        taskSummary.put("total", totalTasks);
        taskSummary.put("completed", completedTasks);
        taskSummary.put("status", statusCounts);
        taskSummary.put("priority", priorityCounts);
        taskSummary.put("overdue", overdueTasks);

        Map<String, Object> urgent = new LinkedHashMap<>();
        urgent.put("overdueTasks", overdueTasks);
        urgent.put("blockedTasks", blockedTasks);
        urgent.put("criticalTasks", criticalTasks);
        urgent.put("overdueMilestones", overdueMilestones);
        urgent.put("isUrgent", overdueTasks > 0 || blockedTasks > 0 || criticalTasks > 0 || overdueMilestones > 0);

        Map<String, Object> members = new LinkedHashMap<>();
        members.put("count", memberCount);
        members.put("items", memberItems);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("project", projectInfo);
        payload.put("health", health);
        payload.put("timeline", timeline);
        payload.put("phases", phaseSegments);
        payload.put("milestones", milestoneMarkers);
        payload.put("upcomingMilestones", upcomingMilestones);
        payload.put("tasks", taskSummary);
        payload.put("members", members);
        payload.put("urgent", urgent);
        return payload;
    }

    public List<Map<String, Object>> buildActivityFeed(User currentUser, int limit) {
        List<Workspace> visibleWorkspaces = workspaceService.getVisibleForUser(currentUser);
        return collectActivityRows(visibleWorkspaces, clamp(limit, 5, 100));
    }

    public List<Map<String, Object>> buildTopTemplates(int limit) {
        return projectTemplateService.getTopFeaturedOrTrendingTemplates(clamp(limit, 1, 12));
    }

    private List<Project> loadVisibleProjects(List<Workspace> workspaces, Long userId) {
        List<Project> projects = new ArrayList<>();
        for (Workspace workspace : workspaces) {
            projects.addAll(projectService.getVisible(workspace.getId(), userId, Pageable.unpaged()).getContent());
        }
        return projects;
    }

    private Map<UUID, Map<String, Object>> loadProjectHealth(User currentUser, List<Project> projects) {
        Map<UUID, Map<String, Object>> healthByProject = new HashMap<>();
        for (Project project : projects) {
            try {
                Map<String, Object> health = projectService.getProjectHealth(
                    project.getWorkspace().getId(),
                    project.getId(),
                    currentUser.getId()
                );
                healthByProject.put(project.getId(), health);
            } catch (Exception ignored) {
                // Health is best-effort for the dashboard aggregate.
            }
        }
        return healthByProject;
    }

    private List<Map<String, Object>> buildProjectCards(
        List<Project> projects,
        Map<UUID, Map<String, Object>> healthByProject,
        Map<UUID, Map<String, Long>> taskStatusByProject,
        Map<UUID, Map<String, Long>> taskPriorityByProject,
        Map<UUID, Long> overdueTaskByProject,
        Map<UUID, Long> criticalOrBlockedByProject,
        Map<UUID, Long> openMilestoneByProject,
        Map<UUID, Long> overdueMilestoneByProject,
        Map<UUID, Long> memberCountByProject,
        Map<UUID, List<Map<String, Object>>> memberPreviewByProject
    ) {
        List<Map<String, Object>> cards = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Project project : projects) {
            UUID projectId = project.getId();
            Map<String, Object> health = healthByProject.getOrDefault(projectId, Map.of());
            Map<String, Object> signals = asObjectMap(health.get("signals"));

            Map<String, Long> statusCounts = createTaskStatusShape();
            statusCounts.putAll(taskStatusByProject.getOrDefault(projectId, Map.of()));

            Map<String, Long> priorityCounts = createTaskPriorityShape();
            priorityCounts.putAll(taskPriorityByProject.getOrDefault(projectId, Map.of()));

            long totalTasks = statusCounts.values().stream().mapToLong(Long::longValue).sum();
            long doneTasks = statusCounts.getOrDefault(Task.TaskStatus.done.name(), 0L);
            long overdueTasks = overdueTaskByProject.getOrDefault(projectId, 0L);
            long criticalOrBlockedTasks = criticalOrBlockedByProject.getOrDefault(projectId, 0L);
            long overdueMilestones = overdueMilestoneByProject.getOrDefault(projectId, 0L);
            long openMilestones = openMilestoneByProject.getOrDefault(projectId, 0L);
            long memberCount = memberCountByProject.getOrDefault(projectId, 0L);

            String riskLevel = asString(health.get("riskLevel"));
            double healthScore = asDouble(health.get("healthScore"));

            Map<String, Object> timeline = computeTimeline(project.getStartDate(), project.getEndDate(), today);
            double timelineProgress = asDouble(timeline.get("progressPct"));

            List<Map<String, Object>> phaseSegments = buildPhaseSegments(project.getPhasesJson(), timelineProgress);
            List<Map<String, Object>> memberPreview = memberPreviewByProject.getOrDefault(projectId, List.of());

            Map<String, Object> taskSummary = new LinkedHashMap<>();
            taskSummary.put("total", totalTasks);
            taskSummary.put("done", doneTasks);
            taskSummary.put("progressPct", totalTasks == 0 ? 0.0 : round1(((double) doneTasks / (double) totalTasks) * 100.0));
            taskSummary.put("status", statusCounts);
            taskSummary.put("priority", priorityCounts);
            taskSummary.put("overdue", overdueTasks);

            boolean isUrgent = overdueTasks > 0
                || criticalOrBlockedTasks > 0
                || overdueMilestones > 0
                || "HIGH".equalsIgnoreCase(riskLevel)
                || "CRITICAL".equalsIgnoreCase(riskLevel);

            Map<String, Object> urgent = new LinkedHashMap<>();
            urgent.put("isUrgent", isUrgent);
            urgent.put("overdueTasks", overdueTasks);
            urgent.put("criticalOrBlockedTasks", criticalOrBlockedTasks);
            urgent.put("overdueMilestones", overdueMilestones);

            Map<String, Object> members = new LinkedHashMap<>();
            members.put("count", memberCount);
            members.put("preview", memberPreview);

            Map<String, Object> card = new LinkedHashMap<>();
            card.put("id", projectId.toString());
            card.put("workspaceId", project.getWorkspace().getId().toString());
            card.put("workspaceName", project.getWorkspace().getName());
            card.put("name", project.getName());
            card.put("status", project.getStatus() == null ? null : project.getStatus().name());
            card.put("visibility", project.getVisibility() == null ? null : project.getVisibility().name());
            card.put("startDate", project.getStartDate() == null ? null : project.getStartDate().toString());
            card.put("endDate", project.getEndDate() == null ? null : project.getEndDate().toString());
            card.put("healthScore", healthScore);
            card.put("riskLevel", riskLevel);
            card.put("healthSignals", signals);
            card.put("taskSummary", taskSummary);
            card.put("timeline", timeline);
            card.put("phaseSegments", phaseSegments);
            card.put("members", members);
            card.put("milestoneCount", openMilestones);
            card.put("urgent", urgent);
            card.put("activitySparkline", List.of(asLong(signals.get("eventsLast14d"))));

            cards.add(card);
        }

        cards.sort(Comparator
            .comparing((Map<String, Object> card) -> urgencyRank(asObjectMap(card.get("urgent"))))
            .thenComparing(card -> -asDouble(card.get("healthScore")))
            .thenComparing(card -> asString(card.get("name")), String.CASE_INSENSITIVE_ORDER));

        return cards;
    }

    private List<Map<String, Object>> buildWorkspaceCards(
        List<Workspace> workspaces,
        Map<UUID, List<Project>> projectsByWorkspace,
        Map<UUID, List<Map<String, Object>>> projectCardsByWorkspace,
        Map<UUID, Map<String, Object>> overviewByWorkspace
    ) {
        List<Map<String, Object>> cards = new ArrayList<>();

        for (Workspace workspace : workspaces) {
            UUID workspaceId = workspace.getId();
            List<Project> wsProjects = projectsByWorkspace.getOrDefault(workspaceId, List.of());
            List<Map<String, Object>> wsProjectCards = projectCardsByWorkspace.getOrDefault(workspaceId, List.of());
            Map<String, Object> overviewRow = overviewByWorkspace.getOrDefault(workspaceId, Map.of());

            long active = wsProjects.stream().filter(project -> project.getStatus() == Project.ProjectStatus.ACTIVE).count();
            long completed = wsProjects.stream().filter(project -> project.getStatus() == Project.ProjectStatus.COMPLETED).count();
            long onHold = wsProjects.stream().filter(project -> project.getStatus() == Project.ProjectStatus.ON_HOLD).count();
            long urgent = wsProjectCards.stream()
                .filter(card -> asBoolean(asObjectMap(card.get("urgent")).get("isUrgent")))
                .count();

            double averageHealth = wsProjectCards.isEmpty()
                ? 0.0
                : round1(wsProjectCards.stream().mapToDouble(card -> asDouble(card.get("healthScore"))).average().orElse(0.0));

            Map<String, Object> card = new LinkedHashMap<>();
            card.put("id", workspaceId.toString());
            card.put("name", workspace.getName());
            card.put("slug", workspace.getSlug());
            card.put("orgType", workspace.getOrgType());
            card.put("projectCount", wsProjects.size());
            card.put("activeProjects", active);
            card.put("completedProjects", completed);
            card.put("onHoldProjects", onHold);
            card.put("memberCount", asLong(overviewRow.get("memberCount")));
            card.put("healthScore", averageHealth);
            card.put("healthState", healthLabel(averageHealth));
            card.put("urgentProjects", urgent);
            cards.add(card);
        }

        cards.sort(Comparator.comparing(card -> asString(card.get("name")), String.CASE_INSENSITIVE_ORDER));
        return cards;
    }

    private List<Map<String, Object>> collectActivityRows(List<Workspace> workspaces, int limit) {
        List<Map<String, Object>> rows = new ArrayList<>();
        int perWorkspaceLimit = Math.max(10, limit);

        for (Workspace workspace : workspaces) {
            UUID orgId = workspace.getOrganizationId();
            if (orgId == null) {
                continue;
            }

            List<Map<String, Object>> logs = auditLogService.fetchWorkspaceLogs(orgId, workspace.getId(), perWorkspaceLimit);
            for (Map<String, Object> log : logs) {
                String actionType = asString(log.get("action_type"));
                String entityType = asString(log.get("entity_type"));
                String entityId = asString(log.get("entity_id"));
                String actor = firstNonBlank(asString(log.get("full_name")), "System");
                String entityName = extractEntityName(asString(log.get("details_json")));
                Instant createdAt = toInstant(log.get("created_at"));

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("workspaceId", workspace.getId().toString());
                row.put("workspaceName", workspace.getName());
                row.put("actor", actor);
                row.put("type", actionType);
                row.put("entityType", entityType);
                row.put("entityId", entityId);
                row.put("message", buildActivityMessage(actionType, entityType, entityName));
                row.put("createdAt", createdAt == null ? null : createdAt.toString());
                rows.add(row);
            }
        }

        rows.sort(Comparator.comparing((Map<String, Object> row) -> toInstant(row.get("createdAt")),
            Comparator.nullsLast(Comparator.reverseOrder())));

        if (rows.size() <= limit) {
            return rows;
        }
        return rows.subList(0, limit);
    }

    private List<Map<String, Object>> buildPhaseSegments(String phasesJson, double overallProgressPct) {
        List<PhaseShape> parsed = parsePhaseShapes(phasesJson);
        if (parsed.isEmpty()) {
            parsed = List.of(
                new PhaseShape("Planning", 20.0),
                new PhaseShape("Execution", 55.0),
                new PhaseShape("Validation", 25.0)
            );
        }

        double totalWeight = parsed.stream().mapToDouble(phase -> phase.weight).sum();
        if (totalWeight <= 0.0) {
            return List.of();
        }

        List<Map<String, Object>> segments = new ArrayList<>();
        double cursor = 0.0;

        for (int i = 0; i < parsed.size(); i++) {
            PhaseShape phase = parsed.get(i);
            double width = (phase.weight / totalWeight) * 100.0;
            double start = cursor;
            double end = Math.min(100.0, start + width);

            double segmentProgress;
            if (overallProgressPct <= start) {
                segmentProgress = 0.0;
            } else if (overallProgressPct >= end) {
                segmentProgress = 100.0;
            } else {
                segmentProgress = ((overallProgressPct - start) / Math.max(0.0001, end - start)) * 100.0;
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", phase.name);
            row.put("startPct", round1(start));
            row.put("endPct", round1(end));
            row.put("weightPct", round1(width));
            row.put("progressPct", round1(segmentProgress));
            row.put("color", PHASE_COLORS.get(i % PHASE_COLORS.size()));
            segments.add(row);

            cursor = end;
        }

        if (!segments.isEmpty()) {
            segments.get(segments.size() - 1).put("endPct", 100.0);
        }

        return segments;
    }

    private List<PhaseShape> parsePhaseShapes(String phasesJson) {
        if (!StringUtils.hasText(phasesJson)) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(phasesJson);
            if (!root.isArray()) {
                return List.of();
            }

            List<PhaseShape> result = new ArrayList<>();
            for (JsonNode node : root) {
                String name = firstText(node, "name", "phaseName", "title", "label");
                double duration = firstPositiveNumber(node,
                    "durationDays",
                    "duration",
                    "days",
                    "estimatedDays",
                    "estimated_duration_days"
                );

                if (!StringUtils.hasText(name)) {
                    name = "Phase " + (result.size() + 1);
                }
                if (duration <= 0.0) {
                    duration = 1.0;
                }

                result.add(new PhaseShape(name, duration));
            }
            return result;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private Map<String, Object> computeTimeline(LocalDate startDate, LocalDate endDate, LocalDate today) {
        Map<String, Object> timeline = new LinkedHashMap<>();

        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            timeline.put("known", false);
            timeline.put("startDate", startDate == null ? null : startDate.toString());
            timeline.put("endDate", endDate == null ? null : endDate.toString());
            timeline.put("totalDays", null);
            timeline.put("elapsedDays", null);
            timeline.put("daysRemaining", null);
            timeline.put("progressPct", 0.0);
            timeline.put("state", "UNKNOWN");
            return timeline;
        }

        long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long elapsed;

        if (today.isBefore(startDate)) {
            elapsed = 0;
        } else if (today.isAfter(endDate)) {
            elapsed = totalDays;
        } else {
            elapsed = ChronoUnit.DAYS.between(startDate, today) + 1;
        }

        long daysRemaining = Math.max(0L, ChronoUnit.DAYS.between(today, endDate));
        double progressPct = totalDays <= 0 ? 0.0 : round1(((double) elapsed / (double) totalDays) * 100.0);

        String state;
        if (today.isBefore(startDate)) {
            state = "UPCOMING";
        } else if (today.isAfter(endDate)) {
            state = "PAST_DUE";
        } else {
            state = "ACTIVE";
        }

        timeline.put("known", true);
        timeline.put("startDate", startDate.toString());
        timeline.put("endDate", endDate.toString());
        timeline.put("totalDays", totalDays);
        timeline.put("elapsedDays", elapsed);
        timeline.put("daysRemaining", daysRemaining);
        timeline.put("progressPct", progressPct);
        timeline.put("state", state);
        return timeline;
    }

    private double timelinePositionPct(LocalDate startDate,
                                       LocalDate endDate,
                                       LocalDate markerDate,
                                       int index,
                                       int totalMarkers) {
        if (startDate != null && endDate != null && markerDate != null && !endDate.isBefore(startDate)) {
            long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
            if (totalDays <= 0) {
                return 0.0;
            }
            long fromStart = ChronoUnit.DAYS.between(startDate, markerDate);
            double pct = ((double) fromStart / (double) totalDays) * 100.0;
            return round1(Math.max(0.0, Math.min(100.0, pct)));
        }

        if (totalMarkers <= 1) {
            return 0.0;
        }
        return round1(((double) index / (double) (totalMarkers - 1)) * 100.0);
    }

    private Map<UUID, Map<String, Long>> toEnumCountMap(List<Object[]> rows) {
        Map<UUID, Map<String, Long>> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID projectId = asUuid(row.length > 0 ? row[0] : null);
            String key = asString(row.length > 1 ? row[1] : null);
            long count = asLong(row.length > 2 ? row[2] : null);

            if (projectId == null || !StringUtils.hasText(key)) {
                continue;
            }

            result.computeIfAbsent(projectId, ignored -> new LinkedHashMap<>())
                .merge(key, count, Long::sum);
        }
        return result;
    }

    private Map<UUID, Long> toCountMap(List<Object[]> rows) {
        Map<UUID, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID projectId = asUuid(row.length > 0 ? row[0] : null);
            long count = asLong(row.length > 1 ? row[1] : null);
            if (projectId != null) {
                result.put(projectId, count);
            }
        }
        return result;
    }

    private Map<UUID, List<Map<String, Object>>> toMemberPreview(List<Object[]> rows, int maxPerProject) {
        Map<UUID, List<Map<String, Object>>> result = new LinkedHashMap<>();

        for (Object[] row : rows) {
            UUID projectId = asUuid(row.length > 0 ? row[0] : null);
            if (projectId == null) {
                continue;
            }

            List<Map<String, Object>> preview = result.computeIfAbsent(projectId, ignored -> new ArrayList<>());
            if (preview.size() >= maxPerProject) {
                continue;
            }

            Map<String, Object> member = new LinkedHashMap<>();
            member.put("userId", row.length > 1 ? row[1] : null);
            member.put("fullName", asString(row.length > 2 ? row[2] : null));
            member.put("avatarUrl", asString(row.length > 3 ? row[3] : null));
            preview.add(member);
        }

        return result;
    }

    private Map<UUID, Map<String, Object>> indexWorkspaceOverviewRows(Map<String, Object> overviewPayload) {
        Object byWorkspaceRaw = overviewPayload.get("byWorkspace");
        if (!(byWorkspaceRaw instanceof List<?> rows)) {
            return Map.of();
        }

        Map<UUID, Map<String, Object>> indexed = new LinkedHashMap<>();
        for (Object row : rows) {
            if (!(row instanceof Map<?, ?> map)) {
                continue;
            }

            UUID workspaceId = asUuid(map.get("workspaceId"));
            if (workspaceId == null) {
                continue;
            }

            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((key, value) -> normalized.put(String.valueOf(key), value));
            indexed.put(workspaceId, normalized);
        }
        return indexed;
    }

    private Object readNested(Map<String, Object> payload, String section, String key) {
        Object sectionRaw = payload.get(section);
        if (sectionRaw instanceof Map<?, ?> map) {
            return map.get(key);
        }
        return null;
    }

    private String extractEntityName(String detailsJson) {
        if (!StringUtils.hasText(detailsJson)) {
            return null;
        }

        try {
            Map<String, Object> parsed = objectMapper.readValue(detailsJson, new TypeReference<>() {});
            Object name = parsed.get("name");
            return name == null ? null : String.valueOf(name);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String buildActivityMessage(String actionType, String entityType, String entityName) {
        String normalizedAction = StringUtils.hasText(actionType)
            ? actionType.replace('_', ' ').toLowerCase(Locale.ROOT)
            : "updated";

        normalizedAction = normalizedAction.substring(0, 1).toUpperCase(Locale.ROOT) + normalizedAction.substring(1);

        String subject;
        if (StringUtils.hasText(entityName)) {
            subject = entityName;
        } else if (StringUtils.hasText(entityType)) {
            subject = entityType.toLowerCase(Locale.ROOT);
        } else {
            subject = "item";
        }

        return normalizedAction + " " + subject;
    }

    private Instant toInstant(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Instant instant) {
            return instant;
        }
        if (raw instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (raw instanceof LocalDateTime localDateTime) {
            return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        }
        if (raw instanceof String text && StringUtils.hasText(text)) {
            try {
                return Instant.parse(text);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private UUID asUuid(Object raw) {
        if (raw instanceof UUID uuid) {
            return uuid;
        }
        if (raw == null) {
            return null;
        }
        try {
            return UUID.fromString(String.valueOf(raw));
        } catch (Exception ignored) {
            return null;
        }
    }

    private long asLong(Object raw) {
        if (raw instanceof Number n) {
            return n.longValue();
        }
        if (raw instanceof String text && StringUtils.hasText(text)) {
            try {
                return Long.parseLong(text.trim());
            } catch (Exception ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    private double asDouble(Object raw) {
        if (raw instanceof Number n) {
            return n.doubleValue();
        }
        if (raw instanceof String text && StringUtils.hasText(text)) {
            try {
                return Double.parseDouble(text.trim());
            } catch (Exception ignored) {
                return 0.0;
            }
        }
        return 0.0;
    }

    private boolean asBoolean(Object raw) {
        if (raw instanceof Boolean b) {
            return b;
        }
        if (raw instanceof String text && StringUtils.hasText(text)) {
            return Boolean.parseBoolean(text);
        }
        return false;
    }

    private String asString(Object raw) {
        if (raw == null) {
            return null;
        }
        String text = String.valueOf(raw);
        return text.isBlank() ? null : text;
    }

    private String firstNonBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private Map<String, Object> asObjectMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return Map.of();
        }

        Map<String, Object> normalized = new LinkedHashMap<>();
        map.forEach((key, value) -> normalized.put(String.valueOf(key), value));
        return normalized;
    }

    private Map<String, Long> createTaskStatusShape() {
        Map<String, Long> shape = new LinkedHashMap<>();
        for (Task.TaskStatus status : Task.TaskStatus.values()) {
            shape.put(status.name(), 0L);
        }
        return shape;
    }

    private Map<String, Long> createTaskPriorityShape() {
        Map<String, Long> shape = new LinkedHashMap<>();
        for (Task.TaskPriority priority : Task.TaskPriority.values()) {
            shape.put(priority.name(), 0L);
        }
        return shape;
    }

    private String buildGlobalHealthLabel(double score, long urgentProjects) {
        if (score >= 80.0 && urgentProjects == 0) {
            return "Portfolio execution is healthy and stable.";
        }
        if (score >= 60.0) {
            return "Portfolio execution is acceptable but needs active watch.";
        }
        return "Portfolio needs immediate intervention on risks and blockers.";
    }

    private String healthLabel(double score) {
        if (score >= 80.0) return "HEALTHY";
        if (score >= 60.0) return "WATCH";
        return "AT_RISK";
    }

    private int urgencyRank(Map<String, Object> urgentMap) {
        if (asBoolean(urgentMap.get("isUrgent"))) {
            return 0;
        }
        return 1;
    }

    private String firstText(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode child = node.get(key);
            if (child != null && child.isTextual() && StringUtils.hasText(child.asText())) {
                return child.asText();
            }
        }
        return null;
    }

    private double firstPositiveNumber(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode child = node.get(key);
            if (child == null || child.isNull()) {
                continue;
            }
            if (child.isNumber()) {
                double value = child.asDouble();
                if (value > 0.0) {
                    return value;
                }
            }
            if (child.isTextual() && StringUtils.hasText(child.asText())) {
                try {
                    double parsed = Double.parseDouble(child.asText().trim());
                    if (parsed > 0.0) {
                        return parsed;
                    }
                } catch (Exception ignored) {
                    // Ignore malformed numeric text.
                }
            }
        }
        return 0.0;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static final class PhaseShape {
        private final String name;
        private final double weight;

        private PhaseShape(String name, double weight) {
            this.name = Objects.requireNonNull(name);
            this.weight = weight;
        }
    }
}
