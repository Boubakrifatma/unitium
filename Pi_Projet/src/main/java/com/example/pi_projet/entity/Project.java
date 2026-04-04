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
    private Visibility visibility = Visibility.PUBLIC;

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
        PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
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
}
