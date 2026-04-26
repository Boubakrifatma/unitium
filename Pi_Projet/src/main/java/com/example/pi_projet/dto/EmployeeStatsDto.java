package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeStatsDto {
    private long totalDeliverables;
    private long rejectedByManager;
    private long rejectedByPo;
    private long acceptedDeliverables;
    private Double averageScore;
}
