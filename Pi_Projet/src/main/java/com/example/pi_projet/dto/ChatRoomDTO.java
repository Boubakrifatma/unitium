package com.example.pi_projet.dto;

import com.example.pi_projet.entity.ChatRoom;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatRoomDTO(
        Long id,
        UUID projectId,
        String name,
        String description,
        String roomType,
        Long createdById,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ChatRoomDTO from(ChatRoom room) {
        return new ChatRoomDTO(
                room.getId(),
                room.getProject() != null ? room.getProject().getId() : null,
                room.getName(),
                room.getDescription(),
                room.getRoomType() != null ? room.getRoomType().name() : null,
                room.getCreatedBy().getId(),
                room.getCreatedBy().getFullName(),
                room.getCreatedAt(),
                room.getUpdatedAt()
        );
    }
}
