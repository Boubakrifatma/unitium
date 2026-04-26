package com.example.pi_projet.dto.student;

import lombok.Data;

@Data
public class TutorEvaluationRequest {

    /** "ACCEPTED" or "REJECTED" */
    private String decision;

    /**
     * Score 0–100. If null, the backend uses the auto-suggested score
     * from the comparison result stored on the deliverable.
     */
    private Integer score;

    private String feedback;
}
