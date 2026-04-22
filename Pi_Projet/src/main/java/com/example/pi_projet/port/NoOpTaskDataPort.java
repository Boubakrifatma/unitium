package com.example.pi_projet.port;

import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
public class NoOpTaskDataPort implements TaskDataPort {
    @Override public List<TaskSummary> getOpenTasksByWorkspace(UUID workspaceId) { return List.of(); }
    @Override public List<DailyCompletionCount> getCompletionsByDay(UUID workspaceId, int weeks) { return List.of(); }
    @Override public int countCompletedInPeriod(UUID workspaceId, LocalDate from, LocalDate to) { return 0; }
    @Override public int countOverdueByWorkspace(UUID workspaceId) { return 0; }
    @Override public List<ProjectTaskStats> getTaskStatsByProject(UUID workspaceId) { return List.of(); }
}
