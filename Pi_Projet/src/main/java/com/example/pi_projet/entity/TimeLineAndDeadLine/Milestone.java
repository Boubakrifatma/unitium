package com.example.pi_projet.entity.TimeLineAndDeadLine;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "milestones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Milestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MilestoneStatus status;

    @Column(name = "completion_pct")
    private Float completionPct;

    @Builder.Default
    @Column(name = "is_gate", nullable = false)
    private Boolean isGate = false;

    @Column(name = "phase_key", length = 120)
    private String phaseKey;

    @Column(name = "phase_name", length = 160)
    private String phaseName;

    @Column(name = "milestone_index")
    private Integer milestoneIndex;

    @Column(name = "source_milestone_key", length = 120)
    private String sourceMilestoneKey;

    // ── Smart fields (computed by SmartMilestoneService) ─────────────────────

    /** 0-100 risk score. >= 70 = high risk, 40-69 = medium, < 40 = low. */
    @Column(name = "risk_score")
    private Float riskScore;

    /** AI-predicted delivery date based on task velocity. */
    @Column(name = "predicted_due_date")
    private LocalDate predictedDueDate;

    /** Estimated delay in days (negative = ahead of schedule). */
    @Column(name = "delay_days")
    private Integer delayDays;

    /** When smart analysis was last run. */
    @Column(name = "last_computed_at")
    private LocalDateTime lastComputedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = MilestoneStatus.pending;
        if (completionPct == null) completionPct = 0f;
        if (isGate == null) isGate = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum MilestoneStatus {
        pending, in_progress, at_risk, completed, missed
    }
}