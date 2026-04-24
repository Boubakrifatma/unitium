package com.example.pi_projet.port;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Primary
@RequiredArgsConstructor
public class DatabaseTaskDataPort implements TaskDataPort {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;

    @Override
    public List<TaskSummary> getOpenTasksByWorkspace(UUID workspaceId) {
        return taskRepository.findByProject_Workspace_Id(workspaceId).stream()
            .filter(task -> task.getStatus() != Task.TaskStatus.done)
            .map(this::toSummary)
            .toList();
    }

    @Override
    public List<DailyCompletionCount> getCompletionsByDay(UUID workspaceId, int weeks) {
        int safeWeeks = Math.max(1, Math.min(26, weeks));
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays((safeWeeks * 7L) - 1L);

        Map<LocalDate, Integer> completionsByDay = new HashMap<>();
        Map<LocalDate, Integer> overdueByDay = new HashMap<>();

        for (Task task : taskRepository.findByProject_Workspace_Id(workspaceId)) {
            if (task.getStatus() == Task.TaskStatus.done && task.getCompletedAt() != null) {
                LocalDate completionDay = task.getCompletedAt().toLocalDate();
                if (!completionDay.isBefore(start) && !completionDay.isAfter(end)) {
                    completionsByDay.merge(completionDay, 1, Integer::sum);
                }
            }

            if (task.getStatus() != Task.TaskStatus.done && task.getDueDate() != null) {
                LocalDate due = task.getDueDate();
                if (!due.isBefore(start) && !due.isAfter(end)) {
                    overdueByDay.merge(due, 1, Integer::sum);
                }
            }
        }

        List<DailyCompletionCount> result = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            result.add(new DailyCompletionCount(
                cursor,
                completionsByDay.getOrDefault(cursor, 0),
                overdueByDay.getOrDefault(cursor, 0)
            ));
            cursor = cursor.plusDays(1);
        }

        return result;
    }

    @Override
    public int countCompletedInPeriod(UUID workspaceId, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            return 0;
        }
        int count = 0;
        for (Task task : taskRepository.findByProject_Workspace_Id(workspaceId)) {
            if (task.getStatus() != Task.TaskStatus.done || task.getCompletedAt() == null) {
                continue;
            }
            LocalDate completed = task.getCompletedAt().toLocalDate();
            if (!completed.isBefore(from) && !completed.isAfter(to)) {
                count++;
            }
        }
        return count;
    }

    @Override
    public int countOverdueByWorkspace(UUID workspaceId) {
        LocalDate today = LocalDate.now();
        int count = 0;
        for (Task task : taskRepository.findByProject_Workspace_Id(workspaceId)) {
            if (task.getStatus() != Task.TaskStatus.done
                && task.getDueDate() != null
                && task.getDueDate().isBefore(today)) {
                count++;
            }
        }
        return count;
    }

    @Override
    public List<ProjectTaskStats> getTaskStatsByProject(UUID workspaceId) {
        LocalDate today = LocalDate.now();
        List<Project> projects = projectRepository.findAllByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        if (projects.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<Task>> tasksByProjectId = taskRepository.findByProject_Workspace_Id(workspaceId).stream()
            .filter(task -> task.getProject() != null && task.getProject().getId() != null)
            .collect(Collectors.groupingBy(task -> task.getProject().getId()));

        List<ProjectTaskStats> stats = new ArrayList<>();
        for (Project project : projects) {
            List<Task> tasks = tasksByProjectId.getOrDefault(project.getId(), List.of());
            int total = tasks.size();
            int done = (int) tasks.stream().filter(task -> task.getStatus() == Task.TaskStatus.done).count();
            int overdue = (int) tasks.stream()
                .filter(task -> task.getStatus() != Task.TaskStatus.done)
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(today))
                .count();
            stats.add(new ProjectTaskStats(project.getId(), total, done, overdue));
        }

        return stats;
    }

    private TaskSummary toSummary(Task task) {
        return new TaskSummary(
            task.getId(),
            task.getProject() == null ? null : task.getProject().getId(),
            task.getAssignedTo() == null ? null : task.getAssignedTo().getId(),
            task.getDueDate(),
            task.getStatus() == null ? null : task.getStatus().name(),
            task.getCompletedAt() == null ? null : task.getCompletedAt().toLocalDate()
        );
    }
}
