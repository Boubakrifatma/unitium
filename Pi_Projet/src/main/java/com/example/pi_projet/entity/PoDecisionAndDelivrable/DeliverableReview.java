package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "deliverable_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Column(name = "reviewer_role", nullable = false, columnDefinition = "VARCHAR(20)")
    @Enumerated(EnumType.STRING)
    private ReviewerRole reviewerRole;

    @Column(name = "score")
    private Float score;

    @Column(name = "rubric_scores_json", columnDefinition = "TEXT")
    private String rubricScoresJson;

    @Column(name = "feedback_text", columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "annotations_json", columnDefinition = "TEXT")
    private String annotationsJson;

    @Column(name = "decision", nullable = false, columnDefinition = "VARCHAR(50)")
    @Enumerated(EnumType.STRING)
    private ReviewDecision decision;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private Map<String, Float> rubricScores;

    @Transient
    private Map<String, Object> annotations;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @PostLoad
    public void postLoad() {
        try {
            if (rubricScoresJson != null && !rubricScoresJson.isEmpty()) {
                rubricScores = objectMapper.readValue(rubricScoresJson,
                        objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Float.class));
            }
            if (annotationsJson != null && !annotationsJson.isEmpty()) {
                annotations = objectMapper.readValue(annotationsJson, Map.class);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PrePersist
    public void prePersist() {
        serializeJsonFields();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (decision == null) {
            decision = ReviewDecision.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        serializeJsonFields();
        updatedAt = LocalDateTime.now();
    }

    private void serializeJsonFields() {
        try {
            if (rubricScores != null) {
                rubricScoresJson = objectMapper.writeValueAsString(rubricScores);
            }
            if (annotations != null) {
                annotationsJson = objectMapper.writeValueAsString(annotations);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public enum ReviewerRole {
        MANAGER, PO
    }

    public enum ReviewDecision {
        PENDING, ACCEPTED, REVISION_REQUIRED, REJECTED
    }
}