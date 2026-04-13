package com.example.pi_projet.dto;

import com.example.pi_projet.entity.RoomMember;

import java.time.LocalDateTime;

public record RoomMemberDTO(
        Long id,
        Long userId,
        String userFullName,
        String userEmail,
        String userRole,
        LocalDateTime joinedAt
) {
    public static RoomMemberDTO from(RoomMember m) {
        return new RoomMemberDTO(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getFullName(),
                m.getUser().getEmail(),
                m.getUser().getRole().name(),
                m.getJoinedAt()
        );
    }
}
