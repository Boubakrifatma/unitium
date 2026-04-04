// session
package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "device_fingerprint")
    private String deviceFingerprint;

    @Column(name = "geo_country")
    private String geoCountry;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    // MlLoginAnomaly mergée ici
    @Column(name = "anomaly_score")
    private Float anomalyScore;

    @Column(name = "features_snapshot_json", columnDefinition = "TEXT")
    private String featuresSnapshotJson;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken")
    private ActionTaken actionTaken = ActionTaken.NONE;

    @Column(name = "model_version")
    private String modelVersion;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ActionTaken {
        NONE, MFA_FORCED, ACCOUNT_LOCKED
    }
}