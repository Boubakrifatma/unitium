package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

@Entity
@Table(name = "workspace_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_workspace_user", columnNames = {"workspace_id", "user_id"}),
        indexes = {
                @Index(name = "idx_wm_workspace", columnList = "workspace_id"),
                @Index(name = "idx_wm_user",      columnList = "user_id")
        }
)
@SQLDelete(sql = "UPDATE workspace_members SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkspaceMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "user_id", nullable = false)
    private Long userId; // TODO: FK to User entity (now Long id)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by", nullable = true)
    @JsonIgnore
    private User invitedByUser; // nullable inviter

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private WorkspaceRole role = WorkspaceRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    /**
     * Stage 4 role history score component for people matching.
     */
    @Column(name = "ml_role_history_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 role history score component.'")
    private Double mlRoleHistoryScore;

    /**
     * Stage 4 skill match score component for people matching.
     */
    @Column(name = "ml_skill_match_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 skill match score component.'")
    private Double mlSkillMatchScore;

    /**
     * Stage 4 availability score component and cold-start fallback signal.
     */
    @Column(name = "ml_availability_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 availability score component.'")
    private Double mlAvailabilityScore;

    /**
     * Stage 4 chemistry score component for collaboration fit.
     */
    @Column(name = "ml_chemistry_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 chemistry score component.'")
    private Double mlChemistryScore;

    /**
     * Top role affinities for this member as JSON array.
     */
    @Column(name = "ml_top_roles_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 4 top role affinities JSON array.'")
    private String mlTopRolesJson;

    /**
     * Serialized profile vector used during Stage 4 similarity scoring.
     */
    @Column(name = "ml_profile_vector", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 4 serialized member profile vector.'")
    private String mlProfileVector;

    /**
     * Last refresh timestamp for Stage 4 precomputed member profile data.
     */
    @Column(name = "ml_profile_updated_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last refresh timestamp for member ML profile.'")
    private Instant mlProfileUpdatedAt;

    public enum WorkspaceRole {
        OWNER, ADMIN, MANAGER, EMPLOYEE, TA, STUDENT, MEMBER, VIEWER
    }

    // Service-layer note: when soft-deleting a WorkspaceMember, also soft-delete all ProjectMember
    // records for this user in projects that belong to the same workspace.
}