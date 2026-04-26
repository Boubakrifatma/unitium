package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeQualityMetricDto {
    private Long employeeId;
    private String employeeName;
    private Float averageScore;
    private Long submissionCount;
    private Long acceptedCount;
    private Long revisionCount;
    private Float acceptanceRate;
}
