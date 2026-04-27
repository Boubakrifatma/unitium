package com.example.pi_projet.dto;

public record ReportRequest(
        Long messageId,
        Long roomId,
        String category,
        String description,
        boolean anonymous
) {}
