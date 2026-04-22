package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "security_alerts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SecurityAlert {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @PrePersist
    public void generateId() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }

    @Column(name = "invoice_id", nullable = false, length = 36)
    private String invoiceId;

    @Column(name = "invoice_number", nullable = false, length = 30)
    private String invoiceNumber;

    @Column(name = "org_name", length = 255)
    private String orgName;

    @Column(name = "integrity_status", nullable = false, length = 20)
    private String integrityStatus;

    @Column(name = "stored_hash", length = 64)
    private String storedHash;

    @Column(name = "computed_hash", length = 64)
    private String computedHash;

    @Column(name = "message", columnDefinition = "text")
    private String message;

    @Column(name = "checked_at")
    private LocalDateTime checkedAt;

    @Column(name = "reviewed", nullable = false)
    @Builder.Default
    private Boolean reviewed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
