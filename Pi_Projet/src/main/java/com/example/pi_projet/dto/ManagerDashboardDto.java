package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagerDashboardDto {
    private Float averageScore;
    private Long totalReviewed;
    private Long acceptedCount;
    private Long revisionRequiredCount;
    private Float acceptanceRate;
    private Float revisionRate;
    private java.util.List<EmployeeQualityMetricDto> employeeMetrics;
}
