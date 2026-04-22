package com.example.pi_projet.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

/**
 * Thin client for the optional Python FastAPI NLP sidecar.
 *
 * Endpoints expected on the Python side:
 *   POST /nlp/similarity  { "a": "...", "b": "..." }  -> { "similarity": 0.78 }
 *   POST /nlp/summarize   { "text": "..." }           -> { "summary": "..." }
 *
 * If the sidecar is unreachable, methods return Optional.empty() and the
 * caller should fall back to the pure-Java implementation. This keeps the
 * module fully functional without Python.
 */
@Slf4j
@Component
public class NlpClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final boolean enabled;

    public NlpClient(
            @Value("${nlp.service.url:http://localhost:8500}") String baseUrl,
            @Value("${nlp.service.enabled:false}") boolean enabled) {
        this.restTemplate = new RestTemplate();
        this.baseUrl = baseUrl;
        this.enabled = enabled;
    }

    public Optional<Double> similarity(String a, String b) {
        if (!enabled) return Optional.empty();
        try {
            Map<String, String> body = Map.of("a", safe(a), "b", safe(b));
            Map<?, ?> resp = post("/nlp/similarity", body);
            Object val = resp == null ? null : resp.get("similarity");
            if (val instanceof Number n) return Optional.of(n.doubleValue());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("NLP similarity unavailable: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> summarize(String text) {
        if (!enabled) return Optional.empty();
        try {
            Map<?, ?> resp = post("/nlp/summarize", Map.of("text", safe(text)));
            Object val = resp == null ? null : resp.get("summary");
            return val == null ? Optional.empty() : Optional.of(val.toString());
        } catch (Exception e) {
            log.debug("NLP summarize unavailable: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // ─── internals ───────────────────────────────────────────────────────────
    private Map<?, ?> post(String path, Map<String, ?> body) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, ?>> req = new HttpEntity<>(body, h);
        return restTemplate.postForObject(baseUrl + path, req, Map.class);
    }

    private String safe(String s) { return s == null ? "" : s; }
}
