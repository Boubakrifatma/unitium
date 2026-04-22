package com.example.pi_projet.dto;

import com.example.pi_projet.entity.Report;

import java.time.LocalDateTime;

public record ReportDTO(
        Long id,
        Long messageId,
        String messageContent,
        Long messageAuthorId,
        String messageAuthorName,
        Long reporterId,
        String reporterName,
        Long roomId,
        String roomName,
        String category,
        String description,
        boolean anonymous,
        String status,
        String actionTaken,
        Long reviewedById,
        String reviewedByName,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String aiSuggestion
) {
    public static ReportDTO from(Report r) {
        return new ReportDTO(
                r.getId(),
                r.getReportedMessage().getId(),
                r.getReportedMessage().getContentText(),
                r.getReportedMessage().getSender().getId(),
                r.getReportedMessage().getSender().getFullName(),
                r.isAnonymous() ? null : r.getReporter().getId(),
                r.isAnonymous() ? null : r.getReporter().getFullName(),
                r.getRoom().getId(),
                r.getRoom().getName(),
                r.getCategory() != null ? r.getCategory().name() : null,
                r.getDescription(),
                r.isAnonymous(),
                r.getStatus() != null ? r.getStatus().name() : null,
                r.getActionTaken() != null ? r.getActionTaken().name() : null,
                r.getReviewedBy() != null ? r.getReviewedBy().getId() : null,
                r.getReviewedBy() != null ? r.getReviewedBy().getFullName() : null,
                r.getCreatedAt(),
                r.getResolvedAt(),
                r.getAiSuggestion()
        );
    }
}
