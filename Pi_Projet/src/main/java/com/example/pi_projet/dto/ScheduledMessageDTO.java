package com.example.pi_projet.dto;

import com.example.pi_projet.entity.ScheduledMessage;
import com.example.pi_projet.enums.RecurrenceType;
import com.example.pi_projet.enums.ScheduledMessageStatus;

import java.time.LocalDateTime;
import java.util.List;

public record ScheduledMessageDTO(
        Long id,
        Long roomId,
        String roomName,
        Long senderId,
        String senderName,
        String content,
        LocalDateTime scheduledAt,
        LocalDateTime nextSendAt,
        RecurrenceType recurrenceType,
        List<String> recurrenceDays,
        ScheduledMessageStatus status,
        LocalDateTime createdAt
) {
    public static ScheduledMessageDTO from(ScheduledMessage m) {
        return new ScheduledMessageDTO(
                m.getId(),
                m.getRoom().getId(),
                m.getRoom().getName(),
                m.getSender().getId(),
                m.getSender().getFullName(),
                m.getContent(),
                m.getScheduledAt(),
                m.getNextSendAt(),
                m.getRecurrenceType(),
                m.getRecurrenceDays(),
                m.getStatus(),
                m.getCreatedAt()
        );
    }
}
