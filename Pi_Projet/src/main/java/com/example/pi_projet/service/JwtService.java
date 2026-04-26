package com.example.pi_projet.service;

import com.example.pi_projet.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-hours:8}")
    private int expirationHours;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    /**
     * Generate a signed JWT for the given user.
     * @param user the authenticated user
     * @param jti  unique token ID (stored in Session table for revocation)
     */
    public String generate(User user, String jti) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(jti)
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(new Date(now))
                .expiration(new Date(now + (long) expirationHours * 3_600_000))
                .signWith(key())
                .compact();
    }

    /**
     * Parse and validate a JWT. Throws JwtException if invalid or expired.
     */
    public Claims validate(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Extract the token's unique ID (jti claim). */
    public String extractJti(String token) {
        return validate(token).getId();
    }

    /** Extract the user ID from the subject claim. */
    public Long extractUserId(String token) {
        return Long.valueOf(validate(token).getSubject());
    }
}
