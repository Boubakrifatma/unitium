package com.example.pi_projet.service;

import com.example.pi_projet.dto.WorkloadPressureDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkloadService {

    private final TaskRepository taskRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public WorkloadPressureDto getPressure(Long userId) {

        LocalDate today = LocalDate.now();

        List<Task> activeTasks = taskRepository.findByAssignedTo_Id(userId)
                .stream()
                .filter(t -> t.getStatus() != Task.TaskStatus.done
                          && t.getStatus() != Task.TaskStatus.blocked)
                .collect(Collectors.toList());

        int totalScore   = 0;
        int urgentCount  = 0;
        int upcomingCount= 0;
        int overdueCount = 0;
        List<WorkloadPressureDto.UrgentTaskInfo> urgentTasks = new ArrayList<>();

        for (Task t : activeTasks) {
            if (t.getDueDate() == null) {
                // Tasks without a due date add base difficulty only
                Task.TaskDifficulty diff = effectiveDifficulty(t);
                totalScore += diffScore(diff);
                continue;
            }

            long daysLeft = ChronoUnit.DAYS.between(today, t.getDueDate());

            // Deadline proximity score
            if (daysLeft < 0) {
                totalScore += 4;
                overdueCount++;
            } else if (daysLeft < 2) {
                totalScore += 3;
                urgentCount++;
            } else if (daysLeft < 5) {
                totalScore += 2;
                upcomingCount++;
            } else if (daysLeft < 7) {
                totalScore += 1;
                upcomingCount++;
            }

            // Difficulty score
            Task.TaskDifficulty diff = effectiveDifficulty(t);
            totalScore += diffScore(diff);

            // Collect for urgent list (due within 5 days or overdue)
            if (daysLeft <= 5) {
                urgentTasks.add(buildUrgentInfo(t, daysLeft, today));
            }
        }

        urgentTasks.sort(Comparator.comparingLong(WorkloadPressureDto.UrgentTaskInfo::getDaysLeft));

        String level;
        String levelLabel;
        String color;
        if (totalScore <= 5) {
            level = "CALM";        levelLabel = "Calm";        color = "#22c55e";
        } else if (totalScore <= 10) {
            level = "MEDIUM";      levelLabel = "Medium";      color = "#f59e0b";
        } else {
            level = "HIGH_STRESS"; levelLabel = "High Stress"; color = "#ef4444";
        }

        String message = buildMessage(level, urgentCount, overdueCount, upcomingCount, activeTasks.size());

        List<WorkloadPressureDto.DayPlanEntry> weeklyPlan = buildWeeklyPlan(activeTasks, today);

        return WorkloadPressureDto.builder()
                .score(totalScore)
                .level(level)
                .levelLabel(levelLabel)
                .color(color)
                .message(message)
                .urgentCount(urgentCount)
                .upcomingCount(upcomingCount)
                .overdueCount(overdueCount)
                .totalActiveTasks(activeTasks.size())
                .urgentTasks(urgentTasks.stream().limit(10).collect(Collectors.toList()))
                .weeklyPlan(weeklyPlan)
                .build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Task.TaskDifficulty effectiveDifficulty(Task t) {
        if (t.getDifficulty() != null) return t.getDifficulty();
        if (t.getPriority() == null)   return Task.TaskDifficulty.medium;
        return switch (t.getPriority()) {
            case low      -> Task.TaskDifficulty.easy;
            case medium   -> Task.TaskDifficulty.medium;
            case high, critical -> Task.TaskDifficulty.hard;
        };
    }

    private int diffScore(Task.TaskDifficulty d) {
        return switch (d) {
            case easy   -> 1;
            case medium -> 2;
            case hard   -> 3;
        };
    }

    private String deadlineLabel(long daysLeft) {
        if (daysLeft < 0)  return "Overdue!";
        if (daysLeft == 0) return "Due today!";
        if (daysLeft == 1) return "1 day left";
        return daysLeft + " days left";
    }

    private String projectColor(String projectName) {
        if (projectName == null || projectName.isBlank()) return "#6366f1";
        String[] palette = {
            "#6366f1","#0ea5e9","#14b8a6","#f59e0b",
            "#ef4444","#8b5cf6","#ec4899","#10b981",
            "#f97316","#06b6d4"
        };
        int hash = 0;
        for (char c : projectName.toCharArray()) hash = (hash * 31 + c) & 0x7FFFFFFF;
        return palette[hash % palette.length];
    }

    private String buildMessage(String level, int urgent, int overdue, int upcoming, int total) {
        if ("HIGH_STRESS".equals(level)) {
            if (overdue > 0) return "Critical: " + overdue + " overdue task(s), " + urgent + " due very soon!";
            return "Critical week: " + urgent + " urgent deadline(s) approaching!";
        }
        if ("MEDIUM".equals(level)) {
            int n = urgent + upcoming;
            return n > 0
                ? "Stay focused: " + n + " task(s) need your attention this week."
                : "Moderate workload. Keep up the good work!";
        }
        if (total == 0) return "No active tasks. Enjoy the calm!";
        return "Great job! Your workload is well under control.";
    }

    private WorkloadPressureDto.UrgentTaskInfo buildUrgentInfo(Task t, long daysLeft, LocalDate today) {
        String pName = t.getProject() != null ? t.getProject().getName() : "";
        Task.TaskDifficulty diff = effectiveDifficulty(t);
        return WorkloadPressureDto.UrgentTaskInfo.builder()
                .taskId(t.getId())
                .title(t.getTitle())
                .projectName(pName)
                .projectColor(projectColor(pName))
                .dueDate(t.getDueDate())
                .daysLeft(daysLeft)
                .difficulty(diff.name())
                .priority(t.getPriority() != null ? t.getPriority().name() : "medium")
                .deadlineLabel(deadlineLabel(daysLeft))
                .build();
    }

    // ── Weekly plan builder ───────────────────────────────────────────────────

    private List<WorkloadPressureDto.DayPlanEntry> buildWeeklyPlan(List<Task> tasks, LocalDate today) {

        // Build an ordered map for the next 7 days
        LinkedHashMap<LocalDate, List<Task>> slots = new LinkedHashMap<>();
        for (int i = 0; i < 7; i++) slots.put(today.plusDays(i), new ArrayList<>());

        // Sort active tasks with a due date by urgency
        List<Task> withDue = tasks.stream()
                .filter(t -> t.getDueDate() != null)
                .sorted(Comparator.comparing(Task::getDueDate))
                .collect(Collectors.toList());

        Map<LocalDate, Integer> load = new LinkedHashMap<>();
        slots.keySet().forEach(d -> load.put(d, 0));

        final int MAX_PER_DAY = 3;

        for (Task task : withDue) {
            LocalDate due = task.getDueDate();
            // Target = the day itself if within window, otherwise last day of window
            LocalDate target = due.isBefore(today) ? today
                             : due.isAfter(today.plusDays(6)) ? today.plusDays(6)
                             : due;

            LocalDate assigned = leastLoadedDay(slots.keySet(), load, today, target, MAX_PER_DAY);
            if (assigned != null) {
                slots.get(assigned).add(task);
                load.merge(assigned, 1, Integer::sum);
            }
        }

        // Tasks without a due date go to least-loaded future day
        List<Task> noDue = tasks.stream()
                .filter(t -> t.getDueDate() == null)
                .collect(Collectors.toList());
        for (Task task : noDue) {
            LocalDate assigned = leastLoadedDay(slots.keySet(), load, today, today.plusDays(6), MAX_PER_DAY);
            if (assigned != null) {
                slots.get(assigned).add(task);
                load.merge(assigned, 1, Integer::sum);
            }
        }

        // Build result
        List<WorkloadPressureDto.DayPlanEntry> plan = new ArrayList<>();
        for (Map.Entry<LocalDate, List<Task>> e : slots.entrySet()) {
            LocalDate date = e.getKey();
            List<Task> dayTasks = e.getValue();

            int dayScore = dayTasks.stream()
                    .mapToInt(t -> diffScore(effectiveDifficulty(t)))
                    .sum();

            List<WorkloadPressureDto.PlanTask> planTasks = dayTasks.stream().map(t -> {
                String pName = t.getProject() != null ? t.getProject().getName() : "";
                Task.TaskDifficulty diff = effectiveDifficulty(t);
                long dl = t.getDueDate() != null ? ChronoUnit.DAYS.between(today, t.getDueDate()) : 99;
                return WorkloadPressureDto.PlanTask.builder()
                        .taskId(t.getId())
                        .title(t.getTitle())
                        .projectName(pName)
                        .projectColor(projectColor(pName))
                        .difficulty(diff.name())
                        .priority(t.getPriority() != null ? t.getPriority().name() : "medium")
                        .dueDate(t.getDueDate())
                        .daysLeft(dl)
                        .deadlineLabel(t.getDueDate() != null ? deadlineLabel(dl) : "No deadline")
                        .build();
            }).collect(Collectors.toList());

            plan.add(WorkloadPressureDto.DayPlanEntry.builder()
                    .dayName(date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH))
                    .date(date.toString())
                    .isToday(date.equals(today))
                    .tasks(planTasks)
                    .dayScore(dayScore)
                    .isOverloaded(dayScore >= 6)
                    .build());
        }

        return plan;
    }

    private LocalDate leastLoadedDay(Set<LocalDate> days, Map<LocalDate, Integer> load,
                                     LocalDate from, LocalDate upTo, int maxPerDay) {
        return days.stream()
                .filter(d -> !d.isBefore(from) && !d.isAfter(upTo)
                          && load.getOrDefault(d, 0) < maxPerDay)
                .min(Comparator.comparingInt(d -> load.getOrDefault(d, 0)))
                .orElse(null);
    }
}
