package com.example.pi_projet.dto;

import com.example.pi_projet.entity.OrganizationMember;

import java.time.Instant;
import java.util.UUID;

public record OrgMemberDTO(
        UUID id,
        UUID organizationId,
        Long userId,
        String userFullName,
        String userEmail,
        String role,
        Instant joinedAt
) {
    public static OrgMemberDTO from(OrganizationMember m) {
        return new OrgMemberDTO(
                m.getId(),
                m.getOrganization().getId(),
                m.getUserId(),
                m.getUser() != null ? m.getUser().getFullName() : null,
                m.getUser() != null ? m.getUser().getEmail()    : null,
                m.getRole().name(),
                m.getJoinedAt()
        );
    }
}
