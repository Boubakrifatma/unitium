package com.example.pi_projet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Low-level HTTP client that talks to the Flask ML API (RiskPredv2).
 * All ML-API concerns are isolated here so the rest of the app
 * never imports RestTemplate directly for this feature.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RiskPredictionApiClient {

    private final RestTemplate restTemplate;

    /** Base URL of the Flask ML service, e.g. http://localhost:5000 */
    @Value("${ml.risk.api.url:http://localhost:5000}")
    private String mlApiUrl;

    /**
     * Calls POST /predict on the ML service.
     *
     * @param estimatedHours  estimated task duration (hours)
     * @param priority        "low" | "medium" | "high" | "critical"
     * @param dueInDays       days until the due date (0 = today, negative = overdue)
     * @param userWorkload    sum of active estimated_hours already assigned to the user
     * @param taskTitle       optional – enables LLM text analysis
     * @param taskDescription optional – enables LLM text analysis
     * @return raw response map from the ML API, or null on error
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> predict(float estimatedHours,
                                       String priority,
                                       long   dueInDays,
                                       float  userWorkload,
                                       String taskTitle,
                                       String taskDescription) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("estimated_hours", estimatedHours);
            body.put("priority",        priority);
            body.put("due_in_days",     dueInDays);
            body.put("user_workload",   userWorkload);

            // Optional fields — only sent when available so the LLM layer is activated
            if (taskTitle != null && !taskTitle.isBlank()) {
                body.put("task_title", taskTitle);
            }
            if (taskDescription != null && !taskDescription.isBlank()) {
                body.put("task_description", taskDescription);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    mlApiUrl + "/predict", request, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }

            log.warn("ML API returned non-2xx status: {}", response.getStatusCode());
            return null;

        } catch (Exception ex) {
            log.warn("ML API call failed (will use fallback): {}", ex.getMessage());
            return null;
        }
    }
}
