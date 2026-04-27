package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Smart analysis result for one milestone.
 * Returned by SmartMilestoneService and the analytics endpoint.
 */
@Data
@Builder
public class MilestoneRiskDto {

    private Long   milestoneId;
    private String milestoneName;

    // ── Dates ──────────────────────────────────────────────────────────────
    private LocalDate plannedDueDate;
    private LocalDate predictedDueDate;
    /** Positive = late, negative = ahead */
    private int    delayDays;

    // ── Risk ───────────────────────────────────────────────────────────────
    /** 0-100 */
    private float  riskScore;
    /** low | medium | high */
    private String riskLevel;

    // ── Task stats ─────────────────────────────────────────────────────────
    private int totalTasks;
    private int doneTasks;
    private int blockedTasks;
    private int overdueTasks;
    /** 0-100 */
    private float completionPct;
    /** tasks completed per calendar day */
    private float velocity;

    // ── Alerts ─────────────────────────────────────────────────────────────
    private List<String> alerts;
}
