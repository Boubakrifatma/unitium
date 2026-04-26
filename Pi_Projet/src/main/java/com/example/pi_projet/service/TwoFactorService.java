package com.example.pi_projet.service;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.UserRepository;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class TwoFactorService {

    private final UserRepository userRepository;

    // ── TOTP utilities ────────────────────────────────────────────────────────
    private final DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final DefaultCodeVerifier codeVerifier;

    public TwoFactorService(UserRepository userRepository) {
        this.userRepository = userRepository;
        DefaultCodeVerifier v = new DefaultCodeVerifier(
                new DefaultCodeGenerator(), new SystemTimeProvider()
        );
        // Allow ±2 time windows (±60 s) to tolerate server/phone clock skew
        v.setAllowedTimePeriodDiscrepancy(2);
        this.codeVerifier = v;
    }

    // ── Génère une clé secrète aléatoire (à stocker dans user.mfaSecret) ─────
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /**
     * Construit l'URI otpauth:// que Google Authenticator comprend.
     * Le frontend affichera cette URI sous forme de QR code.
     * Format : otpauth://totp/ISSUER:EMAIL?secret=SECRET&issuer=ISSUER
     */
    public String getOtpAuthUri(String secret, String email) {
        String encoded = URLEncoder.encode(email, StandardCharsets.UTF_8);
        return "otpauth://totp/PiProjet:" + encoded
                + "?secret=" + secret
                + "&issuer=PiProjet"
                + "&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Vérifie que le code à 6 chiffres entré par l'utilisateur est correct.
     * Accepte aussi le code de la période précédente/suivante (décalage 30s).
     */
    public boolean verifyCode(String secret, String code) {
        if (secret == null || code == null) return false;
        try {
            return codeVerifier.isValidCode(secret, code.trim());
        } catch (Exception e) {
            return false;
        }
    }

    // ── Active le 2FA après vérification du 1er code ──────────────────────────
    public void enable2FA(Long userId, String secret, String code) {
        if (!verifyCode(secret, code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid verification code. Please try again.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setMfaSecret(secret);
        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    // ── Désactive le 2FA après vérification du code ───────────────────────────
    public void disable2FA(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (!Boolean.TRUE.equals(user.getMfaEnabled())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2FA is not enabled.");
        }
        if (!verifyCode(user.getMfaSecret(), code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid verification code.");
        }
        user.setMfaSecret(null);
        user.setMfaEnabled(false);
        userRepository.save(user);
    }
}
