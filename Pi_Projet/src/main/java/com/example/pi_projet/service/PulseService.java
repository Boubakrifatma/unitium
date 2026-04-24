package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.port.TaskDataPort;
import com.example.pi_projet.port.WorkloadDataPort;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskDependencyRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PulseService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final UserRepository userRepository;
    private final TaskDataPort taskDataPort;
    private final WorkloadDataPort workloadDataPort;

    public Map<String, Object> buildSnapshot(UUID workspaceId) {
        var workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND,
                "Workspace not found: " + workspaceId));

        List<String> warnings = new ArrayList<>();

        long totalProjects = projectRepository.countByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        long memberCount   = workspaceMemberRepository.countByWorkspaceIdAndDeletedAtIsNull(workspaceId);

        var openTasks = taskDataPort.getOpenTasksByWorkspace(workspaceId);

        var workloads = workloadDataPort.getLatestWorkloadByWorkspace(workspaceId);

        List<Project> projects = projectRepository.findAllByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        List<Task> workspaceTasks = taskRepository.findByProject_Workspace_Id(workspaceId);
        List<WorkspaceMember> members = workspaceMemberRepository.findActiveByWorkspaceIdWithUser(workspaceId);
        Map<Long, String> displayNames = buildDisplayNames(members, workspaceTasks);

        List<Object[]> rawEdges = projectMemberRepository.findCollaborationEdgesRaw(workspaceId);
        Set<Long> referencedUserIds = new LinkedHashSet<>();
        workloads.forEach(summary -> referencedUserIds.add(summary.memberId()));
        rawEdges.forEach(row -> {
            if (row == null || row.length < 2) {
                return;
            }
            referencedUserIds.add(((Number) row[0]).longValue());
            referencedUserIds.add(((Number) row[1]).longValue());
        });
        enrichDisplayNames(displayNames, referencedUserIds);

        List<Map<String, Object>> memberWorkloads = buildMemberWorkloads(workloads, displayNames);
        int overloadedCount = (int) memberWorkloads.stream()
            .filter(m -> (int) m.get("loadPercentage") > 85).count();

        List<UUID> projectIds = projects.stream().map(Project::getId).toList();
        List<Milestone> workspaceMilestones = projectIds.isEmpty()
            ? List.of()
            : milestoneRepository.findByProject_IdInAndDueDateIsNotNullOrderByDueDateAsc(projectIds);

        double onTrackPct = 0.0;
        if (!projects.isEmpty()) {
            long onTrack = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.ACTIVE
                          || p.getStatus() == Project.ProjectStatus.COMPLETED)
                .count();
            onTrackPct = (double) onTrack / projects.size() * 100.0;
        }

        List<Map<String, Object>> throughputs = buildProjectThroughputs(projects, workspaceTasks);
        Map<String, Object> taskIntelligence = buildTaskIntelligence(projects, workspaceTasks, workloads, displayNames);
        Map<String, Object> milestoneTimeline = buildMilestoneTimeline(workspaceMilestones);
        Map<String, Object> threeSignals = buildThreeSignals(projects, workspaceTasks, workspaceMilestones);

        List<Map<String, Object>> collaborationEdges = rawEdges.stream().map(row -> {
            Long aId = ((Number) row[0]).longValue();
            Long bId = ((Number) row[1]).longValue();
            long cnt = ((Number) row[2]).longValue();
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("memberAId", aId);
            e.put("nameA", displayNames.getOrDefault(aId, "User-" + aId));
            e.put("memberBId", bId);
            e.put("nameB", displayNames.getOrDefault(bId, "User-" + bId));
            e.put("sharedProjectCount", cnt);
            return e;
        }).toList();

        List<String> projectNames = projects.stream().map(Project::getName).toList();
        int[][] scores = buildHealthScores(projects);

        Map<String, Object> healthMatrix = new LinkedHashMap<>();
        healthMatrix.put("projectNames", projectNames);
        healthMatrix.put("scores", scores);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("workspaceName", workspace.getName());
        result.put("totalProjects", totalProjects);
        result.put("openTaskCount", openTasks.size());
        result.put("memberCount", memberCount);
        result.put("onTrackPercentage", Math.round(onTrackPct * 10.0) / 10.0);
        result.put("overloadedMemberCount", overloadedCount);
        result.put("memberWorkloads", memberWorkloads);
        result.put("projectThroughputs", throughputs);
        result.put("collaborationEdges", collaborationEdges);
        result.put("healthMatrix", healthMatrix);
        result.put("taskIntelligence", taskIntelligence);
        result.put("milestoneTimeline", milestoneTimeline);
        result.put("threeSignals", threeSignals);
        result.put("dataWarnings", warnings);
        return result;
    }

    public List<Map<String, Object>> buildHeatmap(UUID workspaceId, int weeks) {
        var completions = taskDataPort.getCompletionsByDay(workspaceId, weeks);
        if (!completions.isEmpty()) {
            return completions.stream()
                .sorted(Comparator.comparing(TaskDataPort.DailyCompletionCount::date))
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", c.date().toString());
                    m.put("completions", c.completions());
                    m.put("overdueCount", c.overdueCount());
                    return m;
                }).toList();
        }
        List<Map<String, Object>> empty = new ArrayList<>();
        LocalDate start = LocalDate.now().minusWeeks(weeks);
        for (int i = 0; i < weeks * 7; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", start.plusDays(i).toString());
            m.put("completions", 0);
            m.put("overdueCount", 0);
            empty.add(m);
        }
        return empty;
    }

    private List<Map<String, Object>> buildProjectThroughputs(List<Project> projects, List<Task> tasks) {
        if (projects.isEmpty() || tasks.isEmpty()) {
            return List.of();
        }

        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(9);
        Map<UUID, int[]> completionsByProject = new HashMap<>();

        for (Task task : tasks) {
            if (task.getStatus() != Task.TaskStatus.done
                || task.getCompletedAt() == null
                || task.getProject() == null
                || task.getProject().getId() == null) {
                continue;
            }

            LocalDate day = task.getCompletedAt().toLocalDate();
            if (day.isBefore(start) || day.isAfter(end)) {
                continue;
            }

            int index = (int) ChronoUnit.DAYS.between(start, day);
            int[] buckets = completionsByProject.computeIfAbsent(task.getProject().getId(), ignored -> new int[10]);
            buckets[index] += 1;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Project project : projects) {
            int[] buckets = completionsByProject.get(project.getId());
            if (buckets == null) {
                continue;
            }

            int sum = 0;
            List<Integer> last10 = new ArrayList<>(10);
            for (int value : buckets) {
                last10.add(value);
                sum += value;
            }
            if (sum == 0) {
                continue;
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("projectId", project.getId());
            row.put("name", project.getName());
            row.put("last10DayCompletions", last10);
            rows.add(row);
        }

        rows.sort(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("name")), String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    private Map<String, Object> buildTaskIntelligence(List<Project> projects,
                                                      List<Task> tasks,
                                                      List<WorkloadDataPort.MemberLoadSummary> workloads,
                                                      Map<Long, String> displayNames) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("available", !tasks.isEmpty());

        if (tasks.isEmpty()) {
            payload.put("priorityDistribution", Map.of());
            payload.put("blockerPressure", Map.of("blocked", 0L, "critical", 0L, "dependencyBlocked", 0L));
            payload.put("overdueByPhase", List.of());
            payload.put("velocityByProject", List.of());
            payload.put("completionMomentum", List.of());
            payload.put("memberTaskLoad", List.of());
            return payload;
        }

        LocalDate today = LocalDate.now();
        List<Task> openTasks = tasks.stream().filter(task -> task.getStatus() != Task.TaskStatus.done).toList();

        Map<String, Long> priorityDistribution = new LinkedHashMap<>();
        for (Task.TaskPriority priority : Task.TaskPriority.values()) {
            priorityDistribution.put(priority.name().toUpperCase(), 0L);
        }
        for (Task task : openTasks) {
            if (task.getPriority() != null) {
                priorityDistribution.merge(task.getPriority().name().toUpperCase(), 1L, Long::sum);
            }
        }

        Set<Long> workspaceTaskIds = tasks.stream().map(Task::getId).collect(Collectors.toSet());
        long dependencyBlocked = taskDependencyRepository.findAll().stream()
            .filter(dep -> dep.getTask() != null && dep.getDependsOnTask() != null)
            .filter(dep -> workspaceTaskIds.contains(dep.getTask().getId()) && workspaceTaskIds.contains(dep.getDependsOnTask().getId()))
            .filter(dep -> dep.getTask().getStatus() != Task.TaskStatus.done)
            .filter(dep -> dep.getDependsOnTask().getStatus() != Task.TaskStatus.done)
            .map(dep -> dep.getTask().getId())
            .distinct()
            .count();

        Map<String, Object> blockerPressure = new LinkedHashMap<>();
        blockerPressure.put("blocked", openTasks.stream().filter(task -> task.getStatus() == Task.TaskStatus.blocked).count());
        blockerPressure.put("critical", openTasks.stream().filter(task -> task.getPriority() == Task.TaskPriority.critical).count());
        blockerPressure.put("dependencyBlocked", dependencyBlocked);

        Map<String, Long> overdueByPhaseMap = new LinkedHashMap<>();
        for (Task task : openTasks) {
            if (task.getDueDate() == null || !task.getDueDate().isBefore(today)) {
                continue;
            }

            String phase = "UNMAPPED";
            if (task.getMilestone() != null) {
                phase = firstNonBlank(task.getMilestone().getPhaseName(), task.getMilestone().getPhaseKey(), "UNMAPPED");
            }
            overdueByPhaseMap.merge(phase, 1L, Long::sum);
        }
        List<Map<String, Object>> overdueByPhase = overdueByPhaseMap.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .map(entry -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("phase", entry.getKey());
                row.put("overdue", entry.getValue());
                return row;
            })
            .toList();

        LocalDate currentStart = today.minusDays(6);
        LocalDate previousStart = today.minusDays(13);
        LocalDate previousEnd = today.minusDays(7);

        Map<UUID, Long> currentWindow = new HashMap<>();
        Map<UUID, Long> previousWindow = new HashMap<>();
        Map<LocalDate, Integer> completionSeries = new LinkedHashMap<>();
        LocalDate seriesStart = today.minusDays(13);
        LocalDate cursor = seriesStart;
        while (!cursor.isAfter(today)) {
            completionSeries.put(cursor, 0);
            cursor = cursor.plusDays(1);
        }

        for (Task task : tasks) {
            if (task.getStatus() != Task.TaskStatus.done
                || task.getCompletedAt() == null
                || task.getProject() == null
                || task.getProject().getId() == null) {
                continue;
            }

            LocalDate completed = task.getCompletedAt().toLocalDate();
            if (!completed.isBefore(currentStart) && !completed.isAfter(today)) {
                currentWindow.merge(task.getProject().getId(), 1L, Long::sum);
            }
            if (!completed.isBefore(previousStart) && !completed.isAfter(previousEnd)) {
                previousWindow.merge(task.getProject().getId(), 1L, Long::sum);
            }
            if (completionSeries.containsKey(completed)) {
                completionSeries.merge(completed, 1, Integer::sum);
            }
        }

        List<Map<String, Object>> velocityByProject = projects.stream()
            .filter(project -> tasks.stream().anyMatch(task -> task.getProject() != null && project.getId().equals(task.getProject().getId())))
            .map(project -> {
                long current = currentWindow.getOrDefault(project.getId(), 0L);
                long previous = previousWindow.getOrDefault(project.getId(), 0L);
                double momentumPct = previous == 0L
                    ? (current > 0L ? 100.0 : 0.0)
                    : round1(((double) (current - previous) / (double) previous) * 100.0);

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("projectId", project.getId());
                row.put("projectName", project.getName());
                row.put("completedLast7Days", current);
                row.put("completedPrevious7Days", previous);
                row.put("momentumPct", momentumPct);
                return row;
            })
            .sorted(Comparator.comparing((Map<String, Object> row) -> asLong(row.get("completedLast7Days"))).reversed())
            .toList();

        List<Map<String, Object>> completionMomentum = completionSeries.entrySet().stream()
            .map(entry -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", entry.getKey().toString());
                row.put("completed", entry.getValue());
                return row;
            })
            .toList();

        Map<Long, Integer> loadByMember = workloads.stream()
            .collect(Collectors.toMap(WorkloadDataPort.MemberLoadSummary::memberId, WorkloadDataPort.MemberLoadSummary::loadPercentage, (left, right) -> left));

        Map<Long, long[]> memberCounters = new LinkedHashMap<>();
        for (Task task : openTasks) {
            if (task.getAssignedTo() == null) {
                continue;
            }
            Long memberId = task.getAssignedTo().getId();
            long[] counters = memberCounters.computeIfAbsent(memberId, ignored -> new long[3]);
            counters[0] += 1;
            if (task.getDueDate() != null && task.getDueDate().isBefore(today)) {
                counters[1] += 1;
            }
            if (task.getPriority() == Task.TaskPriority.critical) {
                counters[2] += 1;
            }
        }

        List<Map<String, Object>> memberTaskLoad = memberCounters.entrySet().stream()
            .map(entry -> {
                long[] counters = entry.getValue();
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("memberId", entry.getKey());
                row.put("displayName", displayNames.getOrDefault(entry.getKey(), "User-" + entry.getKey()));
                row.put("openTasks", counters[0]);
                row.put("overdueTasks", counters[1]);
                row.put("criticalTasks", counters[2]);
                row.put("loadPercentage", loadByMember.getOrDefault(entry.getKey(), 0));
                return row;
            })
            .sorted(Comparator.comparing((Map<String, Object> row) -> asLong(row.get("loadPercentage"))).reversed())
            .toList();

        payload.put("priorityDistribution", priorityDistribution);
        payload.put("blockerPressure", blockerPressure);
        payload.put("overdueByPhase", overdueByPhase);
        payload.put("velocityByProject", velocityByProject);
        payload.put("completionMomentum", completionMomentum);
        payload.put("memberTaskLoad", memberTaskLoad);
        payload.put("openTasks", openTasks.size());
        payload.put("totalTasks", tasks.size());
        return payload;
    }

    private Map<String, Object> buildMilestoneTimeline(List<Milestone> milestones) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (milestones.isEmpty()) {
            payload.put("available", false);
            payload.put("items", List.of());
            payload.put("summary", Map.of("upcoming7Days", 0L, "overdue", 0L, "overdueGates", 0L));
            return payload;
        }

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> items = new ArrayList<>();
        long upcoming7Days = 0L;
        long overdue = 0L;
        long overdueGates = 0L;

        for (Milestone milestone : milestones) {
            if (milestone.getDueDate() == null || milestone.getProject() == null || milestone.getProject().getId() == null) {
                continue;
            }
            if (milestone.getStatus() == Milestone.MilestoneStatus.completed) {
                continue;
            }

            long daysFromToday = ChronoUnit.DAYS.between(today, milestone.getDueDate());
            boolean isOverdue = daysFromToday < 0;
            boolean isGate = Boolean.TRUE.equals(milestone.getIsGate());

            if (daysFromToday >= 0 && daysFromToday <= 7) {
                upcoming7Days++;
            }
            if (isOverdue) {
                overdue++;
                if (isGate) {
                    overdueGates++;
                }
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", milestone.getId());
            row.put("projectId", milestone.getProject().getId());
            row.put("projectName", milestone.getProject().getName());
            row.put("name", milestone.getName());
            row.put("dueDate", milestone.getDueDate().toString());
            row.put("daysFromToday", daysFromToday);
            row.put("isOverdue", isOverdue);
            row.put("isGate", isGate);
            row.put("phaseKey", milestone.getPhaseKey());
            row.put("phaseName", milestone.getPhaseName());
            row.put("milestoneIndex", milestone.getMilestoneIndex());
            row.put("status", milestone.getStatus() == null ? null : milestone.getStatus().name());
            row.put("urgency", milestoneUrgency(daysFromToday, isGate));
            items.add(row);
        }

        items.sort(Comparator
            .comparing((Map<String, Object> row) -> asBoolean(row.get("isGate"))).reversed()
            .thenComparing(row -> asLong(row.get("daysFromToday"))));

        payload.put("available", !items.isEmpty());
        payload.put("items", items);
        payload.put("summary", Map.of(
            "upcoming7Days", upcoming7Days,
            "overdue", overdue,
            "overdueGates", overdueGates
        ));
        return payload;
    }

    private Map<String, Object> buildThreeSignals(List<Project> projects,
                                                   List<Task> tasks,
                                                   List<Milestone> milestones) {
        Map<String, Object> payload = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();

        Map<UUID, List<Task>> tasksByProject = tasks.stream()
            .filter(task -> task.getProject() != null && task.getProject().getId() != null)
            .collect(Collectors.groupingBy(task -> task.getProject().getId()));

        Map<UUID, List<Milestone>> milestonesByProject = milestones.stream()
            .filter(milestone -> milestone.getProject() != null && milestone.getProject().getId() != null)
            .collect(Collectors.groupingBy(milestone -> milestone.getProject().getId()));

        List<Map<String, Object>> projectCity = projects.stream().map(project -> {
            List<Task> projectTasks = tasksByProject.getOrDefault(project.getId(), List.of());
            List<Milestone> projectMilestones = milestonesByProject.getOrDefault(project.getId(), List.of());

            long openTaskCount = projectTasks.stream().filter(task -> task.getStatus() != Task.TaskStatus.done).count();
            long overdueTaskCount = projectTasks.stream()
                .filter(task -> task.getStatus() != Task.TaskStatus.done)
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(today))
                .count();
            long criticalTaskCount = projectTasks.stream()
                .filter(task -> task.getStatus() != Task.TaskStatus.done)
                .filter(task -> task.getPriority() == Task.TaskPriority.critical)
                .count();
            long gateOverdueCount = projectMilestones.stream()
                .filter(milestone -> milestone.getStatus() != Milestone.MilestoneStatus.completed)
                .filter(milestone -> Boolean.TRUE.equals(milestone.getIsGate()))
                .filter(milestone -> milestone.getDueDate() != null && milestone.getDueDate().isBefore(today))
                .count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("projectId", project.getId());
            row.put("name", project.getName());
            row.put("status", project.getStatus() == null ? null : project.getStatus().name());
            row.put("taskCount", projectTasks.size());
            row.put("openTaskCount", openTaskCount);
            row.put("overdueTaskCount", overdueTaskCount);
            row.put("criticalTaskCount", criticalTaskCount);
            row.put("gateOverdueCount", gateOverdueCount);
            row.put("healthHint", statusHealthHint(project.getStatus()));
            return row;
        }).toList();

        List<Map<String, Object>> milestoneOrbit = milestones.stream()
            .filter(milestone -> milestone.getProject() != null && milestone.getProject().getId() != null)
            .filter(milestone -> milestone.getStatus() != Milestone.MilestoneStatus.completed)
            .filter(milestone -> milestone.getDueDate() != null)
            .map(milestone -> {
                long daysFromToday = ChronoUnit.DAYS.between(today, milestone.getDueDate());
                boolean isGate = Boolean.TRUE.equals(milestone.getIsGate());

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", milestone.getId());
                row.put("projectId", milestone.getProject().getId());
                row.put("projectName", milestone.getProject().getName());
                row.put("name", milestone.getName());
                row.put("daysFromToday", daysFromToday);
                row.put("isGate", isGate);
                row.put("urgencyScore", milestoneUrgencyScore(daysFromToday, isGate));
                return row;
            })
            .toList();

        payload.put("available", !projectCity.isEmpty() || !milestoneOrbit.isEmpty());
        payload.put("projectCity", projectCity);
        payload.put("milestoneOrbit", milestoneOrbit);
        return payload;
    }

    private String milestoneUrgency(long daysFromToday, boolean isGate) {
        if (daysFromToday < 0) {
            return isGate ? "GATE_OVERDUE" : "OVERDUE";
        }
        if (daysFromToday == 0) {
            return isGate ? "GATE_TODAY" : "TODAY";
        }
        if (daysFromToday <= 3) {
            return isGate ? "GATE_SOON" : "SOON";
        }
        if (daysFromToday <= 7) {
            return isGate ? "GATE_UPCOMING" : "UPCOMING";
        }
        return isGate ? "GATE_FUTURE" : "FUTURE";
    }

    private int milestoneUrgencyScore(long daysFromToday, boolean isGate) {
        int score;
        if (daysFromToday < 0) {
            score = 95;
        } else if (daysFromToday == 0) {
            score = 88;
        } else if (daysFromToday <= 3) {
            score = 72;
        } else if (daysFromToday <= 7) {
            score = 58;
        } else {
            score = 32;
        }
        if (isGate) {
            score = Math.min(100, score + 12);
        }
        return score;
    }

    private int statusHealthHint(Project.ProjectStatus status) {
        if (status == null) {
            return 45;
        }
        return switch (status) {
            case COMPLETED, ARCHIVED -> 92;
            case ACTIVE -> 72;
            case PLANNING -> 48;
            case ON_HOLD -> 36;
            case CANCELLED -> 14;
        };
    }

    private String firstNonBlank(String first, String second, String fallback) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return fallback;
    }

    private long asLong(Object raw) {
        if (raw instanceof Number number) {
            return number.longValue();
        }
        if (raw == null) {
            return 0L;
        }
        try {
            return Long.parseLong(String.valueOf(raw));
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private boolean asBoolean(Object raw) {
        if (raw instanceof Boolean value) {
            return value;
        }
        if (raw == null) {
            return false;
        }
        return Boolean.parseBoolean(String.valueOf(raw));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Map<Long, String> buildDisplayNames(List<WorkspaceMember> members, List<Task> tasks) {
        Map<Long, String> displayNames = new LinkedHashMap<>();

        for (WorkspaceMember member : members) {
            if (member.getUserId() == null) {
                continue;
            }
            User user = member.getUser();
            displayNames.put(member.getUserId(), resolveDisplayName(member.getUserId(),
                user == null ? null : user.getFullName(),
                user == null ? null : user.getEmail()));
        }

        // Ensure names are available even when tasks reference users not currently linked as active members.
        for (Task task : tasks) {
            if (task.getAssignedTo() == null || task.getAssignedTo().getId() == null) {
                continue;
            }
            Long userId = task.getAssignedTo().getId();
            displayNames.putIfAbsent(userId, resolveDisplayName(userId, task.getAssignedTo().getFullName(), task.getAssignedTo().getEmail()));
        }

        return displayNames;
    }

    private String resolveDisplayName(Long userId, String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        if (email != null && !email.isBlank()) {
            String normalized = email.trim();
            int at = normalized.indexOf('@');
            return at > 0 ? normalized.substring(0, at) : normalized;
        }
        return userId == null ? "Unknown" : "User-" + userId;
    }

    private void enrichDisplayNames(Map<Long, String> displayNames, Set<Long> referencedUserIds) {
        if (referencedUserIds == null || referencedUserIds.isEmpty()) {
            return;
        }

        List<Long> missing = referencedUserIds.stream()
            .filter(Objects::nonNull)
            .filter(userId -> {
                String existing = displayNames.get(userId);
                return existing == null || existing.isBlank() || existing.startsWith("User-");
            })
            .toList();

        if (missing.isEmpty()) {
            return;
        }

        userRepository.findAllById(missing).forEach(user -> {
            if (user.getId() == null) {
                return;
            }
            displayNames.put(user.getId(), resolveDisplayName(user.getId(), user.getFullName(), user.getEmail()));
        });
    }

    private List<Map<String, Object>> buildMemberWorkloads(
            List<WorkloadDataPort.MemberLoadSummary> workloads,
            Map<Long, String> displayNames) {
        if (workloads.isEmpty()) {
            return List.of();
        }
        return workloads.stream().map(w -> {
            long id = w.memberId();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("memberId", id);
            m.put("displayName", displayNames.getOrDefault(id, "Unknown"));
            m.put("loadPercentage", w.loadPercentage());
            return m;
        }).toList();
    }

    private int[][] buildHealthScores(List<Project> projects) {
        int[][] scores = new int[projects.size()][4];
        for (int i = 0; i < projects.size(); i++) {
            Project p = projects.get(i);
            scores[i][0] = switch (p.getStatus()) {
                case COMPLETED, ARCHIVED -> 100;
                case ACTIVE   -> 60;
                case PLANNING -> 20;
                case ON_HOLD  -> 30;
                case CANCELLED -> 0;
            };
            long daysSince = ChronoUnit.DAYS.between(p.getCreatedAt(), java.time.Instant.now());
            scores[i][1] = (int) Math.max(0, 100 - daysSince);
            long projMembers = projectMemberRepository.findAllByProjectId(p.getId()).stream()
                .filter(pm -> pm.getDeletedAt() == null).count();
            scores[i][2] = (int) Math.min(100, projMembers * 20);
            scores[i][3] = 100 - scores[i][0];
        }
        return scores;
    }
}
