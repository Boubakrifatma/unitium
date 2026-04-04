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
public class DeliverableDto {

    // ═══════════════════════════════════════════════════════════════════
    // DELIVERABLE INFO
    // ═══════════════════════════════════════════════════════════════════
    private Long id;
    private String title;
    private String description;
    private Integer currentVersion;
    private String status;
    private String poDecisionField;

    // ═══════════════════════════════════════════════════════════════════
    // FILE INFO
    // ═══════════════════════════════════════════════════════════════════
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;

    // ═══════════════════════════════════════════════════════════════════
    // TIMESTAMPS
    // ═══════════════════════════════════════════════════════════════════
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;

    // ═══════════════════════════════════════════════════════════════════
    // TASK INFO ✅ AJOUTÉ
    // ═══════════════════════════════════════════════════════════════════
    private Long taskId;
    private String taskTitle;        // ✅ NOUVEAU
    private String taskStatus;       // ✅ NOUVEAU

    // ═══════════════════════════════════════════════════════════════════
    // PROJECT INFO ✅ AJOUTÉ
    // ═══════════════════════════════════════════════════════════════════
    private String projectId;
    private String projectName;      // ✅ NOUVEAU

    // ═══════════════════════════════════════════════════════════════════
    // EMPLOYEE/SUBMITTER INFO
    // ═══════════════════════════════════════════════════════════════════
    private Long submittedById;
    private String submittedByName;
    private String submittedByEmail;
}