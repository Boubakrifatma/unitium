package com.example.pi_projet.dto;

import com.example.pi_projet.entity.User;

import java.time.LocalDateTime;

public record UserDTO(
        Long id,
        String email,
        String fullName,
        String role,
        Boolean isActive,
        String avatarUrl,
        LocalDateTime createdAt
) {
    public static UserDTO from(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getIsActive(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }
}
