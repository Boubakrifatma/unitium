package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDeliverableGroupDto {
    private Long taskId;
    private String taskTitle;
    private String taskStatus;
    private String assignedToName;
    private List<DeliverableWithVersionsDto> deliverables;
}
