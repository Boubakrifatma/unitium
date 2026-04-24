package com.example.pi_projet.service;

import com.example.pi_projet.dto.WhatIfResultDto;
import com.example.pi_projet.dto.WhatIfResultDto.AffectedMilestone;
import com.example.pi_projet.dto.WhatIfResultDto.AffectedTask;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency.DependencyType;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.TaskDependencyRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * What-If Simulation Service.
 *
 * Given a task and a hypothetical delay in days, cascade the impact
 * through all dependent tasks and milestones — WITHOUT persisting anything.
 *
 * Algorithm (BFS dependency cascade):
 * ──────────────────────────────────────────────────────────────
 * 1. Start with the delayed task
 * 2. Find all tasks that depend on it (direct + transitive)
 * 3. For each dependent task, compute the shift based on dependency type:
 *    - FS: shift start = predecessor newDueDate + 1
 *    - SS: shift start = predecessor newStartDate
 *    - FF: shift due   = predecessor newDueDate
 *    - SF: shift start = predecessor newStartDate (rare)
 * 4. Collect all affected milestones
 * 5. For each affected milestone, recompute risk score using shifted dates
 * ──────────────────────────────────────────────────────────────
 */
@Service
@RequiredArgsConstructor
public class WhatIfSimulationService {

    private final TaskRepository           taskRepo;
    private final TaskDependencyRepository depRepo;
    private final MilestoneRepository      milestoneRepo;
    private final SmartMilestoneService    smartService;

