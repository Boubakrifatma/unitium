package com.example.pi_projet.entity.TimeLineAndDeadLine;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ml_duration_estimates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MlDurationEstimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "estimated_hours_ml", nullable = false)
    private Float estimatedHoursMl;

    @Column(name = "confidence_interval_low")
    private Float confidenceIntervalLow;

    @Column(name = "confidence_interval_high")
    private Float confidenceIntervalHigh;

    @Column(name = "human_estimate_hours")
    private Float humanEstimateHours;

    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson;

    @Column(name = "predicted_at", updatable = false)
    private LocalDateTime predictedAt;

    @Column(name = "actual_hours_final")
    private Float actualHoursFinal;

    @Column(name = "model_version")
    private String modelVersion;

    @PrePersist
    protected void onCreate() {
        predictedAt = LocalDateTime.now();
    }
}