package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitReviewRequest {
    private Long versionId;  // Version being reviewed (optional — if null, latest is used)
    private Float score;  // 0-10 (required for manager)
    private String feedbackText;  // Required, min 10 chars
    private Map<String, Float> rubricScores;  // Optional custom rubric scores
    private Map<String, Object> annotations;  // Optional PDF annotations
}
