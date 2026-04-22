package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ml_quality_predictions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MlQualityPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id", nullable = false)
    private Deliverable deliverable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private DeliverableVersion version;

    @Column(name = "predicted_score", nullable = false)
    private Float predictedScore;

    @Column(name = "confidence_low")
    private Float confidenceLow;

    @Column(name = "confidence_high")
    private Float confidenceHigh;

    @Column(name = "strengths_json", columnDefinition = "TEXT")
    private String strengthsJson;

    @Column(name = "improvements_json", columnDefinition = "TEXT")
    private String improvementsJson;

    @Column(name = "predicted_at", updatable = false)
    private LocalDateTime predictedAt;

    @Column(name = "actual_manager_score")
    private Float actualManagerScore;

    @Column(name = "score_delta")
    private Float scoreDelta;

    @Column(name = "model_version")
    private String modelVersion;

    @PrePersist
    protected void onCreate() {
        predictedAt = LocalDateTime.now();
    }
}