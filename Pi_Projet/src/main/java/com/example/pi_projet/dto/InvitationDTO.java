package com.example.pi_projet.dto;

import com.example.pi_projet.entity.Invitation;
import java.time.LocalDateTime;
import java.util.UUID;

public record InvitationDTO(
        Long id,
        UUID orgId,
        String orgName,
        String email,
        String fullName,
        String platformRole,
        String orgRole,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public static InvitationDTO from(Invitation inv) {
        return new InvitationDTO(
                inv.getId(), inv.getOrgId(), inv.getOrgName(),
                inv.getEmail(), inv.getFullName(),
                inv.getPlatformRole(), inv.getOrgRole(),
                inv.getStatus().name(),
                inv.getCreatedAt(), inv.getExpiresAt()
        );
    }
}
