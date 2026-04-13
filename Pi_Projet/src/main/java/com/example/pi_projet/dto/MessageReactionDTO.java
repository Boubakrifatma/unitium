package com.example.pi_projet.dto;

import com.example.pi_projet.entity.MessageReaction;

import java.time.LocalDateTime;

public record MessageReactionDTO(
        Long id,
        Long messageId,
        Long userId,
        String userFullName,
        String emoji,
        LocalDateTime reactedAt
) {
    public static MessageReactionDTO from(MessageReaction r) {
        return new MessageReactionDTO(
                r.getId(),
                r.getMessage().getId(),
                r.getUser().getId(),
                r.getUser().getFullName(),
                r.getEmoji(),
                r.getReactedAt()
        );
    }
}
