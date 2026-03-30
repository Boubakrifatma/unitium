package com.example.pi_projet.service;

import com.example.pi_projet.entity.Session;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.SessionRepository;
import com.example.pi_projet.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository            userRepository;
    private final SessionRepository         sessionRepository;
    private final BCryptPasswordEncoder     passwordEncoder;
    private final AnomalyDetectionService   anomalyService;
    private final JwtService                jwtService;

    private static final int   SESSION_HOURS       = 8;
    private static final float FACE_THRESHOLD      = 0.50f;  // strict — login
    private static final float DUPLICATE_THRESHOLD = 0.60f;  // permissive — duplicate detection

    /**
     * Result returned by login().
     * Si mfaRequired=true  → token est null, userId est rempli (attente code 2FA).
     * Si mfaRequired=false → token est le JWT, connexion complète.
     */
    public record LoginResult(
            String token,
            AnomalyDetectionService.AnomalyResult anomaly,
            boolean mfaRequired,
            Long userId
    ) {
        // Constructeur pour connexion normale (sans 2FA)
        public LoginResult(String token, AnomalyDetectionService.AnomalyResult anomaly) {
            this(token, anomaly, false, null);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Password login
    // ──────────────────────────────────────────────────────────────
    public Optional<LoginResult> login(String email, String password, HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return Optional.empty();

        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) return Optional.empty();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) return Optional.empty();

        user.setLastLoginAt(LocalDateTime.now());
        // Update usual login hour (rolling average)
        int hour = LocalDateTime.now().getHour();
        user.setUsualLoginHour(user.getUsualLoginHour() == null ? hour
                : (user.getUsualLoginHour() + hour) / 2);
        userRepository.save(user);

        // ── Si 2FA activé → ne pas créer la session, demander le code ────────
        if (Boolean.TRUE.equals(user.getMfaEnabled())) {
            return Optional.of(new LoginResult(null, null, true, user.getId()));
        }

        AnomalyDetectionService.AnomalyResult anomaly = anomalyService.evaluate(user, request);

        // Lock account if ACCOUNT_LOCKED action
        if (anomaly.action() == Session.ActionTaken.ACCOUNT_LOCKED) {
            user.setIsActive(false);
            userRepository.save(user);
        }

        String token = createSessionForUser(user, request, anomaly);
        return Optional.of(new LoginResult(token, anomaly));
    }

    // ──────────────────────────────────────────────────────────────
    // Connexion après validation du code 2FA
    // ──────────────────────────────────────────────────────────────
    public Optional<LoginResult> loginAfter2FA(Long userId, HttpServletRequest request) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) return Optional.empty();

        AnomalyDetectionService.AnomalyResult anomaly = anomalyService.evaluate(user, request);
        if (anomaly.action() == Session.ActionTaken.ACCOUNT_LOCKED) {
            user.setIsActive(false);
            userRepository.save(user);
        }

        String token = createSessionForUser(user, request, anomaly);
        return Optional.of(new LoginResult(token, anomaly));
    }

    // ──────────────────────────────────────────────────────────────
    // Face login
    // ──────────────────────────────────────────────────────────────
    public Optional<LoginResult> loginByFace(double[] descriptor, HttpServletRequest request) {
        List<User> users = userRepository.findAll();
        User matched = null;
        double bestDist = Double.MAX_VALUE;

        for (User u : users) {
            if (u.getFaceEncoding() == null || !Boolean.TRUE.equals(u.getIsActive())) continue;
            double dist = euclidean(descriptor, parseEncoding(u.getFaceEncoding()));
            if (dist < bestDist) {
                bestDist = dist;
                matched = u;
            }
        }

        if (matched == null || bestDist > FACE_THRESHOLD) return Optional.empty();

        matched.setLastLoginAt(LocalDateTime.now());
        userRepository.save(matched);

        AnomalyDetectionService.AnomalyResult anomaly = anomalyService.evaluate(matched, request);
        String token = createSessionForUser(matched, request, anomaly);
        return Optional.of(new LoginResult(token, anomaly));
    }

    // ──────────────────────────────────────────────────────────────
    // Face registration
    // ──────────────────────────────────────────────────────────────
    public void registerFace(Long userId, double[] descriptor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        // Check for duplicate face across all other users
        List<User> all = userRepository.findAll();
        for (User other : all) {
            if (other.getId().equals(userId) || other.getFaceEncoding() == null) continue;
            double dist = euclidean(descriptor, parseEncoding(other.getFaceEncoding()));
            if (dist <= DUPLICATE_THRESHOLD) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This face is already registered to another account.");
            }
        }

        user.setFaceEncoding(Arrays.toString(descriptor));
        user.setFaceRegisteredAt(LocalDateTime.now());
        userRepository.save(user);
    }

    // ──────────────────────────────────────────────────────────────
    // Remove face registration
    // ──────────────────────────────────────────────────────────────
    public void removeFace(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setFaceEncoding(null);
        user.setFaceRegisteredAt(null);
        userRepository.save(user);
    }

    // ──────────────────────────────────────────────────────────────
    // Find duplicate faces across all users
    // ──────────────────────────────────────────────────────────────
    public record FaceDuplicatePair(UserInfo user1, UserInfo user2, double distance) {}
    public record UserInfo(Long id, String email, String fullName) {}

    public List<FaceDuplicatePair> findFaceDuplicates() {
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getFaceEncoding() != null)
                .toList();

        List<FaceDuplicatePair> duplicates = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            for (int j = i + 1; j < users.size(); j++) {
                User a = users.get(i);
                User b = users.get(j);
                double dist = euclidean(
                        parseEncoding(a.getFaceEncoding()),
                        parseEncoding(b.getFaceEncoding()));
                if (dist <= DUPLICATE_THRESHOLD) {
                    duplicates.add(new FaceDuplicatePair(
                            new UserInfo(a.getId(), a.getEmail(), a.getFullName()),
                            new UserInfo(b.getId(), b.getEmail(), b.getFullName()),
                            Math.round(dist * 1000.0) / 1000.0
                    ));
                }
            }
        }
        return duplicates;
    }

    // ──────────────────────────────────────────────────────────────
    // Session helpers
    // ──────────────────────────────────────────────────────────────
    public Optional<User> getUserFromToken(String token) {
        if (token == null) return Optional.empty();
        try {
            // 1. Validate JWT signature + expiry
            String jti = jwtService.extractJti(token);
            Long userId = jwtService.extractUserId(token);

            // 2. Check session not revoked (logout support)
            boolean active = sessionRepository.findByTokenHashAndIsActiveTrue(jti).isPresent();
            if (!active) return Optional.empty();

            // 3. Load user
            return userRepository.findById(userId);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public void logout(String token) {
        try {
            String jti = jwtService.extractJti(token);
            sessionRepository.findByTokenHashAndIsActiveTrue(jti).ifPresent(s -> {
                s.setIsActive(false);
                s.setRevokedAt(LocalDateTime.now());
                sessionRepository.save(s);
            });
        } catch (Exception ignored) {}
    }

    // ──────────────────────────────────────────────────────────────
    // Internal helpers
    // ──────────────────────────────────────────────────────────────
    private String createSessionForUser(User user, HttpServletRequest request,
                                        AnomalyDetectionService.AnomalyResult anomaly) {
        String jti = UUID.randomUUID().toString();
        String jwt = jwtService.generate(user, jti);

        // Store jti (not the full JWT) for revocation support
        Session session = Session.builder()
                .userId(user.getId())
                .tokenHash(jti)
                .ipAddress(request.getRemoteAddr())
                .userAgent(request.getHeader("User-Agent"))
                .isActive(true)
                .expiresAt(LocalDateTime.now().plusHours(SESSION_HOURS))
                .build();
        anomalyService.enrichSession(session, anomaly);
        sessionRepository.save(session);
        return jwt;
    }

    private double euclidean(double[] a, double[] b) {
        double sum = 0;
        int len = Math.min(a.length, b.length);
        for (int i = 0; i < len; i++) {
            double d = a[i] - b[i];
            sum += d * d;
        }
        return Math.sqrt(sum);
    }

    private double[] parseEncoding(String encoded) {
        String trimmed = encoded.replace("[", "").replace("]", "").trim();
        String[] parts = trimmed.split(",");
        double[] result = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Double.parseDouble(parts[i].trim());
        }
        return result;
    }
}
