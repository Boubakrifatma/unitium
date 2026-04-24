package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Result of a what-if simulation (not persisted).
 */
@Data
@Builder
public class WhatIfResultDto {

    private Long   triggeredByTaskId;
    private String triggeredByTaskTitle;
    private int    hypotheticalDelayDays;

    private List<AffectedTask>      affectedTasks;
    private List<AffectedMilestone> affectedMilestones;
    private int    totalCascadedTasks;

    @Data @Builder
    public static class AffectedTask {
        private Long      taskId;
        private String    taskTitle;
        private LocalDate originalDueDate;
        private LocalDate newDueDate;
        private int       shiftDays;
    }

    @Data @Builder
    public static class AffectedMilestone {
        private Long      milestoneId;
        private String    milestoneName;
        private LocalDate originalDueDate;
        private LocalDate newPredictedDate;
        private float     newRiskScore;
        private String    newRiskLevel;
    }
}
