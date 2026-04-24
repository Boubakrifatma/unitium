package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;

public record CreateRepoRequest(
        @NotBlank String name,
        String description,
        boolean isPrivate,
        boolean autoInit
) {}
