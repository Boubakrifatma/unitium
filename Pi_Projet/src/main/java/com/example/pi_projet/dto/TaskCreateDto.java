package com.example.pi_projet.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskCreateDto {

    private String title;
    private String description;
    private String taskType;
    private String status;
    private String priority;

    private Float estimatedHours;
    private Float actualHours;

    private String projectId;

    private Long milestoneId;
    private Long assignedToId;

    private LocalDate startDate;
    private LocalDate dueDate;
}