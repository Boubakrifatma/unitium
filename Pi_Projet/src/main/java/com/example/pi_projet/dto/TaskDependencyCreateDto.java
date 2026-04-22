package com.example.pi_projet.dto;

import lombok.Data;

@Data
public class TaskDependencyCreateDto {
    private Long taskId;
    private Long dependsOnTaskId;
    private String dependencyType;
}