    /**
     * Simulate the cascading effect of delaying taskId by delayDays.
     * Returns a read-only result — nothing is persisted.
     */
    public WhatIfResultDto simulate(Long taskId, int delayDays) {
        Task root = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        // BFS to collect all transitively affected tasks
        Map<Long, LocalDate> newDueDates   = new LinkedHashMap<>();
        Map<Long, LocalDate> newStartDates = new LinkedHashMap<>();
        Map<Long, Task>      allTasks      = new HashMap<>();

        // Seed root task with delay
        LocalDate rootNewDue   = shift(root.getDueDate(),   delayDays);
        LocalDate rootNewStart = shift(root.getStartDate(), delayDays);
        newDueDates.put(taskId,   rootNewDue);
        newStartDates.put(taskId, rootNewStart);
        allTasks.put(taskId, root);

        Queue<Long> queue = new LinkedList<>();
        queue.add(taskId);

        while (!queue.isEmpty()) {
            Long current = queue.poll();
            // Get all tasks that have "current" as a dependency
            List<TaskDependency> downstream = depRepo.findByDependsOnTaskId(current);

            for (TaskDependency dep : downstream) {
                Task dependent = dep.getTask();
                if (allTasks.containsKey(dependent.getId())) continue; // already processed

                LocalDate predNewDue   = newDueDates.getOrDefault(current,   dep.getDependsOnTask().getDueDate());
                LocalDate predNewStart = newStartDates.getOrDefault(current, dep.getDependsOnTask().getStartDate());

                LocalDate depNewStart = dependent.getStartDate();
                LocalDate depNewDue   = dependent.getDueDate();
                int taskDuration = taskDuration(dependent);

                switch (dep.getDependencyType()) {
                    case finish_to_start -> {
                        // Dependent cannot start before predecessor finishes
                        depNewStart = next(predNewDue);
                        depNewDue   = depNewStart.plusDays(taskDuration);
                    }
                    case start_to_start -> {
                        // Dependent cannot start before predecessor starts
                        if (predNewStart != null && (depNewStart == null || predNewStart.isAfter(depNewStart))) {
                            depNewStart = predNewStart;
                            depNewDue   = depNewStart.plusDays(taskDuration);
                        }
                    }
                    case finish_to_finish -> {
                        // Dependent cannot finish before predecessor finishes
                        if (predNewDue != null && (depNewDue == null || predNewDue.isAfter(depNewDue))) {
                            depNewDue   = predNewDue;
                            depNewStart = depNewDue.minusDays(taskDuration);
                        }
                    }
                    case start_to_finish -> {
                        // Rare: dependent must finish after predecessor starts
                        if (predNewStart != null && (depNewDue == null || predNewStart.isAfter(depNewDue))) {
                            depNewDue   = predNewStart;
                            depNewStart = depNewDue.minusDays(taskDuration);
                        }
                    }
                }

                newDueDates.put(dependent.getId(),   depNewDue);
                newStartDates.put(dependent.getId(), depNewStart);
                allTasks.put(dependent.getId(), dependent);
                queue.add(dependent.getId());
            }
        }

        // Build affected tasks list (exclude root)
        List<AffectedTask> affectedTasks = new ArrayList<>();
        for (Map.Entry<Long, Task> e : allTasks.entrySet()) {
            if (e.getKey().equals(taskId)) continue;
            Task t = e.getValue();
            LocalDate origDue = t.getDueDate();
            LocalDate newDue  = newDueDates.get(t.getId());
            if (newDue != null && !newDue.equals(origDue)) {
                int shift = (int) java.time.temporal.ChronoUnit.DAYS.between(
                        origDue != null ? origDue : newDue, newDue);
                affectedTasks.add(AffectedTask.builder()
                        .taskId(t.getId())
                        .taskTitle(t.getTitle())
                        .originalDueDate(origDue)
                        .newDueDate(newDue)
                        .shiftDays(shift)
                        .build());
            }
        }

        // Collect affected milestones (unique)
        Set<Long> milestoneIds = new HashSet<>();
        for (Task t : allTasks.values()) {
            if (t.getMilestone() != null) milestoneIds.add(t.getMilestone().getId());
        }

        List<AffectedMilestone> affectedMilestones = new ArrayList<>();
        for (Long mid : milestoneIds) {
            var m = milestoneRepo.findByIdWithProject(mid).orElse(null);
            if (m == null) continue;

            // Compute the worst new due date among all shifted tasks of this milestone
            LocalDate worstNewDue = allTasks.values().stream()
                    .filter(t -> t.getMilestone() != null && t.getMilestone().getId().equals(mid))
                    .map(t -> newDueDates.getOrDefault(t.getId(), t.getDueDate()))
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(m.getDueDate());

            // Simple risk estimate: how many days does the milestone slip?
            int milestoneSlip = (m.getDueDate() != null && worstNewDue != null)
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(m.getDueDate(), worstNewDue)
                    : 0;
            float newRisk = Math.min(100f, (m.getRiskScore() != null ? m.getRiskScore() : 0f)
                    + milestoneSlip * 2f);
            String riskLevel = newRisk >= 70 ? "high" : newRisk >= 40 ? "medium" : "low";

            affectedMilestones.add(AffectedMilestone.builder()
                    .milestoneId(mid)
                    .milestoneName(m.getName())
                    .originalDueDate(m.getDueDate())
                    .newPredictedDate(worstNewDue)
                    .newRiskScore(newRisk)
                    .newRiskLevel(riskLevel)
                    .build());
        }

        return WhatIfResultDto.builder()
                .triggeredByTaskId(taskId)
                .triggeredByTaskTitle(root.getTitle())
                .hypotheticalDelayDays(delayDays)
                .affectedTasks(affectedTasks)
                .affectedMilestones(affectedMilestones)
                .totalCascadedTasks(affectedTasks.size())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private LocalDate shift(LocalDate date, int days) {
        return date != null ? date.plusDays(days) : LocalDate.now().plusDays(days);
    }

    private LocalDate next(LocalDate date) {
        return date != null ? date.plusDays(1) : LocalDate.now().plusDays(1);
    }

    private int taskDuration(Task t) {
        if (t.getStartDate() != null && t.getDueDate() != null) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(t.getStartDate(), t.getDueDate());
        }
        if (t.getEstimatedHours() != null) return Math.max(1, (int)(t.getEstimatedHours() / 8));
        return 1;
    }
}
