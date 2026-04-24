package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;

public record CommitRequest(
        @NotBlank String message,
        String authorName,
        String authorEmail,
        Boolean stageAll
) {}
