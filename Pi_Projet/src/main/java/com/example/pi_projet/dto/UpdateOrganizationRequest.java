package com.example.pi_projet.dto;

public record UpdateOrganizationRequest(
        String name,
        String orgType,
        String billingEmail,
        String vatNumber,
        String billingCountry
) {}
