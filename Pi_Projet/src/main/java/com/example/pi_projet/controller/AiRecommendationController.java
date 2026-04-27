package com.example.pi_projet.controller;

import com.example.pi_projet.dto.AiRecommendationRequest;
import com.example.pi_projet.service.AiRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class AiRecommendationController {

    private final AiRecommendationService aiService;

    /**
     * POST /api/ai/review-recommendations
     * Body: { deliverableTitle, taskTitle, description, score }
     * Returns: { recommendations: "1. ...\n2. ..." }
     */
    @PostMapping("/review-recommendations")
    public ResponseEntity<Map<String, String>> getRecommendations(
            @RequestBody AiRecommendationRequest request) {
        String recommendations = aiService.generateRecommendations(request);
        return ResponseEntity.ok(Map.of("recommendations", recommendations));
    }

    /**
     * POST /api/ai/milestone-description-suggestion
     * Body: { title: "..." }
     * Returns: { suggestion: "..." }
     */
    @PostMapping("/milestone-description-suggestion")
    public ResponseEntity<Map<String, String>> suggestMilestoneDescription(
            @RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "");
        String suggestion = aiService.suggestMilestoneDescription(title);
        return ResponseEntity.ok(Map.of("suggestion", suggestion));
    }

    /**
     * POST /api/ai/task-description-suggestion
     * Body: { title: "..." }
     * Returns: { suggestion: "..." }
     */
    @PostMapping("/task-description-suggestion")
    public ResponseEntity<Map<String, String>> suggestTaskDescription(
            @RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "");
        String suggestion = aiService.suggestTaskDescription(title);
        return ResponseEntity.ok(Map.of("suggestion", suggestion));
    }

    /**
     * POST /api/ai/milestone-task-suggestions
     * Body: { title: "..." }
     * Returns: { suggestions: [{ title, description }, ...] }
     */
    @PostMapping("/milestone-task-suggestions")
    public ResponseEntity<Map<String, Object>> suggestMilestoneTasks(
            @RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "");
        var suggestions = aiService.suggestMilestoneTasks(title);
        return ResponseEntity.ok(Map.of("suggestions", suggestions));
    }
}
