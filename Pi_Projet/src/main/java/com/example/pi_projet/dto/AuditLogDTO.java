package com.example.pi_projet.dto;

import com.example.pi_projet.entity.AuditLog;

import java.time.LocalDateTime;

public record AuditLogDTO(
        Long id,
        Long userId,
        String actionType,
        String entityType,
        String entityId,
        String diffJson,
        String ipAddress,
        LocalDateTime createdAt
) {
    public static AuditLogDTO from(AuditLog log) {
        return new AuditLogDTO(
                log.getId(),
                log.getUserId(),
                log.getActionType().name(),
                log.getEntityType(),
                log.getEntityId() != null ? log.getEntityId().toString() : null,
                log.getDiffJson(),
                log.getIpAddress(),
                log.getCreatedAt()
        );
    }
}
