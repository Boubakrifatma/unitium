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
public class DeliverableWithVersionsDto {
    private Long deliverableId;
    private Long taskId;
    private String projectId;
    private Long employeeId;
    private String employeeName;
    private String title;
    private String description;
    private Integer currentVersion;
    private String overallStatus;
    private LocalDateTime submittedAt;
    private java.util.List<DeliverableVersionDto> versions;
}
