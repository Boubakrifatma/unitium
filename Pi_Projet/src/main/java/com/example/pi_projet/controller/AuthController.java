package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.AuthResponse;
import com.example.pi_projet.dto.LoginRequest;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, logout, session and password management")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final OrganizationMemberRepository organizationMemberRepository;

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/login
    // Retourne mustChangePassword=true si c'est la première connexion
    // ─────────────────────────────────────────────────────────────────────
    @Operation(summary = "Sign in — returns mustChangePassword flag for new org admins")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body, HttpServletRequest request) {
        Optional<String> tokenOpt = authService.login(body.email(), body.password(), request);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }
        User user = authService.getUserFromToken(tokenOpt.get()).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(
                tokenOpt.get(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword())
        ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/logout
    // ─────────────────────────────────────────────────────────────────────
    @Authorized
    @Operation(summary = "Sign out")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            authService.logout(header.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/auth/me
    // ─────────────────────────────────────────────────────────────────────
    @Authorized
    @Operation(summary = "Get current authenticated user")
    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(new AuthResponse(
                null,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword())
        ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/auth/me/organizations
    // Returns all organization memberships for the current user.
    // Returns empty array (not 404) when user has no memberships.
    // ─────────────────────────────────────────────────────────────────────
    @Authorized
    @Operation(summary = "Get all organizations the current user belongs to")
    @GetMapping("/me/organizations")
    public ResponseEntity<?> meOrganizations(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        List<OrganizationMember> memberships =
            organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(user.getId());
        List<Map<String, Object>> result = memberships.stream()
            .filter(m -> m.getOrganization() != null)
            .map(m -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("organizationId",   m.getOrganization().getId());
                row.put("organizationName", m.getOrganization().getName());
                row.put("organizationSlug", m.getOrganization().getSlug());
                row.put("organizationType", m.getOrganization().getOrgType() != null
                    ? m.getOrganization().getOrgType().name() : "ENTERPRISE");
                row.put("membershipRole",   m.getRole() != null ? m.getRole().name() : "MEMBER");
                return row;
            })
            .toList();
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/change-password
    // Utilisé obligatoirement après la première connexion (mustChangePassword=true)
    // Body: { "userId": 5, "newPassword": "..." }
    // ─────────────────────────────────────────────────────────────────────
    @Operation(summary = "Set new password — required after first login with default password")
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String newPassword = body.get("newPassword").toString();

        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Password must be at least 8 characters."));
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully. You can now log in."));
    }
}
