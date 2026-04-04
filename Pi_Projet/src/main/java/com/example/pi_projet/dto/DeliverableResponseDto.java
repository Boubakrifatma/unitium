package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DeliverableResponseDto {

    private Long id;
    private String title;
    private String description;
    private Integer currentVersion;
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;
    private String status;
    private String poDecisionField;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;

    // Task
    private Long taskId;
    private String taskTitle;
    private String taskStatus;

    // Project
    private String projectId;
    private String projectName;

    // Submitted by
    private Long submittedById;
    private String submittedByName;
    private String submittedByEmail;
}