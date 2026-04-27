package com.example.pi_projet.controller;

import com.example.pi_projet.dto.DeliverableReviewDto;
import com.example.pi_projet.dto.DeliverableWithReviewDto;
import com.example.pi_projet.dto.PendingManagerReviewDto;
import com.example.pi_projet.dto.SubmitReviewRequest;
import com.example.pi_projet.service.DeliverableReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews/manager")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ManagerReviewController {

    private final DeliverableReviewService reviewService;

    // ─── POST /api/reviews/manager/{deliverableId}?reviewerId={id} ────────────
    // Manager submits a review for a deliverable
    @PostMapping("/{deliverableId}")
    public ResponseEntity<DeliverableWithReviewDto> submitReview(
            @PathVariable Long deliverableId,
            @RequestParam Long reviewerId,
            @RequestBody SubmitReviewRequest request) {
        return ResponseEntity.ok(reviewService.submitManagerReview(deliverableId, reviewerId, request));
    }

    // ─── GET /api/reviews/manager/{deliverableId} ─────────────────────────────
    // Get all reviews for a deliverable
    @GetMapping("/{deliverableId}")
    public ResponseEntity<List<DeliverableReviewDto>> getDeliverableReviews(
            @PathVariable Long deliverableId) {
        return ResponseEntity.ok(reviewService.getDeliverableReviews(deliverableId));
    }

    // ─── GET /api/reviews/manager/pending?managerId={id} ─────────────────────
    // Get deliverables pending manager review
    @GetMapping("/pending")
    public ResponseEntity<List<PendingManagerReviewDto>> getPendingReviews(
            @RequestParam Long managerId) {
        return ResponseEntity.ok(reviewService.getPendingManagerReviews(managerId));
    }
}
