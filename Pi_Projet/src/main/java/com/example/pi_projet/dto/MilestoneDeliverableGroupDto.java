package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneDeliverableGroupDto {
    private Long milestoneId;
    private String milestoneName;
    private String milestoneDescription;
    private String milestoneStatus;
    private LocalDate dueDate;
    private Float completionPct;
    private List<TaskDeliverableGroupDto> tasks;
}
