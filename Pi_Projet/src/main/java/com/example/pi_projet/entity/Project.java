package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "projects", indexes = {
        @Index(name = "idx_project_workspace",   columnList = "workspace_id"),
        @Index(name = "idx_project_status",      columnList = "status"),
        @Index(name = "idx_project_created_by",  columnList = "created_by")
})
@SQLDelete(sql = "UPDATE projects SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    // If this project was created from a template, store the template id and relation
    @Column(name = "template_id")
    private java.util.UUID templateId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", insertable = false, updatable = false)
    private ProjectTemplate template;

    // Phases JSON copied from template at creation time so project details can display them
    @Column(name = "phases_json", columnDefinition = "TEXT")
    private String phasesJson;

    // TODO: Project likely needs FK relations to Task, Sprint, or Phase entities from other modules

    @Column(name = "created_by", nullable = false)
    private Long createdBy; // now Long to match User.id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Visibility visibility = Visibility.PRIVATE;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public enum ProjectStatus {
        PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED
    }

    public enum Visibility {
        PUBLIC, PRIVATE
    }



    @JsonIgnore
    @OneToMany(mappedBy = "project")
    private List<ChatRoom> chatRooms;

    @JsonIgnore
    @OneToMany(mappedBy = "project")
    private List<ProjectMember> projectMembers;

    @JsonIgnore
    @OneToMany(mappedBy = "project")
    private List<MLTeamRecommendation> mlTeamRecommendations;

    /**
     * Stage 1 sentence embedding for project semantic extraction.
     */
    @Column(name = "ml_description_embedding", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 sentence embedding (serialized vector).' ")
    private String mlDescriptionEmbedding;

    /**
     * Stage 1 inferred project type label.
     */
    @Column(name = "ml_project_type", length = 50, columnDefinition = "VARCHAR(50) DEFAULT NULL COMMENT 'Stage 1 inferred project type label.'")
    private String mlProjectType;

    /**
     * Stage 1 inferred complexity level used by Stage 2 and Stage 3.
     */
    @Column(name = "ml_complexity", length = 20, columnDefinition = "VARCHAR(20) DEFAULT NULL COMMENT 'Stage 1 complexity LOW MEDIUM HIGH.'")
    private String mlComplexity;

    /**
     * Stage 1 detected mode for enterprise versus academic routing.
     */
    @Column(name = "ml_detected_mode", length = 20, columnDefinition = "VARCHAR(20) DEFAULT NULL COMMENT 'Stage 1 detected mode enterprise academic.'")
    private String mlDetectedMode;

    /**
     * Stage 1 domain tags as JSON array.
     */
    @Column(name = "ml_domain_tags_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 domain tags as JSON array.'")
    private String mlDomainTagsJson;

    /**
     * Stage 1 extracted constraints as JSON array.
     */
    @Column(name = "ml_constraints_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 extracted constraints JSON array.'")
    private String mlConstraintsJson;

    /**
     * Timestamp of the last PIB inference execution for this project.
     */
    @Column(name = "ml_last_inference_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last PIB inference timestamp for project.'")
    private Instant mlLastInferenceAt;
}
