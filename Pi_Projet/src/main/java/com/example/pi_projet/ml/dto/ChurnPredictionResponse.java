package com.example.pi_projet.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Response received from FastAPI /predict/churn endpoint.
 */
@Data
public class ChurnPredictionResponse {

    @JsonProperty("org_id")
    private String orgId;

    /** Churn probability in [0.0, 1.0]. */
    @JsonProperty("churn_score")
    private double churnScore;

    /** LOW / MEDIUM / HIGH / CRITICAL */
    @JsonProperty("risk_level")
    private String riskLevel;

    /** NONE | MANAGER_ALERT | RETENTION_EMAIL | URGENT_COUPON_30 */
    @JsonProperty("action")
    private String action;

    @JsonProperty("message")
    private String message;

    @JsonProperty("model_version")
    private String modelVersion;
}
