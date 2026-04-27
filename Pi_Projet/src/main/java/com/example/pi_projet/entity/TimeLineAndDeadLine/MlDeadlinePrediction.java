package com.example.pi_projet.entity.TimeLineAndDeadLine;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ml_deadline_predictions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MlDeadlinePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    @Column(name = "risk_probability", nullable = false)
    private Float riskProbability;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_category", nullable = false)
    private RiskCategory riskCategory;

    @Column(name = "predicted_delay_days")
    private Integer predictedDelayDays;

    @Column(name = "shap_features_json", columnDefinition = "TEXT")
    private String shapFeaturesJson;

    @Column(name = "recommendations_json", columnDefinition = "TEXT")
    private String recommendationsJson;

    @Column(name = "predicted_at", updatable = false)
    private LocalDateTime predictedAt;

    @Column(name = "model_version")
    private String modelVersion;

    @Column(name = "was_correct")
    private Boolean wasCorrect;

    @PrePersist
    protected void onCreate() {
        predictedAt = LocalDateTime.now();
    }

    public enum RiskCategory {
        green, orange, red
    }
}