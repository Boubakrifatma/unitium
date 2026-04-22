package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "github_credentials", uniqueConstraints = {
        @UniqueConstraint(name = "uk_github_credentials_user", columnNames = "user_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GithubCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** AES-encrypted Personal Access Token. */
    @Column(name = "encrypted_token", nullable = false, length = 2048)
    private String encryptedToken;

    /** Resolved from GET https://api.github.com/user when the token is saved. */
    @Column(name = "github_login", length = 120)
    private String githubLogin;

    @Column(name = "github_avatar_url", length = 512)
    private String githubAvatarUrl;

    /** Last 4 chars of the raw token, for UI display ("…aB12"). Never sensitive on its own. */
    @Column(name = "token_hint", length = 8)
    private String tokenHint;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
