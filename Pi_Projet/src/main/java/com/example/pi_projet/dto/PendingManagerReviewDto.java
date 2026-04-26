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
public class PendingManagerReviewDto {
    private Long reviewId;
    private Long deliverableId;
    private Long taskId;
    private Long versionId;
    private Integer versionNumber;
    private Long employeeId;
    private String employeeName;
    private String deliverableTitle;
    private String description;
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;
    private LocalDateTime submittedAt;
    private String changeSummary;
}