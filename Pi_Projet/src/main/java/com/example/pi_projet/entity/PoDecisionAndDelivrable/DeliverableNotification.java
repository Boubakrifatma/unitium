package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliverable_notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeliverableNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id")
    private Deliverable deliverable;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private DeliverableEventType eventType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isRead == null) isRead = false;
    }

    public enum DeliverableEventType {
        /** Employee soumis un livrable → Manager notifié */
        SUBMITTED_TO_MANAGER,
        /** Manager ouvre le dialog de review → Employé notifié */
        MANAGER_VIEWED,
        /** Manager accepte → Product Owner notifié */
        ACCEPTED_BY_MANAGER,
        /** Manager refuse → Employee notifié */
        REVISION_REQUIRED_BY_MANAGER,
        /** PO accepte → Manager notifié (+ suggestion de réunion) */
        VALIDATED_BY_PO,
        /** PO refuse → Manager notifié */
        REJECTED_BY_PO,
        /** PO valide → Employé notifié */
        VALIDATED_EMPLOYEE,
        /** PO demande révision → Employé notifié */
        REVISION_REQUIRED_BY_PO,
        /** Employé marque une tâche comme done → Manager notifié */
        TASK_COMPLETED
    }
}
