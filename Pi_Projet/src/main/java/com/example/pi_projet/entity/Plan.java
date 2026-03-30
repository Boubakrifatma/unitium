package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "plans")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Plan {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @PrePersist
    public void generateId() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }

    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "price_monthly_cents", nullable = false)
    private Integer priceMonthlyCents;

    @Column(name = "price_yearly_cents", nullable = false)
    private Integer priceYearlyCents;

    @Column(name = "max_workspaces")
    private Integer maxWorkspaces;

    @Column(name = "max_members_per_ws")
    private Integer maxMembersPerWs;

    @Column(name = "max_active_projects")
    private Integer maxActiveProjects;

    @Column(name = "storage_mb", nullable = false)
    private Long storageMb;

    @Enumerated(EnumType.STRING)
    @Column(name = "ml_tier", nullable = false, length = 20)
    private MlTier mlTier;

    @Column(name = "audit_log_days")
    private Integer auditLogDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "support_tier", nullable = false, length = 20)
    private SupportTier supportTier;

    @Column(name = "api_access", nullable = false)
    @Builder.Default
    private Boolean apiAccess = false;

    @Column(name = "api_calls_per_month")
    private Integer apiCallsPerMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "custom_integrations", nullable = false, length = 20)
    private CustomIntegrations customIntegrations;

    @Column(name = "sso_enabled", nullable = false)
    @Builder.Default
    private Boolean ssoEnabled = false;


    @Column(name = "lms_integration", nullable = false)
    @Builder.Default
    private Boolean lmsIntegration = false;


    @Column(name = "grade_export", nullable = false)
    @Builder.Default
    private Boolean gradeExport = false;


    @Column(name = "features_json", columnDefinition = "json")
    private String featuresJson;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "stripe_price_id_monthly", length = 255)
    private String stripePriceIdMonthly;

    @Column(name = "stripe_price_id_yearly", length = 255)
    private String stripePriceIdYearly;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ── Relations ──

    @OneToMany(mappedBy = "plan", fetch = FetchType.LAZY)
    private List<Subscription> subscriptions;

    @OneToMany(mappedBy = "recommendedPlan", fetch = FetchType.LAZY)
    private List<UpsellRecommendation> upsellRecommendations;


    @OneToMany(mappedBy = "upsellRecommendedPlan", fetch = FetchType.LAZY)
    private List<ChurnPrediction> churnUpsellTargets;

    // ── Enums ──

    public enum MlTier { NONE, BASIC, FULL, FULL_API }

    public enum SupportTier { COMMUNITY, EMAIL, PRIORITY, DEDICATED, ACADEMIC }

    public enum CustomIntegrations { NONE, LIMITED, FULL }
}
