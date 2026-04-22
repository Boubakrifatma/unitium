package com.example.pi_projet.service.github;

import com.example.pi_projet.entity.GithubCredential;
import com.example.pi_projet.repository.GithubCredentialRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * High-level credential management: save, validate, decrypt-on-demand.
 *
 * Validation calls GET /user with the supplied token; if it succeeds we keep
 * the resolved login + avatar so we can show "logged in as X" in the UI without
 * having to decrypt the token every page load.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GithubCredentialService {

    private final GithubCredentialRepository repo;
    private final TokenEncryptionService crypto;
    private final GithubApiClient github;

    @Transactional
    public GithubCredential saveOrUpdateToken(Long userId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Token cannot be empty");
        }
        String trimmed = rawToken.trim();

        // Validate against GitHub before persisting anything.
        JsonNode me;
        try {
            me = github.getAuthenticatedUser(trimmed);
        } catch (GithubApiException e) {
            throw new IllegalArgumentException("Invalid GitHub token (HTTP " + e.getStatus() + ")", e);
        }

        String login = me.path("login").asText(null);
        String avatar = me.path("avatar_url").asText(null);

        GithubCredential c = repo.findByUserId(userId).orElseGet(() ->
                GithubCredential.builder().userId(userId).build()
        );
        c.setEncryptedToken(crypto.encrypt(trimmed));
        c.setGithubLogin(login);
        c.setGithubAvatarUrl(avatar);
        c.setTokenHint(crypto.hint(trimmed));
        return repo.save(c);
    }

    public boolean hasToken(Long userId) {
        return repo.existsByUserId(userId);
    }

    public Optional<GithubCredential> getCredential(Long userId) {
        return repo.findByUserId(userId);
    }

    /** Decrypts and returns the raw token for use in API calls. */
    public String getRawToken(Long userId) {
        GithubCredential c = repo.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No GitHub token saved for this user"));
        return crypto.decrypt(c.getEncryptedToken());
    }

    @Transactional
    public void deleteToken(Long userId) {
        repo.deleteByUserId(userId);
    }
}
