package com.example.pi_projet.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Features vector sent to the FastAPI /predict/churn endpoint.
 * Each field maps to a feature the XGBoost model was trained on.
 */
@Data
@Builder
public class ChurnFeaturesRequest {

    /** Organization UUID (used for correlation in the ML service logs). */
    @JsonProperty("org_id")
    private String orgId;

    /**
     * Weekly active users / total users ratio.
     * Computed as: sessions last 7 days / total org members (capped at 1.0).
     */
    @JsonProperty("wau_ratio")
    private double wauRatio;

    /**
     * ML / advanced feature usage rate (0–1).
     * Computed as: count of ML-tagged API calls / total calls in last 7 days.
     */
    @JsonProperty("ml_usage_rate")
    private double mlUsageRate;

    /**
     * Number of support tickets opened in the last 30 days.
     * Proxy: payment failures × 2 (higher failure = more support need).
     */
    @JsonProperty("support_ticket_count")
    private double supportTicketCount;

    /**
     * Days since any org member last logged in.
     */
    @JsonProperty("last_login_delta_days")
    private double lastLoginDeltaDays;

    /**
     * Current plan quota utilization percentage (0–100).
     * Derived from UsageQuota entity.
     */
    @JsonProperty("plan_utilization_pct")
    private double planUtilizationPct;

    /**
     * Number of payment failures on the current subscription.
     */
    @JsonProperty("payment_failures_count")
    private double paymentFailuresCount;

    /**
     * Subscription tenure in months.
     */
    @JsonProperty("tenure_months")
    private double tenureMonths;
}
