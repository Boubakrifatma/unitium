package com.example.pi_projet.service.readme;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class ReadmeAiEnhancerService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:}")
    private String apiUrl;

    @Value("${groq.api.model:}")
    private String model;

    @Value("${ml.service.connect-timeout-ms:1200}")
    private int connectTimeoutMs;

    @Value("${ml.service.read-timeout-ms:2200}")
    private int readTimeoutMs;

    private RestTemplate restTemplate;

    @PostConstruct
    public void init() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.max(100, connectTimeoutMs));
        factory.setReadTimeout(Math.max(500, readTimeoutMs));
        this.restTemplate = new RestTemplate(factory);
    }

    @SuppressWarnings("unchecked")
    public Optional<String> generateExecutiveSummary(String projectName,
                                                     String projectDescription,
                                                     String status,
                                                     int memberCount,
                                                     int totalTasks,
                                                     int doneTasks,
                                                     List<String> phases) {
        if (isBlank(apiKey) || isBlank(apiUrl) || isBlank(model)) {
            return Optional.empty();
        }

        String prompt = "Create a concise, professional executive summary for a software project README. "
            + "Keep it to 4 short bullet points in markdown.\n\n"
            + "Project name: " + safe(projectName) + "\n"
            + "Status: " + safe(status) + "\n"
            + "Description: " + safe(projectDescription) + "\n"
            + "Members: " + memberCount + "\n"
            + "Tasks: " + doneTasks + " done out of " + totalTasks + "\n"
            + "Phases: " + String.join(", ", phases) + "\n\n"
            + "Return markdown only, no intro text.";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
            Map.of("role", "system", "content", "You are a senior engineering manager writing polished README summaries."),
            Map.of("role", "user", "content", prompt)
        ));
        body.put("temperature", 0.4);
        body.put("max_tokens", 220);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, new HttpEntity<>(body, headers), Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Optional.empty();
            }
            Object rawChoices = response.getBody().get("choices");
            if (!(rawChoices instanceof List<?> choices) || choices.isEmpty()) {
                return Optional.empty();
            }
            Object firstChoice = choices.get(0);
            if (!(firstChoice instanceof Map<?, ?> choice)) {
                return Optional.empty();
            }
            Object rawMessage = choice.get("message");
            if (!(rawMessage instanceof Map<?, ?> message)) {
                return Optional.empty();
            }
            Object content = message.get("content");
            if (!(content instanceof String text) || text.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(text.trim());
        } catch (Exception ex) {
            log.warn("README AI enhancement skipped: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "n/a" : value.trim();
    }
}
