package com.example.pi_projet.entity;

import jakarta.persistence.*;
        import lombok.*;
        import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "mfa_enabled")
    private Boolean mfaEnabled = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    // Role directement dans User
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private RoleName role = RoleName.EMPLOYEE;

    // Face Recognition
    // Force password change on first login (org admins créés via paiement)
    @Builder.Default
    @Column(name = "must_change_password")
    private Boolean mustChangePassword = false;

    @Column(name = "face_encoding", columnDefinition = "TEXT")
    private String faceEncoding;

    @Column(name = "face_registered_at")
    private LocalDateTime faceRegisteredAt;

    // ML
    @Builder.Default
    @Column(name = "trust_score")
    private Float trustScore = 100.0f;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel = RiskLevel.LOW;

    @Column(name = "usual_login_hour")
    private Integer usualLoginHour;

    @Column(name = "behavior_json", columnDefinition = "TEXT")
    private String behaviorJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "gdpr_erased_at")
    private LocalDateTime gdprErasedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum RoleName {
        SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, TUTOR, PRODUCT_OWNER, STUDENT, VIEWER
    }

    public enum RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }



    // ================= RELATIONS CHAT=================

    // Chat rooms créées
    @OneToMany(mappedBy = "createdBy")
    private List<ChatRoom> createdRooms;

    // Appartenance aux rooms
    @OneToMany(mappedBy = "user")
    private List<RoomMember> memberships;

    // Messages envoyés
    @OneToMany(mappedBy = "sender")
    private List<Message> messages;

    // Réactions
    @OneToMany(mappedBy = "user")
    private List<MessageReaction> reactions;
}