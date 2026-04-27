package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Links a GitHub repository (owner/name) to an internal project, with an optional
 * local clone path used by JGit for commit/push/pull operations.
 */
@Entity
@Table(name = "git_repo_links", uniqueConstraints = {
        @UniqueConstraint(name = "uk_git_repo_links_project_repo", columnNames = {"project_id", "owner", "repo_name"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GitRepoLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "owner", nullable = false, length = 120)
    private String owner;

    @Column(name = "repo_name", nullable = false, length = 200)
    private String repoName;

    /** Optional absolute path on the server where the repo is cloned (for JGit). */
    @Column(name = "local_path", length = 1024)
    private String localPath;

    @Column(name = "default_branch", length = 120)
    private String defaultBranch;

    @Column(name = "linked_by_user_id", nullable = false)
    private Long linkedByUserId;

    @Column(name = "linked_at", updatable = false)
    private LocalDateTime linkedAt;

    @PrePersist
    void onCreate() {
        linkedAt = LocalDateTime.now();
    }

    public String fullName() {
        return owner + "/" + repoName;
    }
}
