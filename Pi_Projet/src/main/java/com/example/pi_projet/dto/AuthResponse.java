package com.example.pi_projet.dto;

public record AuthResponse(
    String  token,
    Long    id,
    String  email,
    String  fullName,
    String  role,
    boolean mustChangePassword
) {}
