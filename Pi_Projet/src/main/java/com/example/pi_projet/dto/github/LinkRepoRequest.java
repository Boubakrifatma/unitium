package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LinkRepoRequest(
        @NotNull Long projectId,
        @NotBlank String owner,
        @NotBlank String repoName,
        String localPath,
        String defaultBranch
) {}
