package com.example.pi_projet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ScheduledMessageRequest(
        String content,
        LocalDateTime scheduledAt,
        String recurrenceType,
        List<String> recurrenceDays
) {}
