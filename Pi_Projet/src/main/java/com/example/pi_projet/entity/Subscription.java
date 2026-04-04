package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "subscriptions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Subscription {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SubscriptionStatus status;


    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 15)
    private BillingCycle billingCycle;

    @Column(name = "trial_starts_at")
    private LocalDateTime trialStartsAt;

    @Column(name = "trial_ends_at")
    private LocalDateTime trialEndsAt;

    @Column(name = "current_period_start")
    private LocalDateTime currentPeriodStart;

    @Column(name = "current_period_end")
    private LocalDateTime currentPeriodEnd;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    @Column(name = "cancel_at_period_end", nullable = false)
    @Builder.Default
    private Boolean cancelAtPeriodEnd = false;

    @Column(name = "stripe_subscription_id", unique = true, length = 255)
    private String stripeSubscriptionId;

    @Column(name = "stripe_payment_method_id", length = 255)
    private String stripePaymentMethodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method_type", length = 20)
    private PaymentMethodType paymentMethodType;

    /** Grace period after payment failure before suspension. */
    @Column(name = "grace_period_ends_at")
    private LocalDateTime gracePeriodEndsAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "downgraded_from_plan_id")
    private Plan downgradedFromPlan;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ── Relations ──

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Invoice> invoices;

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PaymentAttempt> paymentAttempts;


    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UpsellRecommendation> upsellRecommendations;


    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ChurnPrediction> churnPredictions;

    // ── Enums ──

    public enum SubscriptionStatus { TRIALING, ACTIVE, PAST_DUE, CANCELED, PAUSED }


    public enum BillingCycle { MONTHLY, ANNUAL, INSTITUTIONAL }

    public enum PaymentMethodType { CARD, SEPA_DEBIT }
}
