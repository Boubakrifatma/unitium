package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ml_churn_predictions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ChurnPrediction {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @PrePersist
    public void generateId() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }

    /** Organization this prediction targets. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    /** Active subscription at prediction time. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id", nullable = false)
    private Subscription subscription;

    /** Date when this prediction was computed (weekly batch). */
    @Column(name = "prediction_date", nullable = false)
    private LocalDate predictionDate;

    /** Churn probability in [0.0, 1.0] output by the LR + Random Forest ensemble. */
    @Column(name = "churn_probability", nullable = false, precision = 5, scale = 4)
    private BigDecimal churnProbability;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_segment", nullable = false, length = 20)
    private RiskSegment riskSegment;

    // ── Input features (stored for audit & retraining) ──

    /** Weekly active users / total users ratio at prediction time. */
    @Column(name = "wau_ratio", precision = 5, scale = 4)
    private BigDecimal wauRatio;

    /** ML feature usage rate within the past 7 days. */
    @Column(name = "ml_usage_rate", precision = 5, scale = 4)
    private BigDecimal mlUsageRate;

    /** Number of support tickets opened in the past 30 days. */
    @Column(name = "support_ticket_count")
    private Short supportTicketCount;

    /** Days since any member in the org last logged in. */
    @Column(name = "last_login_delta_days")
    private Integer lastLoginDeltaDays;

    /** Plan utilization across all quota dimensions (0–100%). */
    @Column(name = "plan_utilization_pct", precision = 5, scale = 2)
    private BigDecimal planUtilizationPct;

    /** Number of payment failures on the current subscription. */
    @Column(name = "payment_failures_count")
    private Short paymentFailuresCount;

    /** Months since the subscription was first activated. */
    @Column(name = "tenure_months")
    private Short tenureMonths;

    // ── Retention action ──

    @Enumerated(EnumType.STRING)
    @Column(name = "action_triggered", length = 20)
    private ActionTriggered actionTriggered;

    @Column(name = "action_triggered_at")
    private LocalDateTime actionTriggeredAt;

    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upsell_recommended_plan_id")
    private Plan upsellRecommendedPlan;

    
    @Column(name = "upsell_score", precision = 5, scale = 4)
    private BigDecimal upsellScore;

    
    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 20)
    private Outcome outcome;

    /** Timestamp when the outcome was recorded. */
    @Column(name = "outcome_at")
    private LocalDateTime outcomeAt;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ── Enums ──

    public enum RiskSegment { STABLE, MEDIUM_RISK, HIGH_RISK }

    public enum ActionTriggered { NONE, EMAIL, CS_CALL, DISCOUNT_OFFER }

    public enum Outcome { RETAINED, CHURNED, UPGRADED }
}
