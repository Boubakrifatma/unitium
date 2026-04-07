package com.example.pi_projet.port;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TaskDataPort {
    List<TaskSummary> getOpenTasksByWorkspace(UUID workspaceId);
    List<DailyCompletionCount> getCompletionsByDay(UUID workspaceId, int weeks);
    int countCompletedInPeriod(UUID workspaceId, LocalDate from, LocalDate to);
    int countOverdueByWorkspace(UUID workspaceId);
    List<ProjectTaskStats> getTaskStatsByProject(UUID workspaceId);

    record TaskSummary(UUID id, UUID projectId, Long assigneeId, LocalDate dueDate, String status, LocalDate completedAt) {}
    record DailyCompletionCount(LocalDate date, int completions, int overdueCount) {}
    record ProjectTaskStats(UUID projectId, int total, int done, int overdue) {}
}
