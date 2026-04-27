package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.PoDecision;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ml_risk_analyses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MlRiskAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id", nullable = false)
    private Deliverable deliverable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_decision_id", nullable = false)
    private PoDecision poDecision;

    @Column(name = "delay_risk", nullable = false)
    private Float delayRisk;

    @Column(name = "cost_risk", nullable = false)
    private Float costRisk;

    @Column(name = "quality_risk", nullable = false)
    private Float qualityRisk;

    @Column(name = "escalation_risk", nullable = false)
    private Float escalationRisk;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_level", nullable = false)
    private RiskLevel overallLevel;

    @Column(name = "risk_factors_json", columnDefinition = "TEXT")
    private String riskFactorsJson;

    @Column(name = "recommendations_json", columnDefinition = "TEXT")
    private String recommendationsJson;

    @Column(name = "analysed_at", updatable = false)
    private LocalDateTime analysedAt;

    @Column(name = "model_version")
    private String modelVersion;

    @PrePersist
    protected void onCreate() {
        analysedAt = LocalDateTime.now();
    }

    public enum RiskLevel {
        low, medium, high, critical
    }
}