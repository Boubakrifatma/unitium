package com.example.pi_projet.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TaskDependencyResponseDto {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long dependsOnTaskId;
    private String dependsOnTaskTitle;
    private String dependencyType;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
}
