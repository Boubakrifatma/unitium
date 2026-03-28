package com.example.pi_projet.dto;

public record CreateOrganizationRequest(
        String name,
        String slug,
        String orgType,
        Long ownerId,
        String billingEmail,
        String vatNumber,
        String billingCountry
) {}
