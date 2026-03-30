package com.example.pi_projet.service;

import com.example.pi_projet.dto.InvitationDTO;
import com.example.pi_projet.dto.OrgMemberDTO;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository    invitationRepository;
    private final OrganizationRepository  organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final UserRepository          userRepository;
    private final EmailService            emailService;
    private final BCryptPasswordEncoder   passwordEncoder;

    private static final String BACKEND_URL    = "http://localhost:8084";
    private static final String FRONTEND_URL   = "http://localhost:4200";
    private static final int    EXPIRY_HOURS   = 48;

    // ── Créer une invitation ───────────────────────────────────────────────
    @Transactional
    public InvitationDTO createInvitation(UUID orgId, String email, String fullName,
                                          String platformRole, String orgRole, Long invitedBy) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));

        // If a pending invitation already exists, cancel it and re-invite
        invitationRepository.findByOrgIdAndEmailAndStatus(orgId, email, Invitation.Status.PENDING)
                .ifPresent(old -> {
                    old.setStatus(Invitation.Status.CANCELLED);
                    invitationRepository.save(old);
                });

        // Already a member?
        userRepository.findByEmail(email).ifPresent(u -> {
            if (memberRepository.existsByOrganizationIdAndUserId(orgId, u.getId()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This user is already a member of this organization.");
        });

        Invitation inv = Invitation.builder()
                .orgId(orgId)
                .orgName(org.getName())
                .email(email)
                .fullName(fullName)
                .platformRole(platformRole)
                .orgRole(orgRole)
                .invitedBy(invitedBy)
                .expiresAt(LocalDateTime.now().plusHours(EXPIRY_HOURS))
                .build();
        inv = invitationRepository.save(inv);

        String acceptUrl  = BACKEND_URL + "/api/invitations/respond?token=" + inv.getToken() + "&action=accept";
        String declineUrl = BACKEND_URL + "/api/invitations/respond?token=" + inv.getToken() + "&action=decline";
        emailService.sendInvitationEmail(email, fullName, org.getName(), platformRole, acceptUrl, declineUrl);

        return InvitationDTO.from(inv);
    }

    // ── Répondre à une invitation (accept / decline) ───────────────────────
    @Transactional
    public String respond(String token, String action) {
        Invitation inv = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invalid or expired invitation link."));

        if (inv.getStatus() != Invitation.Status.PENDING)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This invitation has already been " + inv.getStatus().name().toLowerCase() + ".");

        if (inv.getExpiresAt().isBefore(LocalDateTime.now())) {
            inv.setStatus(Invitation.Status.CANCELLED);
            invitationRepository.save(inv);
            throw new ResponseStatusException(HttpStatus.GONE, "This invitation has expired.");
        }

        if ("decline".equalsIgnoreCase(action)) {
            inv.setStatus(Invitation.Status.DECLINED);
            invitationRepository.save(inv);
            return "declined";
        }

        // Accept → find or create user, add to org
        User user = userRepository.findByEmail(inv.getEmail()).orElseGet(() -> {
            String tempPwd = generateTempPassword();
            User newUser = User.builder()
                    .email(inv.getEmail())
                    .fullName(inv.getFullName())
                    .passwordHash(passwordEncoder.encode(tempPwd))
                    .role(User.RoleName.valueOf(inv.getPlatformRole().toUpperCase()))
                    .isActive(true)
                    .isVerified(true)
                    .mustChangePassword(true)
                    .build();
            User saved = userRepository.save(newUser);
            // Send credentials email
            emailService.sendMemberInviteEmail(inv.getEmail(), inv.getFullName(),
                    inv.getOrgName(), inv.getPlatformRole(), tempPwd);
            return saved;
        });

        Organization org = organizationRepository.findById(inv.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));

        // Check including soft-deleted rows to avoid UK violation
        memberRepository.findByOrganizationIdAndUserIdIncludingDeleted(inv.getOrgId(), user.getId())
                .ifPresentOrElse(existing -> {
                    if (existing.getDeletedAt() != null) {
                        // Restore soft-deleted member
                        existing.setDeletedAt(null);
                        existing.setRole(parseOrgRole(inv.getOrgRole()));
                        memberRepository.save(existing);
                    }
                    // else already active member — nothing to do
                }, () -> {
                    OrganizationMember member = OrganizationMember.builder()
                            .organization(org)
                            .userId(user.getId())
                            .role(parseOrgRole(inv.getOrgRole()))
                            .build();
                    memberRepository.save(member);
                });

        inv.setStatus(Invitation.Status.ACCEPTED);
        invitationRepository.save(inv);
        return "accepted";
    }

    // ── Lister les invitations PENDING d'une org ───────────────────────────
    public List<InvitationDTO> getPendingByOrg(UUID orgId) {
        return invitationRepository.findByOrgIdAndStatus(orgId, Invitation.Status.PENDING)
                .stream().map(InvitationDTO::from).toList();
    }

    // ── Annuler une invitation ─────────────────────────────────────────────
    @Transactional
    public void cancel(Long invitationId) {
        Invitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found."));
        inv.setStatus(Invitation.Status.CANCELLED);
        invitationRepository.save(inv);
    }

    private OrganizationMember.OrganizationRole parseOrgRole(String role) {
        try { return OrganizationMember.OrganizationRole.valueOf(role.toUpperCase()); }
        catch (Exception e) { return OrganizationMember.OrganizationRole.MEMBER; }
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++)
            sb.append(chars.charAt((int)(Math.random() * chars.length())));
        return sb.toString();
    }
}
