package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "org_members",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_organization_user", columnNames = {"organization_id","user_id"}),
        @UniqueConstraint(name = "uk_org_member_single_org_per_user", columnNames = {"user_id"})
    },
        indexes = {
                @Index(name = "idx_orgm_organization", columnList = "organization_id"),
                @Index(name = "idx_orgm_user", columnList = "user_id")
        }
)
@SQLDelete(sql = "UPDATE org_members SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrganizationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "user_id", nullable = false)
    private Long userId; // TODO: FK to User entity (now Long id)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by", nullable = true)
    private User invitedByUser; // nullable inviter

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrganizationRole role = OrganizationRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public enum OrganizationRole {
        OWNER, ADMIN, MEMBER
    }
}
