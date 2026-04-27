package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.AuthResponse;
import com.example.pi_projet.dto.LoginRequest;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.PasswordResetToken;
import com.example.pi_projet.entity.Session;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.PasswordResetTokenRepository;
import com.example.pi_projet.repository.SessionRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.service.AuthService;
import com.example.pi_projet.service.EmailService;
import com.example.pi_projet.service.MagicLinkService;
import com.example.pi_projet.service.TwoFactorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, logout, session and Face ID endpoints")
public class AuthController {

    private final AuthService                   authService;
    private final TwoFactorService              twoFactorService;
    private final MagicLinkService              magicLinkService;
    private final UserRepository                userRepository;
    private final SessionRepository             sessionRepository;
    private final OrganizationMemberRepository  organizationMemberRepository;
    private final BCryptPasswordEncoder         passwordEncoder;
    private final PasswordResetTokenRepository  passwordResetTokenRepository;
    private final EmailService                  emailService;

    private static final String FRONTEND_URL         = "http://localhost:4200";
    private static final int    RESET_EXPIRY_MINUTES = 30;

    // ── POST /api/auth/login ──────────────────────────────────────────────
    @Operation(summary = "Sign in with email + password")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body, HttpServletRequest request) {
        Optional<AuthService.LoginResult> result = authService.login(body.email(), body.password(), request);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }

        AuthService.LoginResult lr = result.get();

        // ── 2FA activé → demander le code avant d'émettre le JWT ─────────────
        if (lr.mfaRequired()) {
            return ResponseEntity.ok(Map.of(
                    "mfaRequired", true,
                    "userId", lr.userId()
            ));
        }

        User user = authService.getUserFromToken(lr.token()).orElseThrow();

        return ResponseEntity.ok(new AuthResponse(
                lr.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                user.getAvatarUrl()
        ));
    }

    // ── POST /api/auth/face-login ─────────────────────────────────────────
    @Operation(summary = "Sign in with face descriptor (public endpoint)")
    @PostMapping("/face-login")
    public ResponseEntity<?> faceLogin(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        @SuppressWarnings("unchecked")
        List<Number> raw = (List<Number>) body.get("descriptor");
        if (raw == null || raw.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Descriptor is required."));
        }
        double[] descriptor = raw.stream().mapToDouble(Number::doubleValue).toArray();

        Optional<AuthService.LoginResult> result = authService.loginByFace(descriptor, request);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Face not recognized."));
        }

        AuthService.LoginResult lr = result.get();
        User user = authService.getUserFromToken(lr.token()).orElseThrow();

        return ResponseEntity.ok(new AuthResponse(
                lr.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                user.getAvatarUrl()
        ));
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────
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

    // ── GET /api/auth/me ──────────────────────────────────────────────────
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
                Boolean.TRUE.equals(user.getMustChangePassword()),
                user.getAvatarUrl()
        ));
    }

    // ── GET /api/auth/me/organizations ────────────────────────────────────
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

    // ── POST /api/auth/change-password ────────────────────────────────────
    @Operation(summary = "Set new password — required after first login")
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

        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    // ── POST /api/auth/face-register ──────────────────────────────────────
    @Authorized
    @Operation(summary = "Register face for current user")
    @PostMapping("/face-register")
    public ResponseEntity<?> registerFace(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        @SuppressWarnings("unchecked")
        List<Number> raw = (List<Number>) body.get("descriptor");
        if (raw == null || raw.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Descriptor is required."));
        }
        double[] descriptor = raw.stream().mapToDouble(Number::doubleValue).toArray();
        authService.registerFace(user.getId(), descriptor);
        return ResponseEntity.ok(Map.of("message", "Face registered successfully."));
    }

    // ── DELETE /api/auth/face-register ────────────────────────────────────
    @Authorized
    @Operation(summary = "Remove face registration for current user")
    @DeleteMapping("/face-register")
    public ResponseEntity<?> removeFace(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        authService.removeFace(user.getId());
        return ResponseEntity.ok(Map.of("message", "Face ID removed successfully."));
    }

    // ── GET /api/auth/sessions ────────────────────────────────────────────
    @Authorized
    @Operation(summary = "Get current user's active sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<Session>> getMySessions(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(sessionRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(user.getId()));
    }

    // ── DELETE /api/auth/sessions/{id} ────────────────────────────────────
    @Authorized
    @Operation(summary = "Revoke a specific session")
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> revokeSession(@PathVariable Long id, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        sessionRepository.findByIdAndUserId(id, user.getId()).ifPresent(s -> {
            s.setIsActive(false);
            s.setRevokedAt(java.time.LocalDateTime.now());
            sessionRepository.save(s);
        });
        return ResponseEntity.ok(Map.of("message", "Session revoked."));
    }

    // ── GET /api/auth/face-duplicates ─────────────────────────────────────
    @Authorized
    @Operation(summary = "Find accounts sharing the same face (SUPER_ADMIN)")
    @GetMapping("/face-duplicates")
    public ResponseEntity<List<AuthService.FaceDuplicatePair>> faceDuplicates(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user.getRole() != User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(authService.findFaceDuplicates());
    }

    // ── POST /api/auth/2fa/setup ──────────────────────────────────────────
    @Authorized
    @Operation(summary = "Generate a new 2FA secret and return the QR code URI")
    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setup2FA(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        String secret = twoFactorService.generateSecret();
        String otpUri = twoFactorService.getOtpAuthUri(secret, user.getEmail());
        // Retourne la clé secrète + l'URI pour afficher le QR code côté frontend
        // Ne pas encore sauvegarder en base — attendre la confirmation avec enable2FA
        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "otpAuthUri", otpUri
        ));
    }

    // ── POST /api/auth/2fa/enable ─────────────────────────────────────────
    @Authorized
    @Operation(summary = "Enable 2FA after user scanned QR and verified first code")
    @PostMapping("/2fa/enable")
    public ResponseEntity<?> enable2FA(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        String secret = body.get("secret").toString();
        String code   = body.get("code").toString();
        twoFactorService.enable2FA(user.getId(), secret, code);
        return ResponseEntity.ok(Map.of("message", "2FA enabled successfully."));
    }

    // ── POST /api/auth/2fa/disable ────────────────────────────────────────
    @Authorized
    @Operation(summary = "Disable 2FA — requires current TOTP code to confirm")
    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disable2FA(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        String code = body.get("code").toString();
        twoFactorService.disable2FA(user.getId(), code);
        return ResponseEntity.ok(Map.of("message", "2FA disabled successfully."));
    }

    // ── POST /api/auth/2fa/verify ─────────────────────────────────────────
    @Operation(summary = "Verify TOTP code after password login — returns JWT if correct")
    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String code = body.get("code").toString();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!twoFactorService.verifyCode(user.getMfaSecret(), code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid 2FA code. Please try again."));
        }

        // Code correct → créer la session et retourner le JWT
        Optional<AuthService.LoginResult> result = authService.loginAfter2FA(userId, request);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account is not active."));
        }

        AuthService.LoginResult lr = result.get();
        return ResponseEntity.ok(new AuthResponse(
                lr.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                user.getAvatarUrl()
        ));
    }

    // ── POST /api/auth/magic-link ─────────────────────────────────────────
    @Operation(summary = "Send a magic link to the given email address")
    @PostMapping("/magic-link")
    public ResponseEntity<?> sendMagicLink(@RequestBody Map<String, Object> body) {
        String email = body.get("email").toString();
        magicLinkService.sendMagicLink(email);
        // Always return success — don't reveal if email exists
        return ResponseEntity.ok(Map.of("message", "If this email is registered, a sign-in link has been sent."));
    }

    // ── POST /api/auth/magic-link/verify ──────────────────────────────────
    @Operation(summary = "Verify a magic link token and return a JWT")
    @PostMapping("/magic-link/verify")
    public ResponseEntity<?> verifyMagicLink(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = body.get("token").toString();
        AuthService.LoginResult result = magicLinkService.verifyMagicLink(token, request);
        User user = authService.getUserFromToken(result.token()).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(
                result.token(),
                user.getId(), user.getEmail(), user.getFullName(), user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                user.getAvatarUrl()
        ));
    }

    // ── POST /api/auth/forgot-password ───────────────────────────────────
    @Operation(summary = "Request a password reset link — returns 404 if email not found")
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, Object> body) {
        String email = body.get("email").toString().trim().toLowerCase();

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "This email does not exist."));
        }

        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "This account is disabled."));
        }

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .userId(user.getId())
                .expiresAt(LocalDateTime.now().plusMinutes(RESET_EXPIRY_MINUTES))
                .build();
        passwordResetTokenRepository.save(resetToken);

        String resetUrl = FRONTEND_URL + "/auth/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetUrl);

        return ResponseEntity.ok(Map.of("message", "A password reset link has been sent to your inbox."));
    }

    // ── POST /api/auth/reset-password ────────────────────────────────────
    @Operation(summary = "Reset password using the token received by email")
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, Object> body) {
        String token       = body.get("token").toString();
        String newPassword = body.get("newPassword").toString();

        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must be at least 8 characters."));
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElse(null);

        if (resetToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired reset link. Please request a new one."));
        }
        if (Boolean.TRUE.equals(resetToken.getUsed())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "This reset link has already been used. Please request a new one."));
        }
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "This reset link has expired. Please request a new one."));
        }

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }

    // ── GET /api/auth/stats/activity ─────────────────────────────────────
    @Authorized
    @Operation(summary = "Get login activity statistics (SUPER_ADMIN or ADMIN)")
    @GetMapping("/stats/activity")
    public ResponseEntity<?> getActivityStats(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user.getRole() != User.RoleName.SUPER_ADMIN && user.getRole() != User.RoleName.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime since30 = now.minusDays(30);
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();

        // Logins per day for last 30 days
        List<Object[]> rows = sessionRepository.countLoginsPerDaySince(since30);
        Map<String, Long> loginsPerDay = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String day = row[0].toString().substring(0, 10);
            loginsPerDay.put(day, ((Number) row[1]).longValue());
        }

        long todayLogins = sessionRepository.countLoginsSince(todayStart);
        long activeUsersLast7Days = sessionRepository.countDistinctActiveUsersSince(now.minusDays(7));
        long totalLogins30Days = sessionRepository.countLoginsSince(since30);

        return ResponseEntity.ok(Map.of(
                "loginsPerDay", loginsPerDay,
                "todayLogins", todayLogins,
                "activeUsersLast7Days", activeUsersLast7Days,
                "totalLogins30Days", totalLogins30Days
        ));
    }

}
