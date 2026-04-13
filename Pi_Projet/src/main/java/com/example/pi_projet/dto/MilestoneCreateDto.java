package com.example.pi_projet.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

@Data
public class MilestoneCreateDto {
    private String name;
    private String description;
    private LocalDate dueDate;
    private String status;
    private Integer completionPct;
    @NotBlank(message = "Project ID is required")
    private String projectId;
}