package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableWithReviewDto {
    private Long deliverableId;
    private Long taskId;
    private String projectId;
    private Long employeeId;
    private String employeeName;
    private String title;
    private String description;
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;

    // Review status
    private Integer currentVersion;
    private String overallStatus;  // "pending_manager_review" | "accepted_by_manager" | "revision_required" | "pending_po_review" | "validated"

    // Latest manager review
    private DeliverableReviewDto latestManagerReview;

    // Latest PO review (if exists)
    private DeliverableReviewDto latestPoReview;

    private LocalDateTime submittedAt;
    private LocalDateTime lastReviewedAt;
}
