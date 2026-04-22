package com.example.pi_projet.port;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Primary
@RequiredArgsConstructor
public class DatabaseWorkloadDataPort implements WorkloadDataPort {

    private static final double WEEKLY_CAPACITY_HOURS = 40.0;
    private static final double DEFAULT_TASK_HOURS = 4.0;
    private static final double MAX_TASK_HOURS = 16.0;
    private static final double OVERDUE_PENALTY_HOURS = 2.5;
    private static final double CRITICAL_PENALTY_HOURS = 2.0;

    private final TaskRepository taskRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Override
    public List<MemberLoadSummary> getLatestWorkloadByWorkspace(UUID workspaceId) {
        List<WorkspaceMember> members = workspaceMemberRepository.findActiveByWorkspaceIdWithUser(workspaceId);

        if (members.isEmpty()) {
            return List.of();
        }

        LocalDate today = LocalDate.now();
        Map<Long, List<Task>> openTasksByAssignee = taskRepository.findByProject_Workspace_Id(workspaceId).stream()
            .filter(task -> task.getAssignedTo() != null)
            .filter(task -> task.getStatus() != Task.TaskStatus.done)
            .collect(Collectors.groupingBy(task -> task.getAssignedTo().getId()));

        return members.stream()
            .map(member -> {
                List<Task> assigned = openTasksByAssignee.getOrDefault(member.getUserId(), List.of());
                long open = assigned.size();
                int overdue = (int) assigned.stream()
                    .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(today))
                    .count();
                int critical = (int) assigned.stream()
                    .filter(task -> task.getPriority() == Task.TaskPriority.critical)
                    .count();
                double estimatedHours = assigned.stream()
                    .map(Task::getEstimatedHours)
                    .filter(hours -> hours != null && hours > 0f)
                    .mapToDouble(hours -> Math.min(hours, MAX_TASK_HOURS))
                    .sum();

                long missingEstimates = assigned.stream()
                    .filter(task -> task.getEstimatedHours() == null || task.getEstimatedHours() <= 0f)
                    .count();

                double plannedHours = estimatedHours + (missingEstimates * DEFAULT_TASK_HOURS);
                double riskPenaltyHours = (overdue * OVERDUE_PENALTY_HOURS) + (critical * CRITICAL_PENALTY_HOURS);
                double demandHours = plannedHours + riskPenaltyHours;
                int loadPercentage = (int) Math.round((demandHours / WEEKLY_CAPACITY_HOURS) * 100.0);
                loadPercentage = (int) Math.max(0.0, Math.min(100.0, loadPercentage));

                return new MemberLoadSummary(member.getUserId(), loadPercentage);
            })
            .sorted(Comparator
                .comparingInt(WorkloadDataPort.MemberLoadSummary::loadPercentage)
                .reversed()
                .thenComparingLong(WorkloadDataPort.MemberLoadSummary::memberId))
            .toList();
    }
}
