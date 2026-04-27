package com.example.pi_projet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RiskPredictionApiClient {

    private final RestTemplate restTemplate;

    @Value("${ml.risk.api.url:http://localhost:5000}")
    private String mlApiUrl;

    /**
     * Appelle POST /predict sur le service Flask ML.
     * Tous les paramètres après userCompletionRate sont optionnels (null = défaut Python).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> predict(float  estimatedHours,
                                       String priority,
                                       long   dueInDays,
                                       float  userWorkload,
                                       Float  userCompletionRate,
                                       Float  userExperienceMonths,
                                       Float  storyPoints,
                                       Float  numComments,
                                       Float  daysTotal,
                                       String taskTitle,
                                       String taskDescription) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("estimated_hours", estimatedHours);
            body.put("priority",        priority);
            body.put("due_in_days",     dueInDays);
            body.put("user_workload",   userWorkload);

            if (userCompletionRate != null)   body.put("user_completion_rate",    userCompletionRate);
            if (userExperienceMonths != null) body.put("user_experience_months",  userExperienceMonths);
            if (storyPoints != null)          body.put("story_points",            storyPoints);
            if (numComments != null)          body.put("num_comments",            numComments);
            if (daysTotal != null)            body.put("days_total",              daysTotal);

            if (taskTitle != null && !taskTitle.isBlank())
                body.put("task_title", taskTitle);
            if (taskDescription != null && !taskDescription.isBlank())
                body.put("task_description", taskDescription);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    mlApiUrl + "/predict", request, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }

            log.warn("ML API a retourné un statut non-2xx : {}", response.getStatusCode());
            return null;

        } catch (Exception ex) {
            log.warn("Appel ML API échoué (fallback) : {}", ex.getMessage());
            return null;
        }
    }
}
