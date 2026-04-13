package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliverable_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeliverableReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id", nullable = false)
    private Deliverable deliverable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private DeliverableVersion version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(name = "reviewer_role", nullable = false)
    private ReviewerRole reviewerRole;

    @Column
    private Float score;

    @Column(name = "rubric_scores_json", columnDefinition = "TEXT")
    private String rubricScoresJson;

    @Column(name = "feedback_text", columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "annotations_json", columnDefinition = "TEXT")
    private String annotationsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewDecision decision;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @PrePersist
    protected void onCreate() {
        if (decision == null) decision = ReviewDecision.pending;
    }

    public enum ReviewerRole {
        manager, po
    }

    public enum ReviewDecision {
        pending, accepted, revision_required, rejected
    }
}