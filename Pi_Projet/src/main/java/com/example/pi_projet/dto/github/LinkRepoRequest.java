package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;

public record LinkRepoRequest(
        Long projectId,           // optional — employees/students may link repos without a project
        @NotBlank String owner,
        @NotBlank String repoName,
        String localPath,
        String defaultBranch
) {}
