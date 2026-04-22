package com.example.pi_projet.controller;

import com.example.pi_projet.dto.DeliverableResponseDto;
import com.example.pi_projet.dto.DeliverableWithReviewDto;
import com.example.pi_projet.service.DeliverableReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews/po")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class PoReviewController {

    private final DeliverableReviewService reviewService;

    // ─── GET /api/reviews/po/project/{projectId}/pending ─────────────────────
    // Deliverables accepted by manager, waiting for PO decision
    @GetMapping("/project/{projectId}/pending")
    public ResponseEntity<List<DeliverableResponseDto>> getPendingForProject(
            @PathVariable String projectId) {
        return ResponseEntity.ok(reviewService.getDeliverablesPendingPOReview(projectId));
    }

    // ─── POST /api/reviews/po/{deliverableId}?poId={id} ──────────────────────
    // PO submits final decision: decision = ACCEPTED | REVISION_REQUIRED | REJECTED
    @PostMapping("/{deliverableId}")
    public ResponseEntity<DeliverableWithReviewDto> submitPOReview(
            @PathVariable Long deliverableId,
            @RequestParam Long poId,
            @RequestBody Map<String, String> body) {

        String decision = body.getOrDefault("decision", "ACCEPTED");
        String feedbackText = body.getOrDefault("feedbackText", "");

        return ResponseEntity.ok(
                reviewService.submitPOReview(deliverableId, poId, decision, feedbackText)
        );
    }
}
