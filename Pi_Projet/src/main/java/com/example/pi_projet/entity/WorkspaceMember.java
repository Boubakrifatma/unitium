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

    public enum WorkspaceRole {
        OWNER, ADMIN, MEMBER, VIEWER
    }

    // Service-layer note: when soft-deleting a WorkspaceMember, also soft-delete all ProjectMember
    // records for this user in projects that belong to the same workspace.
}