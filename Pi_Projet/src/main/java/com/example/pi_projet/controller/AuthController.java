package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.AuthResponse;
import com.example.pi_projet.dto.LoginRequest;
import com.example.pi_projet.entity.Session;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.SessionRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.service.AnomalyDetectionService;
import com.example.pi_projet.service.AuthService;
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

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, logout, session, Face ID and anomaly endpoints")
public class AuthController {

    private final AuthService               authService;
    private final TwoFactorService          twoFactorService;
    private final MagicLinkService          magicLinkService;
    private final AnomalyDetectionService   anomalyService;
    private final UserRepository            userRepository;
    private final SessionRepository         sessionRepository;
    private final BCryptPasswordEncoder     passwordEncoder;

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

        if (lr.anomaly().action() == Session.ActionTaken.ACCOUNT_LOCKED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account locked due to suspicious activity."));
        }

        return ResponseEntity.ok(new AuthResponse(
                lr.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                lr.anomaly().score(),
                lr.anomaly().action().name()
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
                lr.anomaly().score(),
                lr.anomaly().action().name()
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
                Boolean.TRUE.equals(user.getMustChangePassword())
        ));
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
                lr.anomaly().score(),
                lr.anomaly().action().name()
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
                Boolean.TRUE.equals(user.getMustChangePassword())
        ));
    }

    // ── GET /api/auth/anomalies ───────────────────────────────────────────
    @Authorized
    @Operation(summary = "Get recent high-anomaly login sessions (SUPER_ADMIN)")
    @GetMapping("/anomalies")
    public ResponseEntity<List<Session>> getAnomalies(
            @RequestParam(defaultValue = "0.60") float threshold,
            HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user.getRole() != User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(anomalyService.getRecentAnomalies(threshold));
    }
}
