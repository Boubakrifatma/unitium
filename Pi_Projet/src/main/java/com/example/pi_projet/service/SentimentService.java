package com.example.pi_projet.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
public class SentimentService {

    @Value("${sentiment.service.url:http://localhost:8600}")
    private String sentimentServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public record SentimentResult(String label, Double score) {}

    /**
     * Calls the Python sentiment microservice and returns the result.
     * Falls back to NEUTRAL on any error so the app stays functional
     * even when the Python service is down.
     */
    public SentimentResult analyze(String text) {
        if (text == null || text.isBlank()) {
            return new SentimentResult("NEUTRAL", 1.0);
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of("text", text);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    sentimentServiceUrl + "/sentiment/analyze", entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<?, ?> resp = response.getBody();
                String label = (String) resp.get("label");
                Double score = ((Number) resp.get("score")).doubleValue();
                return new SentimentResult(label, score);
            }
        } catch (Exception e) {
            log.warn("Sentiment service unavailable, defaulting to NEUTRAL: {}", e.getMessage());
        }
        return new SentimentResult("NEUTRAL", 1.0);
    }
}
