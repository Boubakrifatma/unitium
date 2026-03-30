package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "pending_payments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PendingPayment {

    @Id
    @Column(name = "payment_id", length = 20)
    private String paymentId;   // e.g. V-ABC12345

    @Column(name = "plan_id", nullable = false)
    private String planId;

    @Column(name = "plan_name", nullable = false)
    private String planName;

    @Column(name = "org_type", nullable = false)
    private String orgType;

    @Column(name = "billing_cycle", nullable = false)
    private String billingCycle;

    @Column(name = "org_name", nullable = false)
    private String orgName;

    @Column(name = "admin_email", nullable = false)
    private String adminEmail;

    @Column(name = "admin_name", nullable = false)
    private String adminName;

    @Column(name = "phone")
    private String phone;

    @Column(name = "num_users")
    private Integer numUsers;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "vat_number")
    private String vatNumber;

    @Column(name = "institution")
    private String institution;

    @Column(name = "department")
    private String department;

    @Column(name = "student_count")
    private Integer studentCount;

    @Column(name = "amount_cents", nullable = false)
    private Integer amountCents;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "temp_password", nullable = false)
    private String tempPassword;

    // Card info stored masked (last 4 digits only)
    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(name = "card_holder")
    private String cardHolder;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum PaymentStatus {
        PENDING, CONFIRMED, REJECTED
    }
}
