package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Audit log for Module 2 events (workspaces, projects, templates).
 * Separate from the existing audit_logs table (module 1) to avoid schema conflicts.
 */
@Entity
@Table(name = "m2_audit_logs", indexes = {
    @Index(name = "idx_m2al_org_workspace", columnList = "org_id, entity_type, entity_id"),
    @Index(name = "idx_m2al_created_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class M2AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "org_id", length = 36)
    private String orgId;

    @Column(name = "action_type", nullable = false, length = 80)
    private String actionType;

    @Column(name = "entity_type", length = 60)
    private String entityType;

    @Column(name = "entity_id", length = 36)
    private String entityId;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "ip_address", length = 60)
    private String ipAddress;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
