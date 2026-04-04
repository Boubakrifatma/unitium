package com.example.pi_projet.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_project_user", columnNames = {"project_id", "user_id"}),
        indexes = {
                @Index(name = "idx_pm_project", columnList = "project_id"),
                @Index(name = "idx_pm_user",    columnList = "user_id")
        }
)
@SQLDelete(sql = "UPDATE project_members SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "user_id", nullable = false)
    private Long userId; // TODO: FK to User entity (now Long id)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = true)
    @JsonIgnore
    private User assignedByUser; // nullable assigner

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    @Builder.Default
    private ProjectRole role = ProjectRole.DEVELOPER;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private Instant assignedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public enum ProjectRole {
        PROJECT_MANAGER, DEVELOPER, REVIEWER, OBSERVER
    }

    // Service-layer validation: before adding a ProjectMember, verify the userId has an active
    // (non-deleted) WorkspaceMember record for the project's workspace.
}