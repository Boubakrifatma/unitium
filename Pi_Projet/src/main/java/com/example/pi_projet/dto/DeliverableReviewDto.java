package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableReviewDto {
    private Long id;
    private Long deliverableId;
    private Long versionId;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerRole;  // "manager" | "po"
    private Float score;  // 0-10
    private Map<String, Float> rubricScores;
    private String feedbackText;
    private Map<String, Object> annotations;
    private String decision;  // "pending" | "accepted" | "revision_required" | "rejected"
    private LocalDateTime reviewedAt;
}
