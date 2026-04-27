package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "po_decisions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id", nullable = false)
    private Deliverable deliverable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    private User po;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private ChatRoom room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PoDecisionType decision;

    @Column(name = "final_comments", columnDefinition = "TEXT")
    private String finalComments;

    @Column(name = "decision_timestamp", updatable = false)
    private LocalDateTime decisionTimestamp;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @PrePersist
    protected void onCreate() {
        decisionTimestamp = LocalDateTime.now();
    }

    public enum PoDecisionType {
        validated, minor_changes, major_rework, rejected
    }
}