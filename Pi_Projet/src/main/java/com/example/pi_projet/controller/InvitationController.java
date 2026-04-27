package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.InvitationDTO;
import com.example.pi_projet.dto.InviteMemberRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.InvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Invitations", description = "Org member invitation workflow")
public class InvitationController {

    private final InvitationService invitationService;

    // ── POST /api/organizations/{orgId}/members/invite ──────────────────────
    // (remplace l'ancien endpoint de inviteMember — admin seulement)
    @Authorized
    @Operation(summary = "Create and send an invitation to join an organization")
    @PostMapping("/api/organizations/{orgId}/members/invite")
    public ResponseEntity<InvitationDTO> invite(
            @PathVariable UUID orgId,
            @RequestBody InviteMemberRequest body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        boolean isSuperAdmin = currentUser.getRole() == User.RoleName.SUPER_ADMIN;
        if (!isSuperAdmin && "ADMIN".equalsIgnoreCase(body.platformRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SUPER_ADMIN can assign the ADMIN role.");
        }
        InvitationDTO dto = invitationService.createInvitation(
                orgId, body.email(), body.fullName(),
                body.platformRole(), body.orgRole() != null ? body.orgRole() : "MEMBER",
                currentUser.getId()
        );
        return ResponseEntity.status(201).body(dto);
    }

    // ── GET /api/invitations/respond — public, called directly from email link ──
    // Browser navigates here → backend processes → redirects to Angular with result
    @Operation(summary = "Accept or decline an invitation (browser redirect flow)")
    @GetMapping("/api/invitations/respond")
    public void respond(
            @RequestParam String token,
            @RequestParam String action,
            HttpServletResponse response) throws IOException {
        try {
            String result = invitationService.respond(token, action);
            if ("accepted".equals(result)) {
                response.sendRedirect("http://localhost:4200/auth/invitation?state=accepted&message="
                        + URLEncoder.encode("Invitation accepted! Your account is ready.", StandardCharsets.UTF_8));
            } else {
                response.sendRedirect("http://localhost:4200/auth/invitation?state=declined");
            }
        } catch (ResponseStatusException e) {
            String msg = URLEncoder.encode(
                    e.getReason() != null ? e.getReason() : "Something went wrong.", StandardCharsets.UTF_8);
            response.sendRedirect("http://localhost:4200/auth/invitation?state=error&message=" + msg);
        } catch (Exception e) {
            response.sendRedirect("http://localhost:4200/auth/invitation?state=error&message="
                    + URLEncoder.encode("Something went wrong. Please try again.", StandardCharsets.UTF_8));
        }
    }

    // ── GET /api/organizations/{orgId}/invitations — pending list ───────────
    @Authorized
    @Operation(summary = "List pending invitations for an organization")
    @GetMapping("/api/organizations/{orgId}/invitations")
    public ResponseEntity<List<InvitationDTO>> getPending(@PathVariable UUID orgId) {
        return ResponseEntity.ok(invitationService.getPendingByOrg(orgId));
    }

    // ── DELETE /api/invitations/{id} — cancel ───────────────────────────────
    @Authorized
    @Operation(summary = "Cancel a pending invitation")
    @DeleteMapping("/api/invitations/{id}")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        invitationService.cancel(id);
        return ResponseEntity.ok(Map.of("message", "Invitation cancelled."));
    }
}
