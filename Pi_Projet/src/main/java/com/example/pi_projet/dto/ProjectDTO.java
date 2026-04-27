package com.example.pi_projet.dto;

import com.example.pi_projet.entity.Project;

import java.util.UUID;

public record ProjectDTO(
        UUID id,
        String name
) {
    public static ProjectDTO from(Project project) {
        return new ProjectDTO(project.getId(), project.getName());
    }
}
