package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Automatic PO feedback generated from the deliverable content.
 *
 * Example:
 * {
 *   "deliverableId": 42,
 *   "feedback": ["Manque de détails techniques",
 *                "La description n’est pas alignée avec la tâche"],
 *   "taskDescriptionSimilarity": 0.34,
 *   "suggestedDecision": "minor_changes"
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoFeedbackDto {
    private Long deliverableId;
    private List<String> feedback;
    private Double taskDescriptionSimilarity; // 0..1, cosine similarity
    private String suggestedDecision;         // validated | minor_changes | major_rework | rejected
}
