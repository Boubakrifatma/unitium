package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "upsell_recommendations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UpsellRecommendation {

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
    @JoinColumn(name = "subscription_id", nullable = false)
    private Subscription subscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommended_plan_id", nullable = false)
    private Plan recommendedPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_dimension", nullable = false, length = 20)
    private TriggerDimension triggerDimension;

    @Column(name = "utilization_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal utilizationPct;

    @Column(name = "consecutive_days_above_80", nullable = false)
    @Builder.Default
    private Short consecutiveDaysAbove80 = 0;

    @Column(name = "prompt_message", columnDefinition = "text")
    private String promptMessage;


    @Column(name = "estimated_savings_h_per_week", precision = 6, scale = 2)
    private BigDecimal estimatedSavingsHPerWeek;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 25)
    private TriggerType triggerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private RecommendationStatus status = RecommendationStatus.PENDING;

    @Column(name = "shown_at")
    private LocalDateTime shownAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;


    @Column(name = "features_snapshot_json", columnDefinition = "json")
    private String featuresSnapshotJson;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ── Enums ──

    public enum TriggerDimension { MEMBERS, PROJECTS, STORAGE, ML_USAGE, API_CALLS }

    public enum TriggerType { DAILY_BATCH, REALTIME_THRESHOLD }

    public enum RecommendationStatus { PENDING, SHOWN, ACCEPTED, DISMISSED }
}
