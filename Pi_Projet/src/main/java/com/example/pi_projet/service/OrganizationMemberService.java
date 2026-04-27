package com.example.pi_projet.service;

import com.example.pi_projet.dto.AddOrgMemberRequest;
import com.example.pi_projet.dto.InviteMemberRequest;
import com.example.pi_projet.dto.OrgMemberDTO;
import com.example.pi_projet.dto.UserDTO;
import com.example.pi_projet.entity.AuditLog;
import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.OrganizationRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganizationMemberService {

    private final OrganizationMemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDTO> getMemberUsers(UUID orgId) {
        return memberRepository.findByOrganizationId(orgId).stream()
                .map(m -> userRepository.findById(m.getUserId()).orElse(null))
                .filter(u -> u != null)
                .map(UserDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrgMemberDTO> getMembers(UUID orgId) {
        findOrgOrThrow(orgId);
        return memberRepository.findByOrganizationId(orgId).stream()
                .map(m -> OrgMemberDTO.from(m, orgId))
                .toList();
    }

    public OrgMemberDTO addMember(UUID orgId, AddOrgMemberRequest body) {
        Organization org = findOrgOrThrow(orgId);
        User user = userRepository.findById(body.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (memberRepository.existsByOrganizationIdAndUserId(orgId, body.userId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of this organization.");
        validateRoleCompatibility(org.getOrgType(), user.getRole());
        // Handle previously soft-deleted row to avoid UK constraint violation
        OrganizationMember member = memberRepository
                .findByOrganizationIdAndUserIdIncludingDeleted(orgId, user.getId())
                .map(existing -> {
                    existing.setDeletedAt(null);
                    existing.setRole(parseRole(body.role()));
                    return existing;
                })
                .orElseGet(() -> OrganizationMember.builder()
                        .organization(org)
                        .userId(user.getId())
                        .role(parseRole(body.role()))
                        .build());
        OrgMemberDTO saved = OrgMemberDTO.from(memberRepository.save(member));
        auditLogService.log(org.getOwnerId(), AuditLog.ActionType.MEMBER_ADDED, "ORG_MEMBER", saved.id().toString(),
                "User " + user.getEmail() + " added to org " + org.getName() + " as " + saved.role());
        return saved;
    }

    public OrgMemberDTO changeRole(UUID orgId, UUID memberId, String role) {
        OrganizationMember member = findMemberOrThrow(orgId, memberId);
        String oldRole = member.getRole().name();
        member.setRole(parseRole(role));
        OrgMemberDTO updated = OrgMemberDTO.from(memberRepository.save(member));
        auditLogService.log(member.getOrganization().getOwnerId(), AuditLog.ActionType.MEMBER_ROLE_CHANGED, "ORG_MEMBER",
                memberId.toString(), "Role changed from " + oldRole + " to " + role + " for user " + member.getUserId());
        return updated;
    }

    @Transactional
    public OrgMemberDTO inviteMember(UUID orgId, InviteMemberRequest body, Long invitedBy) {
        Organization org = findOrgOrThrow(orgId);

        // Parse and validate platform role
        User.RoleName platformRole;
        try {
            platformRole = User.RoleName.valueOf(body.platformRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform role: " + body.platformRole());
        }
        validateRoleCompatibility(org.getOrgType(), platformRole);

        User savedUser;
        String tempPassword = null;

        // If user already exists → add them to the org instead of creating a new account
        if (userRepository.existsByEmail(body.email())) {
            savedUser = userRepository.findByEmail(body.email())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

            // Already a member of this org?
            if (memberRepository.existsByOrganizationIdAndUserId(orgId, savedUser.getId()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This user is already a member of this organization.");

            // Update role to the requested platform role
            savedUser.setRole(platformRole);
            userRepository.save(savedUser);

        } else {
            // New user → create account with temporary password
            tempPassword = generateTempPassword();
            savedUser = User.builder()
                    .fullName(body.fullName())
                    .email(body.email())
                    .passwordHash(passwordEncoder.encode(tempPassword))
                    .role(platformRole)
                    .isVerified(true)
                    .isActive(true)
                    .mustChangePassword(true)
                    .build();
            userRepository.save(savedUser);
        }

        // Add to organization
        OrganizationMember member = OrganizationMember.builder()
                .organization(org)
                .userId(savedUser.getId())
                .role(parseRole(body.orgRole()))
                .build();
        OrgMemberDTO saved = OrgMemberDTO.from(memberRepository.save(member));

        // Audit log
        auditLogService.log(invitedBy, AuditLog.ActionType.MEMBER_ADDED, "ORG_MEMBER", saved.id().toString(),
                "Invited " + body.email() + " to org " + org.getName() + " as " + platformRole);

        // Send invite email (async) — only for new users
        if (tempPassword != null)
            emailService.sendMemberInviteEmail(body.email(), body.fullName(), org.getName(), platformRole.name(), tempPassword);

        return saved;
    }

    public void removeMember(UUID orgId, UUID memberId) {
        OrganizationMember member = findMemberOrThrow(orgId, memberId);
        memberRepository.delete(member);
        auditLogService.log(member.getOrganization().getOwnerId(), AuditLog.ActionType.MEMBER_REMOVED, "ORG_MEMBER",
                memberId.toString(), "User " + member.getUserId() + " removed from org " + member.getOrganization().getName());
    }

    private Organization findOrgOrThrow(UUID orgId) {
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));
    }

    private OrganizationMember findMemberOrThrow(UUID orgId, UUID memberId) {
        OrganizationMember m = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
        if (!m.getOrganization().getId().equals(orgId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found in this organization.");
        return m;
    }

    private void validateRoleCompatibility(Organization.OrgType orgType, User.RoleName userRole) {
        Set<User.RoleName> common = Set.of(
                User.RoleName.SUPER_ADMIN, User.RoleName.ADMIN, User.RoleName.MANAGER, User.RoleName.VIEWER
        );
        Set<User.RoleName> enterpriseOnly = Set.of(
                User.RoleName.EMPLOYEE, User.RoleName.PRODUCT_OWNER
        );
        Set<User.RoleName> academicOnly = Set.of(
                User.RoleName.TUTOR, User.RoleName.STUDENT
        );

        boolean allowed = switch (orgType) {
            case ENTERPRISE -> common.contains(userRole) || enterpriseOnly.contains(userRole);
            case ACADEMIC   -> common.contains(userRole) || academicOnly.contains(userRole);
        };

        if (!allowed) {
            String allowed_roles = orgType == Organization.OrgType.ENTERPRISE
                    ? "SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, PRODUCT_OWNER, VIEWER"
                    : "SUPER_ADMIN, ADMIN, MANAGER, TUTOR, STUDENT, VIEWER";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "User role " + userRole + " is not allowed in a " + orgType + " organization. Allowed roles: " + allowed_roles);
        }
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(rng.nextInt(chars.length())));
        return sb.toString();
    }

    private OrganizationMember.OrganizationRole parseRole(String role) {
        if (role == null) return OrganizationMember.OrganizationRole.MEMBER;
        try {
            return OrganizationMember.OrganizationRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role. Use OWNER, ADMIN or MEMBER.");
        }
    }
}
