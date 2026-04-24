package com.example.pi_projet.service;

import com.example.pi_projet.dto.MilestoneRiskDto;
import com.example.pi_projet.dto.ProjectAnalyticsDto;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone.MilestoneStatus;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task.TaskStatus;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Executive dashboard analytics — multi-project KPIs.
 */
@Service
@RequiredArgsConstructor
public class ProjectAnalyticsService {

    private final ProjectRepository    projectRepo;
    private final MilestoneRepository  milestoneRepo;
    private final TaskRepository       taskRepo;
    private final SmartMilestoneService smartService;

    /**
     * Returns analytics for all projects in a workspace.
     */
    public List<ProjectAnalyticsDto> getWorkspaceAnalytics(UUID workspaceId) {
        List<Project> projects = projectRepo.findAllByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        return projects.stream()
                .map(this::buildProjectAnalytics)
                .collect(Collectors.toList());
    }

    /**
     * Returns analytics for a single project.
     */
    public ProjectAnalyticsDto getProjectAnalytics(UUID projectId) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));
        return buildProjectAnalytics(project);
    }

    // ── Core builder ──────────────────────────────────────────────────────

    private ProjectAnalyticsDto buildProjectAnalytics(Project project) {
        List<Milestone> milestones = milestoneRepo.findByProject_Id(project.getId());
        List<Task>      tasks      = taskRepo.findByProject_Id(project.getId());

        LocalDate today = LocalDate.now();

        // ── Task stats ──────────────────────────────────────────────────
        int totalTasks   = tasks.size();
        int doneTasks    = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.done).count();
        int blockedTasks = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.blocked).count();
        int overdueTasks = (int) tasks.stream()
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(today)
                        && t.getStatus() != TaskStatus.done)
                .count();

        float actualPct  = totalTasks == 0 ? 0f : (doneTasks * 100f) / totalTasks;
        float plannedPct = computePlannedProgress(project, today);
        float variance   = actualPct - plannedPct;

        // ── Milestone stats ─────────────────────────────────────────────
        int completed  = (int) milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.completed).count();
        int atRisk     = (int) milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.at_risk).count();
        int missed     = (int) milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.missed).count();

        // ── Risk ────────────────────────────────────────────────────────
        float overallRisk = milestones.isEmpty() ? 0f : (float) milestones.stream()
                .mapToDouble(m -> m.getRiskScore() != null ? m.getRiskScore() : 0f)
                .average().orElse(0f);
        String riskLevel = overallRisk >= 70 ? "high" : overallRisk >= 40 ? "medium" : "low";

        // ── Critical milestones (top 5 by risk score) ───────────────────
        List<MilestoneRiskDto> critical = milestones.stream()
                .filter(m -> m.getRiskScore() != null && m.getRiskScore() >= 40)
                .sorted(Comparator.comparingDouble((Milestone m) ->
                        m.getRiskScore() != null ? m.getRiskScore() : 0f).reversed())
                .limit(5)
                .map(m -> smartService.analyse(m.getId()))
                .collect(Collectors.toList());

        // ── Burn-down ────────────────────────────────────────────────────
        BurndownData bd = buildBurndown(project, tasks, today);

        return ProjectAnalyticsDto.builder()
                .projectId(project.getId().toString())
                .projectName(project.getName())
                .actualProgressPct(actualPct)
                .plannedProgressPct(plannedPct)
                .scheduleVariance(variance)
                .overallRisk(riskLevel)
                .overallRiskScore(overallRisk)
                .totalMilestones(milestones.size())
                .completedMilestones(completed)
                .atRiskMilestones(atRisk)
                .missedMilestones(missed)
                .totalTasks(totalTasks)
                .doneTasks(doneTasks)
                .blockedTasks(blockedTasks)
                .overdueTasks(overdueTasks)
                .criticalMilestones(critical)
                .burndownLabels(bd.labels)
                .burndownIdeal(bd.ideal)
                .burndownActual(bd.actual)
                .build();
    }

    // ── Planned progress ──────────────────────────────────────────────────

    /**
     * Planned progress = (elapsed days / total days) * 100
     * Uses the earliest task start and latest task due date as project bounds.
     */
    private float computePlannedProgress(Project project, LocalDate today) {
        List<Task> tasks = taskRepo.findByProject_Id(project.getId());
        if (tasks.isEmpty()) return 0f;

        LocalDate start = tasks.stream()
                .map(Task::getStartDate).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(today);
        LocalDate end = tasks.stream()
                .map(Task::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(today);

        if (!today.isAfter(start)) return 0f;
        if (!today.isBefore(end))  return 100f;

        long total   = ChronoUnit.DAYS.between(start, end);
        long elapsed = ChronoUnit.DAYS.between(start, today);
        return total == 0 ? 100f : (elapsed * 100f) / total;
    }

    // ── Burn-down ─────────────────────────────────────────────────────────

    private record BurndownData(List<String> labels, List<Integer> ideal, List<Integer> actual) {}

    private BurndownData buildBurndown(Project project, List<Task> tasks, LocalDate today) {
        if (tasks.isEmpty()) return new BurndownData(List.of(), List.of(), List.of());

        LocalDate start = tasks.stream()
                .map(Task::getStartDate).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(today.minusDays(14));
        LocalDate end = tasks.stream()
                .map(Task::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(today.plusDays(14));

        int totalTasks = tasks.size();
        long totalDays = ChronoUnit.DAYS.between(start, end);
        if (totalDays <= 0) return new BurndownData(List.of(), List.of(), List.of());

        // Build weekly points (at most 12 points)
        int step = (int) Math.max(1, totalDays / 12);
        List<String>  labels = new ArrayList<>();
        List<Integer> ideal  = new ArrayList<>();
        List<Integer> actual = new ArrayList<>();

        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            labels.add(cursor.toString());

            // Ideal: linear burn-down
            long elapsed = ChronoUnit.DAYS.between(start, cursor);
            int idealRemaining = (int) Math.max(0,
                    totalTasks - (totalTasks * elapsed / totalDays));
            ideal.add(idealRemaining);

            // Actual: tasks NOT done as of this date
            final LocalDate c = cursor;
            int notDoneByDate = (int) tasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.done
                            || (t.getCompletedAt() != null
                            && t.getCompletedAt().toLocalDate().isAfter(c)))
                    .count();
            actual.add(cursor.isAfter(today) ? null : notDoneByDate);

            cursor = cursor.plusDays(step);
        }

        return new BurndownData(labels, ideal, actual);
    }
}
