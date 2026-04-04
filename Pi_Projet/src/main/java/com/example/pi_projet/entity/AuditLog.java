//Auditlog
package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ActionType actionType;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "diff_json", columnDefinition = "TEXT")
    private String diffJson;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ActionType {
        LOGIN, LOGOUT, ROLE_CHANGE, DATA_EXPORT, PASSWORD_RESET,
        ACCOUNT_CREATED, ACCOUNT_DELETED, MFA_ENABLED, MFA_DISABLED,
        FACE_LOGIN, FACE_REGISTERED
    }
}
