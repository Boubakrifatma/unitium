package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InviteCollaboratorRequest(
        @NotBlank String username,
        @Pattern(regexp = "pull|triage|push|maintain|admin") String permission
) {}
