package com.example.pi_projet.dto.github;

import jakarta.validation.constraints.NotBlank;

public record SaveGithubTokenRequest(@NotBlank String token) {}
