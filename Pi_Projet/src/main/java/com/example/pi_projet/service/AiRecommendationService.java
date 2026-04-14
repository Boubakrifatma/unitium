package com.example.pi_projet.service;

import com.example.pi_projet.dto.AiRecommendationRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /**
     * Generates a concise milestone description suggestion from the milestone title.
     * Returns a single paragraph (2-3 sentences) in French.
     */
    @SuppressWarnings("unchecked")
    public String suggestMilestoneDescription(String milestoneTitle) {
        String prompt = String.format("""
                Génère une description concise (2 à 3 phrases, 250 caractères max) pour ce jalon de projet.

                Titre du jalon : %s

                La description doit :
                - Être en français
                - Expliquer l'objectif principal du jalon
                - Mentionner 1 ou 2 livrables/résultats attendus
                - Rester professionnelle et sans formatage (pas de listes, pas de markdown)
                - Commencer directement par la description (sans préfixe du type "Description :")
                """, milestoneTitle == null ? "" : milestoneTitle);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un chef de projet expert. Tu rédiges des descriptions de jalons claires, "
                                + "concises et professionnelles en français."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.6,
                "max_tokens", 200
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(apiUrl, entity, (Class<Map<String, Object>>) (Class<?>) Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) message.get("content");
            return content == null ? "" : content.trim();
        } catch (Exception e) {
            log.error("Erreur appel Groq API (milestone description): {}", e.getMessage());
            throw new RuntimeException("Impossible de générer la suggestion IA. Vérifiez la clé API Groq.");
        }
    }

    /**
     * Generates a list of suggested tasks based on a milestone title.
     * Returns a list of maps containing "title" and "description" keys.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, String>> suggestMilestoneTasks(String milestoneTitle) {
        String safeTitle = milestoneTitle == null ? "" : milestoneTitle;
        String prompt = String.format("""
                Génère exactement 5 tâches concrètes pour ce jalon de projet logiciel.

                Titre du jalon : %s

                Réponds UNIQUEMENT avec un tableau JSON valide au format suivant, sans texte avant ou après :
                [
                  {"title": "Titre de tâche (3-6 mots)", "description": "Description claire (10-160 caractères)"},
                  ...
                ]

                Contraintes :
                - Le titre de chaque tâche doit contenir au moins 3 mots
                - La description doit être en relation directe avec le titre de la tâche
                - Tout en français, professionnel, actionnable
                - Pas de markdown, pas de numérotation, uniquement le JSON
                """, safeTitle);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "Tu es un chef de projet expert. Tu génères des listes de tâches claires, "
                                + "professionnelles et actionnables en français, strictement au format JSON demandé."),
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
            String content = (String) message.get("content");
            return parseTaskSuggestions(content);
        } catch (Exception e) {
            log.error("Erreur appel Groq API (milestone tasks): {}", e.getMessage());
            throw new RuntimeException("Impossible de générer les suggestions de tâches. Vérifiez la clé API Groq.");
        }
    }

    private List<Map<String, String>> parseTaskSuggestions(String content) {
        List<Map<String, String>> result = new ArrayList<>();
        if (content == null) return result;

        String text = content.trim();
        // Strip markdown code fences if present
        text = text.replaceAll("(?s)```(?:json)?", "").trim();

        // Extract JSON array if wrapped in prose
        Matcher m = Pattern.compile("\\[[\\s\\S]*\\]").matcher(text);
        String jsonPart = m.find() ? m.group() : text;

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode arr = mapper.readTree(jsonPart);
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    String title = node.path("title").asText("").trim();
                    String description = node.path("description").asText("").trim();
                    if (!title.isEmpty()) {
                        Map<String, String> item = new LinkedHashMap<>();
                        item.put("title", title);
                        item.put("description", description);
                        result.add(item);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("JSON parse failed, trying fallback. Raw: {}", content);
        }

        if (!result.isEmpty()) return result;

        // Fallback: parse numbered/bulleted lines like "1. Title - description"
        for (String rawLine : text.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            line = line.replaceFirst("^(?:\\d+[.)]|[-*•])\\s*", "").trim();
            if (line.isEmpty()) continue;

            String title;
            String description = "";
            int sep = indexOfSeparator(line);
            if (sep > 0) {
                title = line.substring(0, sep).trim();
                description = line.substring(sep + 1).trim();
            } else {
                title = line;
            }
            // Strip surrounding quotes or markdown bold
            title = title.replaceAll("^[\"'*]+|[\"'*]+$", "").trim();
            description = description.replaceAll("^[\"'*]+|[\"'*]+$", "").trim();

            if (!title.isEmpty()) {
                Map<String, String> item = new LinkedHashMap<>();
                item.put("title", title);
                item.put("description", description);
                result.add(item);
            }
            if (result.size() >= 10) break;
        }

        if (result.isEmpty()) {
            log.warn("No suggestions parsed from AI response. Raw content: {}", content);
        }
        return result;
    }

    private int indexOfSeparator(String line) {
        int[] candidates = new int[] {
                line.indexOf(" — "),
                line.indexOf(" – "),
                line.indexOf(" - "),
                line.indexOf(": "),
                line.indexOf(" : ")
        };
        int best = -1;
        for (int idx : candidates) {
            if (idx > 0 && (best == -1 || idx < best)) best = idx;
        }
        return best;
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
