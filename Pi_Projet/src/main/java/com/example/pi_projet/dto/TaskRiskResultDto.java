package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Returned by POST /api/tasks/check-risk.
 * Contains the ML prediction result so the frontend can display a
 * confirmation dialog before the user decides to actually save the task.
 */
@Data
@Builder
public class TaskRiskResultDto {

    /** Final combined risk score [0.0 – 1.0]. */
    private double riskScore;

    /** true when riskScore >= ML threshold. */
    private boolean highRisk;

    /** ML model threshold used for this prediction. */
    private double threshold;

    /** "hybrid (ML 70% + Text 30%)" or "ml_only". */
    private String method;

    /** LLM reasoning text when available (may be null). */
    private String reasoning;

    /** Computed user workload (hours) sent to the ML API. */
    private double userWorkload;

    /** true when the ML API was unreachable or returned an error.
     *  In fallback mode the frontend should still allow task creation. */
    private boolean fallback;

    /** Human-readable error detail when fallback = true. */
    private String fallbackReason;
}
