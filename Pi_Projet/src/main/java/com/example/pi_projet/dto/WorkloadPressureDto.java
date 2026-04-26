package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkloadPressureDto {

    private int    score;
    private String level;          // CALM | MEDIUM | HIGH_STRESS
    private String levelLabel;     // "Calm" | "Medium" | "High Stress"
    private String color;          // hex color for UI
    private String message;        // human-readable summary
    private int    urgentCount;    // tasks due in <= 2 days
    private int    upcomingCount;  // tasks due in 3-7 days
    private int    overdueCount;
    private int    totalActiveTasks;

    private List<UrgentTaskInfo> urgentTasks;
    private List<DayPlanEntry>   weeklyPlan;

    // ── Nested: individual urgent task ──────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UrgentTaskInfo {
        private Long      taskId;
        private String    title;
        private String    projectName;
        private String    projectColor;
        private LocalDate dueDate;
        private long      daysLeft;
        private String    difficulty;
        private String    priority;
        private String    deadlineLabel;  // "2 days left" | "Overdue!" | "Due today!"
    }

    // ── Nested: one day in the weekly plan ──────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DayPlanEntry {
        private String        dayName;     // "Monday"
        private String        date;        // "2026-04-25"
        private boolean       isToday;
        private List<PlanTask> tasks;
        private int           dayScore;
        private boolean       isOverloaded;
    }

    // ── Nested: a task inside the weekly plan ───────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PlanTask {
        private Long      taskId;
        private String    title;
        private String    projectName;
        private String    projectColor;
        private String    difficulty;
        private String    priority;
        private LocalDate dueDate;
        private long      daysLeft;
        private String    deadlineLabel;
    }
}
