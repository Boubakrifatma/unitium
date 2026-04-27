package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Executive dashboard snapshot for one project.
 */
@Data
@Builder
public class ProjectAnalyticsDto {

    private String projectId;
    private String projectName;

    // ── Progress ───────────────────────────────────────────────────────────
    /** 0-100 actual completion based on done tasks */
    private float actualProgressPct;
    /** 0-100 planned progress (elapsed time / total duration) */
    private float plannedProgressPct;
    /** actual - planned (positive = ahead) */
    private float scheduleVariance;

    // ── Health ─────────────────────────────────────────────────────────────
    /** low | medium | high */
    private String overallRisk;
    /** 0-100 */
    private float  overallRiskScore;
    private int    totalMilestones;
    private int    completedMilestones;
    private int    atRiskMilestones;
    private int    missedMilestones;
    private int    totalTasks;
    private int    doneTasks;
    private int    blockedTasks;
    private int    overdueTasks;

    // ── Milestones ─────────────────────────────────────────────────────────
    private List<MilestoneRiskDto> criticalMilestones;

    // ── Burn-down data ─────────────────────────────────────────────────────
    /** Date labels (ISO yyyy-MM-dd) */
    private List<String> burndownLabels;
    /** Ideal remaining tasks */
    private List<Integer> burndownIdeal;
    /** Actual remaining tasks */
    private List<Integer> burndownActual;
}
