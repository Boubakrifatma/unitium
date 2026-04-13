package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ml_team_recommendations",
        indexes = {
                @Index(name = "idx_mltr_project", columnList = "project_id"),
                @Index(name = "idx_mltr_user", columnList = "recommended_user_id"),
                @Index(name = "idx_mltr_status", columnList = "status")
        }
)
@SQLDelete(sql = "UPDATE ml_team_recommendations SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MLTeamRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "recommended_user_id", nullable = false)
    private Long recommendedUserId; // now Long to match User.id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommended_user_id", insertable = false, updatable = false)
    private User recommendedUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 25)
    private ProjectMember.ProjectRole targetRole;

    @Column(name = "compatibility_score", nullable = false)
    private Float compatibilityScore;

    @Column(name = "shap_features_json", columnDefinition = "TEXT")
    private String shapFeaturesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 25)
    @Builder.Default
    private RecommendationStatus status = RecommendationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "generated_at", nullable = false, updatable = false)
    private Instant generatedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", insertable = false, updatable = false)
    private User reviewedByUser;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    /**
     * Stage 4 weighted score breakdown stored as JSON for explainability.
     */
    @Column(name = "ml_score_breakdown_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 4 weighted score breakdown JSON.'")
    private String mlScoreBreakdownJson;

    /**
     * Human-readable recommendation reasons as JSON array.
     */
    @Column(name = "ml_reasons_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Recommendation reasons JSON array.'")
    private String mlReasonsJson;

    /**
     * True when recommendation was produced under cold-start fallback mode.
     */
    @Column(name = "ml_cold_start_mode", columnDefinition = "TINYINT(1) DEFAULT NULL COMMENT 'True when generated under cold-start mode.'")
    private Boolean mlColdStartMode;

    /**
     * Model or artifact version identifier used during recommendation generation.
     */
    @Column(name = "ml_model_version", length = 50, columnDefinition = "VARCHAR(50) DEFAULT NULL COMMENT 'Model version identifier for recommendation.'")
    private String mlModelVersion;

    /**
     * Reviewer note captured when recommendation is accepted or rejected.
     */
    @Column(name = "ml_decision_note", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Reviewer decision note for recommendation.'")
    private String mlDecisionNote;

    public enum RecommendationStatus {
        PENDING, ACCEPTED, REJECTED, EXPIRED
    }

    // Service-layer: when accepting a recommendation, ensure `recommendedUserId` is an active
    // WorkspaceMember of the recommendation's project workspace.
}
