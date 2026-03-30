package com.example.pi_projet.service;

import com.example.pi_projet.entity.MagicLinkToken;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.MagicLinkTokenRepository;
import com.example.pi_projet.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MagicLinkService {

    private final MagicLinkTokenRepository tokenRepository;
    private final UserRepository           userRepository;
    private final EmailService             emailService;
    private final AuthService              authService;

    private static final String FRONTEND_URL  = "http://localhost:4200";
    private static final int    EXPIRY_MINUTES = 10;

    /**
     * Generates a magic link token, saves it, and sends the email.
     * Always returns success (don't reveal if email exists).
     */
    public void sendMagicLink(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return; // silent — don't reveal account existence

        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) return;

        String token = UUID.randomUUID().toString();

        MagicLinkToken magicToken = MagicLinkToken.builder()
                .token(token)
                .userId(user.getId())
                .expiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES))
                .build();
        tokenRepository.save(magicToken);

        String magicUrl = FRONTEND_URL + "/auth/magic-callback?token=" + token;
        emailService.sendMagicLink(user.getEmail(), user.getFullName(), magicUrl);
    }

    /**
     * Verifies the magic link token and returns a JWT if valid.
     */
    public AuthService.LoginResult verifyMagicLink(String token, HttpServletRequest request) {
        MagicLinkToken magicToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Invalid or expired link. Please request a new one."));

        if (Boolean.TRUE.equals(magicToken.getUsed())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "This link has already been used. Please request a new one.");
        }

        if (magicToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "This link has expired. Please request a new one.");
        }

        // Mark token as used
        magicToken.setUsed(true);
        tokenRepository.save(magicToken);

        // Create session and return JWT
        User user = userRepository.findById(magicToken.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled.");
        }

        String jwt = authService.loginWithOAuth2(user, request);
        return new AuthService.LoginResult(jwt, null);
    }
}
