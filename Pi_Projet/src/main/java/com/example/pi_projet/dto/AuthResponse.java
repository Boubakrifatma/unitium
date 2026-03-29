package com.example.pi_projet.dto;

public record AuthResponse(
    String  token,
    Long    id,
    String  email,
    String  fullName,
    String  role,
    boolean mustChangePassword,
    Float   anomalyScore,
    String  actionTaken
) {
    // Backward-compat constructor (login without anomaly)
    public AuthResponse(String token, Long id, String email, String fullName, String role, boolean mustChangePassword) {
        this(token, id, email, fullName, role, mustChangePassword, null, null);
    }
}
