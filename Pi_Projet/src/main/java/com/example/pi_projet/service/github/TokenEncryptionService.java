package com.example.pi_projet.service.github;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES/GCM symmetric encryption for GitHub Personal Access Tokens at rest.
 * The master key comes from `app.github.encryption-key` (env: GITHUB_ENC_KEY).
 *
 * Encrypted payload layout (Base64-URL encoded):
 *   [12-byte IV][ciphertext + 16-byte GCM tag]
 */
@Slf4j
@Service
public class TokenEncryptionService {

    private static final String ALGO = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;          // 96-bit nonce (recommended for GCM)
    private static final int TAG_BITS = 128;
    private static final SecureRandom RNG = new SecureRandom();

    @Value("${app.github.encryption-key:CHANGE_ME_IN_PROPERTIES_pi_projet_default_dev_key}")
    private String rawKey;

    private SecretKey key;

    @PostConstruct
    void init() throws Exception {
        // Derive a deterministic 256-bit key from the configured passphrase.
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(rawKey.getBytes(StandardCharsets.UTF_8));
        this.key = new SecretKeySpec(digest, ALGO);
        if (rawKey.startsWith("CHANGE_ME")) {
            log.warn("[GitHub] Using DEFAULT encryption key. Set `app.github.encryption-key` in production.");
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            RNG.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(cipherText, 0, out, iv.length, cipherText.length);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt token", e);
        }
    }

    public String decrypt(String payload) {
        try {
            byte[] all = Base64.getUrlDecoder().decode(payload);
            byte[] iv = new byte[IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            byte[] cipherText = new byte[all.length - IV_LEN];
            System.arraycopy(all, IV_LEN, cipherText, 0, cipherText.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt token", e);
        }
    }

    /** Last 4 chars of the raw token for non-sensitive UI display. */
    public String hint(String rawToken) {
        if (rawToken == null || rawToken.length() < 4) return "****";
        return "…" + rawToken.substring(rawToken.length() - 4);
    }
}
