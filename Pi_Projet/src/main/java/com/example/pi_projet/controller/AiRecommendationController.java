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
}
