package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "workspaces",
       uniqueConstraints = @UniqueConstraint(name = "uk_workspace_org_slug", columnNames = {"organization_id","slug"}),
       indexes = {
           @Index(name = "idx_workspace_owner", columnList = "owner_id")
       }
)
@SQLDelete(sql = "UPDATE workspaces SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Workspace {

    @Id
    private UUID id; // generated in service layer using nameUUIDFromBytes(orgSlug+":"+workspaceSlug)

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String slug;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId; // switched to Long to match `User.id`

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @JsonIgnore
    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WorkspaceMember> members;

    @JsonIgnore
    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Project> projects;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    // TODO: workspace.id will be referenced by Module 6 usage_quotas.workspace_id
    // TODO: If Task/Sprint/Phase entities are provided by other modules, add relations here.
    // Example (when Task exists):
    // @OneToMany(mappedBy = "workspace")
    // private List<Task> tasks; // TODO: awaiting Task entity from Module X
}