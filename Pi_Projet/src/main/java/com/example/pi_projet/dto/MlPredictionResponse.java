package com.example.pi_projet.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class MlPredictionResponse {

    @JsonProperty("risk_category")
    private String riskCategory;        // "green" | "orange" | "red"

    @JsonProperty("risk_probability")
    private Float riskProbability;

    private List<String> recommendations;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("predicted_at")
    private String predictedAt;
}