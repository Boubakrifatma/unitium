package com.example.pi_projet.dto;

public record CreateUserRequest(
        String email,
        String password,
        String fullName,
        String role
) {}
