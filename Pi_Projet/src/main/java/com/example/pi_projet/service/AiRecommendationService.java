package com.example.pi_projet.service;

import com.example.pi_projet.dto.AiRecommendationRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiRecommendationService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.api.model}")
    private String model;

    private final RestTemplate restTemplate;

    public AiRecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Calls Groq API and returns AI-generated review recommendations in French.
     */
    @SuppressWarnings("unchecked")
    public String generateRecommendations(AiRecommendationRequest req) {
        String prompt = buildPrompt(req);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un chef de projet expert en évaluation de livrables logiciels. "
                                + "Tu fournis des recommandations de review claires, constructives et professionnelles en français."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.7,
                "max_tokens", 700
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(apiUrl, entity, (Class<Map<String, Object>>) (Class<?>) Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            log.error("Erreur appel Groq API: {}", e.getMessage());
            throw new RuntimeException("Impossible de générer les recommandations IA. Vérifiez la clé API Groq.");
        }
    }

    private String buildPrompt(AiRecommendationRequest req) {
        return String.format("""
                Évalue ce livrable et génère exactement 4 recommandations personnalisées pour le manager.

                📋 Titre du livrable : %s
                🎯 Tâche associée : %s
                📝 Description soumise : %s
                ⭐ Score attribué : %.1f/10

                Génère 4 recommandations numérotées (1. 2. 3. 4.) en français.
                Chaque recommandation doit :
                - Être spécifique au contenu décrit ci-dessus
                - Être constructive et actionnables
                - Commencer par un verbe d'action
                - Faire 1-2 phrases maximum

                Si le score est < 7, les recommandations doivent guider l'employé vers une révision.
                Si le score est ≥ 7, les recommandations doivent valoriser et suggérer des améliorations mineures.
                """,
                req.deliverableTitle(),
                req.taskTitle() != null ? req.taskTitle() : "Non spécifiée",
                req.description(),
                req.score()
        );
    }
}
