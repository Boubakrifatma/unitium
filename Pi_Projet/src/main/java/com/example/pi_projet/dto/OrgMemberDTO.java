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
        String platformRole,
        Instant joinedAt
) {
    /** Used when the orgId is already known — avoids lazy-loading the organization proxy. */
    public static OrgMemberDTO from(OrganizationMember m, UUID orgId) {
        return new OrgMemberDTO(
                m.getId(),
                orgId,
                m.getUserId(),
                m.getUser() != null ? m.getUser().getFullName() : null,
                m.getUser() != null ? m.getUser().getEmail()    : null,
                m.getRole().name(),
                m.getUser() != null ? m.getUser().getRole().name() : null,
                m.getJoinedAt()
        );
    }

    /** Fallback — requires an active persistence context for lazy org load. */
    public static OrgMemberDTO from(OrganizationMember m) {
        return from(m, m.getOrganization().getId());
    }
}
