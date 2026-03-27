package com.example.pi_projet.dto;

import com.example.pi_projet.entity.Message;

import java.time.LocalDateTime;
import java.util.List;

public record MessageDTO(
        Long id,
        Long roomId,
        Long senderId,
        String senderName,
        String contentText,
        String contentType,
        LocalDateTime createdAt,
        List<MessageReactionDTO> reactions,
        // ── file attachment (all nullable) ──────────────────────────────────────
        String fileName,
        String fileUrl,
        String fileType,
        Long   fileSize,
        // ── pin info (all nullable) ──────────────────────────────────────────────
        boolean isPinned,
        LocalDateTime pinnedAt,
        Long    pinnedById,
        String  pinnedByName
) {
    /** Backward-compatible: no reactions, no attachment. */
    public static MessageDTO from(Message m) {
        return from(m, List.of());
    }

    /** With reactions list, no attachment override needed — reads from entity. */
    public static MessageDTO from(Message m, List<MessageReactionDTO> reactions) {
        return new MessageDTO(
                m.getId(),
                m.getRoom().getId(),
                m.getSender().getId(),
                m.getSender().getFullName(),
                m.getContentText(),
                m.getContentType() != null ? m.getContentType().name() : null,
                m.getCreatedAt(),
                reactions,
                m.getFileName(),
                m.getFileUrl(),
                m.getFileType(),
                m.getFileSize(),
                m.isPinned(),
                m.getPinnedAt(),
                m.getPinnedBy() != null ? m.getPinnedBy().getId() : null,
                m.getPinnedBy() != null ? m.getPinnedBy().getFullName() : null
        );
    }
}
