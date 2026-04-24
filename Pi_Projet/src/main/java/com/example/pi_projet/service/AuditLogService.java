package com.example.pi_projet.service;

import com.example.pi_projet.dto.AuditLogDTO;
import com.example.pi_projet.entity.AuditLog;
import com.example.pi_projet.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Enregistre une action dans l'audit log.
     * @param userId     ID de l'utilisateur qui a fait l'action (peut être null)
     * @param action     Type d'action (ORG_CREATED, MEMBER_ADDED, ...)
     * @param entityType Nom de l'entité concernée ("ORGANIZATION", "ORG_MEMBER", ...)
     * @param entityId   ID de l'entité (UUID stocké comme string dans diffJson)
     * @param detail     Description lisible de ce qui s'est passé
     */
    public void log(Long userId, AuditLog.ActionType action, String entityType, String entityId, String detail) {
        String diffJson = String.format("{\"entityId\":\"%s\",\"detail\":\"%s\"}", entityId, detail);
        AuditLog entry = AuditLog.builder()
                .userId(userId)
                .actionType(action)
                .entityType(entityType)
                .diffJson(diffJson)
                .build();
        auditLogRepository.save(entry);
    }

    public List<AuditLogDTO> getAll() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(AuditLogDTO::from).toList();
    }

    public List<AuditLogDTO> getByUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(AuditLogDTO::from).toList();
    }

    public List<AuditLogDTO> getByEntityType(String entityType) {
        return auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType)
                .stream().map(AuditLogDTO::from).toList();
    }
}
