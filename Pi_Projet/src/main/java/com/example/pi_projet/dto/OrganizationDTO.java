package com.example.pi_projet.dto;

import com.example.pi_projet.entity.Organization;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrganizationDTO(
        UUID id,
        String name,
        String slug,
        String orgType,
        Long ownerId,
        String stripeCustomerId,
        String billingEmail,
        String vatNumber,
        String billingCountry,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static OrganizationDTO from(Organization org) {
        return new OrganizationDTO(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getOrgType().name(),
                org.getOwnerId(),
                org.getStripeCustomerId(),
                org.getBillingEmail(),
                org.getVatNumber(),
                org.getBillingCountry(),
                org.getCreatedAt(),
                org.getUpdatedAt()
        );
    }
}
