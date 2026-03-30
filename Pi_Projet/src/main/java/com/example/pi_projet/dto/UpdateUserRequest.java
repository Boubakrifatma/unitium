package com.example.pi_projet.dto;

public record UpdateUserRequest(
        String fullName,
        String email,
        String avatarUrl
) {}
