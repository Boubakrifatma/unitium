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
        String  pinnedByName,
        // ── shared-content classification (null for ordinary messages) ───────────
        String  category,
        String  extractedUrl,
        // ── deletion event marker ────────────────────────────────────────────────
        boolean deleted,
        // ── moderation soft-delete ───────────────────────────────────────────────
        boolean isDeleted,
        // ── system message flag ──────────────────────────────────────────────────
        boolean isSystemMessage,
        // ── edit tracking ────────────────────────────────────────────────────────
        boolean isEdited,
        LocalDateTime editedAt,
        // ── agenda fields ────────────────────────────────────────────────────────
        boolean isAgendaItem,
        Integer agendaOrder,
        Integer agendaDuration,
        boolean agendaDone
) {
    /** Backward-compatible: no reactions, no attachment, no shared-content fields. */
    public static MessageDTO from(Message m) {
        return from(m, List.of());
    }

    /** With reactions list; category/extractedUrl are null (standard messages). */
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
                m.getPinnedBy() != null ? m.getPinnedBy().getFullName() : null,
                null,  // category — set only by getSharedContent
                null,  // extractedUrl — set only by getSharedContent
                false, // deleted
                m.isDeleted(),
                Boolean.TRUE.equals(m.getIsSystemMessage()),
                m.isEdited(),
                m.getEditedAt(),
                m.isAgendaItem(),
                m.getAgendaOrder(),
                m.getAgendaDuration(),
                m.isAgendaDone()
        );
    }

    /** For shared-content results — carries category and optional extractedUrl. */
    public static MessageDTO fromShared(Message m, List<MessageReactionDTO> reactions,
                                        String category, String extractedUrl) {
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
                m.getPinnedBy() != null ? m.getPinnedBy().getFullName() : null,
                category,
                extractedUrl,
                false, // deleted
                m.isDeleted(),
                Boolean.TRUE.equals(m.getIsSystemMessage()),
                m.isEdited(),
                m.getEditedAt(),
                m.isAgendaItem(),
                m.getAgendaOrder(),
                m.getAgendaDuration(),
                m.isAgendaDone()
        );
    }

    /** Broadcast-only event telling clients to remove this message from the list. */
    public static MessageDTO deleted(Long messageId, Long roomId) {
        return new MessageDTO(
                messageId, roomId,
                null, null, null, null, null, null,
                null, null, null, null,
                false, null, null, null,
                null, null,
                true,  // deleted
                false, // isDeleted
                false, // isSystemMessage
                false, // isEdited
                null,  // editedAt
                false, // isAgendaItem
                null,  // agendaOrder
                null,  // agendaDuration
                false  // agendaDone
        );
    }
}
