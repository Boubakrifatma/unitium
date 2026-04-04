package com.example.pi_projet.service;

import com.example.pi_projet.entity.Session;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.SessionRepository;
import com.example.pi_projet.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository    userRepository;
    private final SessionRepository sessionRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    private static final int SESSION_HOURS = 8;

    public Optional<String> login(String email, String password, HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return Optional.empty();

        User user = userOpt.get();
        if (!Boolean.TRUE.equals(user.getIsActive())) return Optional.empty();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) return Optional.empty();

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = UUID.randomUUID().toString();
        sessionRepository.save(Session.builder()
                .userId(user.getId())
                .tokenHash(token)
                .ipAddress(request.getRemoteAddr())
                .userAgent(request.getHeader("User-Agent"))
                .isActive(true)
                .expiresAt(LocalDateTime.now().plusHours(SESSION_HOURS))
                .build());

        return Optional.of(token);
    }

    public Optional<User> getUserFromToken(String token) {
        if (token == null) return Optional.empty();
        return sessionRepository.findByTokenHashAndIsActiveTrue(token)
                .filter(s -> s.getExpiresAt() != null && s.getExpiresAt().isAfter(LocalDateTime.now()))
                .flatMap(s -> userRepository.findById(s.getUserId()));
    }

    public void logout(String token) {
        sessionRepository.findByTokenHashAndIsActiveTrue(token).ifPresent(s -> {
            s.setIsActive(false);
            s.setRevokedAt(LocalDateTime.now());
            sessionRepository.save(s);
        });
    }
}
