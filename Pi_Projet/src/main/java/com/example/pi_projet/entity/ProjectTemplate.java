package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;

@Entity
@Table(name = "project_templates",
        indexes = {
                @Index(name = "idx_pt_organization", columnList = "organization_id"),
                @Index(name = "idx_pt_public", columnList = "is_public"),
                @Index(name = "idx_pt_created_by", columnList = "created_by"),
                @Index(name = "idx_pt_type", columnList = "template_type"),
                @Index(name = "idx_pt_status", columnList = "status"),
                @Index(name = "idx_pt_trending", columnList = "is_trending"),
                @Index(name = "idx_pt_featured", columnList = "is_featured")
        }
)
@SQLDelete(sql = "UPDATE project_templates SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ================= ORGANIZATION =================
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization; // null = global template

    // ================= BASIC INFO =================
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 20)
    @Builder.Default
    private TemplateType templateType = TemplateType.CUSTOM;

        @Column(name = "preview_image_url")
        private String previewImageUrl; // UI card image (optional)

        @Convert(converter = TemplateJsonConverter.class)
        @Column(name = "full_template_json", columnDefinition = "TEXT")
        private Map<String, Object> fullTemplateJson; // optional full export/import of template

    // ================= CORE CONFIG (🔥 MOST IMPORTANT) =================
    @Column(name = "default_project_config_json", columnDefinition = "TEXT")
    private String defaultProjectConfigJson;

    // ================= STRUCTURE =================
    @Column(name = "default_phases_json", columnDefinition = "TEXT")
    private String defaultPhasesJson;

    @Column(name = "default_roles_json", columnDefinition = "TEXT")
    private String defaultRolesJson;

    @Column(name = "default_milestones_json", columnDefinition = "TEXT")
    private String defaultMilestonesJson;

    @Column(name = "default_tasks_json", columnDefinition = "TEXT")
    private String defaultTasksJson;

    // ================= TEAM INTELLIGENCE =================
    @Column(name = "team_recommendation_json", columnDefinition = "TEXT")
    private String teamRecommendationJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "team_strategy", length = 20)
    @Builder.Default
    private TeamStrategy teamStrategy = TeamStrategy.MANUAL;

    // ================= COMPLEXITY =================
    @Enumerated(EnumType.STRING)
    @Column(name = "estimated_effort", length = 10)
    private EstimatedEffort estimatedEffort;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level", length = 20)
    private DifficultyLevel difficultyLevel;

    // ================= DISCOVERY =================
    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    // ================= GUIDANCE =================
    @Column(name = "use_case_description", columnDefinition = "TEXT")
    private String useCaseDescription;

    @Column(name = "default_checklist_json", columnDefinition = "TEXT")
    private String defaultChecklistJson;

    // ================= BEHAVIOR =================
    @Enumerated(EnumType.STRING)
    @Column(name = "default_visibility", length = 10)
    @Builder.Default
    private DefaultVisibility defaultVisibility = DefaultVisibility.PRIVATE;

    // ================= VERSIONING =================
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    // ================= MARKETPLACE =================
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private TemplateStatus status = TemplateStatus.DRAFT;

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "is_recommended")
    @Builder.Default
    private Boolean isRecommended = false;

    @Column(name = "is_featured")
    @Builder.Default
    private Boolean isFeatured = false;

    @Column(name = "is_trending")
    @Builder.Default
    private Boolean isTrending = false;

    // ================= COMMUNITY =================
    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "rating", nullable = false)
    @Builder.Default
    // note: consider using BigDecimal for higher precision in future
    private Double rating = 0.0;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "reviews_json", columnDefinition = "TEXT")
    private String reviewsJson;

    // ================= MODERATION =================
    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    // ================= TEMPLATE EVOLUTION =================
    @Column(name = "parent_template_id")
    private UUID parentTemplateId;

    // ================= CREATOR =================
    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    // ================= SYSTEM =================
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "template", fetch = FetchType.LAZY)
    private java.util.List<Project> derivedProjects;

    /**
     * Stage 2 template embedding used for semantic matching.
     */
    @Column(name = "ml_template_embedding", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 2 template embedding serialized vector.'")
    private String mlTemplateEmbedding;

    /**
     * Historical Stage 2 fitness score used to weight similarity ranking.
     */
    @Column(name = "ml_fitness_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 2 historical template fitness score.'")
    private Double mlFitnessScore;

    /**
     * Historical completion rate used for Stage 2 explanations and weighting.
     */
    @Column(name = "ml_completion_rate", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Historical template completion rate.'")
    private Double mlCompletionRate;

    /**
     * Timestamp of the latest metrics recomputation for template ML signals.
     */
    @Column(name = "ml_last_metrics_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last template ML metrics refresh timestamp.'")
    private Instant mlLastMetricsAt;

    // ================= ENUMS =================
    public enum EstimatedEffort { LOW, MEDIUM, HIGH }

    public enum DifficultyLevel { BEGINNER, INTERMEDIATE, ADVANCED }

    public enum TeamStrategy { MANUAL, AUTO, HYBRID }

    public enum DefaultVisibility { PUBLIC, PRIVATE }

    public enum TemplateStatus { DRAFT, PENDING_APPROVAL, APPROVED, REJECTED }

    public enum TemplateType { SCRUM, KANBAN, WATERFALL, CUSTOM }
}