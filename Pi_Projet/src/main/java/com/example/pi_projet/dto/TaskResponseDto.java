package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TaskResponseDto {
    private Long id;
    private String title;
    private String description;
    private String taskType;
    private String status;
    private String priority;
    private Double estimatedHours;
    private Double actualHours;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime createdAt;

    private Long milestoneId;
    private String milestoneName;

    private String projectId;
    private String projectName;

    private Long assignedToId;
    private String assignedToName;
    private String assignedToEmail;

    private Long createdById;
    private String createdByName;

    private Long parentTaskId;
    private String parentTaskTitle;

    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

    private boolean isVisibleToAssignees;
    private String difficulty; // easy | medium | hard
}