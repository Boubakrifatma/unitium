package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_templates",
        indexes = {
        @Index(name = "idx_pt_organization", columnList = "organization_id"),
                @Index(name = "idx_pt_public", columnList = "is_public"),
                @Index(name = "idx_pt_created_by", columnList = "created_by"),
                @Index(name = "idx_pt_type", columnList = "template_type")
        }
)
@SQLDelete(sql = "UPDATE project_templates SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization; // null for global/platform templates

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 20)
    @Builder.Default
    private TemplateType templateType = TemplateType.CUSTOM;

    @Column(name = "default_phases_json", columnDefinition = "TEXT")
    private String defaultPhasesJson;

    @Column(name = "default_roles_json", columnDefinition = "TEXT")
    private String defaultRolesJson;

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "created_by", nullable = false)
    private Long createdBy; // now Long to match User.id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public enum TemplateType {
        SCRUM, KANBAN, WATERFALL, CUSTOM
    }
}

