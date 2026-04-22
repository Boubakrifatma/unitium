package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "usage_metrics",
       uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "metric_date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UsageQuota {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @PrePersist
    public void generateId() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    /** Date of this usage snapshot (one row per org per day). */
    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    /** Total active members across all workspaces in the org on this date. */
    @Column(name = "active_members_count", nullable = false)
    @Builder.Default
    private Integer activeMembersCount = 0;

    /** Total workspaces owned by the org on this date. */
    @Column(name = "workspaces_count", nullable = false)
    @Builder.Default
    private Integer workspacesCount = 0;

    /** Total active projects across all workspaces on this date. */
    @Column(name = "projects_count", nullable = false)
    @Builder.Default
    private Integer projectsCount = 0;

    /** Total storage consumed by the org in gigabytes on this date. */
    @Column(name = "storage_used_gb", nullable = false)
    @Builder.Default
    private Double storageUsedGb = 0.0;

    /** REST API calls made by the org on this date (Enterprise plan only). */
    @Column(name = "api_calls_count", nullable = false)
    @Builder.Default
    private Long apiCallsCount = 0L;

    /** ML model inference requests made by the org on this date. */
    @Column(name = "ml_inferences_count", nullable = false)
    @Builder.Default
    private Long mlInferencesCount = 0L;

    /** Grade CSV exports performed on this date (Academic plan only). */
    @Column(name = "grade_exports_count", nullable = false)
    @Builder.Default
    private Integer gradeExportsCount = 0;

    /** Timestamp when this snapshot was computed by the daily batch job. */
    @Column(name = "computed_at")
    private LocalDateTime computedAt;

    /** Timestamp of the last incremental update (real-time quota enforcement). */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Fired when any dimension crosses the 80% quota threshold. */
    @Column(name = "quota_alert_80_sent_at")
    private LocalDateTime quotaAlert80SentAt;

    /** Fired when any dimension reaches 100% quota. */
    @Column(name = "quota_alert_100_sent_at")
    private LocalDateTime quotaAlert100SentAt;
}
