package com.example.pi_projet.dto;

/**
 * Payload to invite a new user to an organization.
 * platformRole: the User.RoleName to assign (EMPLOYEE, MANAGER, TUTOR, STUDENT, etc.)
 * orgRole: the OrganizationMember.OrganizationRole (ADMIN or MEMBER)
 */
public record InviteMemberRequest(
        String fullName,
        String email,
        String platformRole,
        String orgRole
) {}
