package com.example.pi_projet.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MlPredictionRequest {

    @JsonProperty("days_until_due")
    private Long daysUntilDue;

    @JsonProperty("task_age_days")
    private Long taskAgeDays;

    @JsonProperty("task_duration_planned")
    private Long taskDurationPlanned;

    @JsonProperty("est_hours")
    private Float estHours;

    @JsonProperty("logged_ratio")
    private Float loggedRatio;
}