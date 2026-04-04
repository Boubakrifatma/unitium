package com.example.pi_projet.service;

import com.example.pi_projet.dto.*;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableReview;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliverableReviewService {

    private final DeliverableReviewRepository reviewRepository;
    private final DeliverableRepository deliverableRepository;
    private final DeliverableVersionRepository versionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Manager submits review with score and feedback
     *
     * ✅ WORKFLOW:
     * Score >= 7 → ACCEPTED → Deliverable to PO dashboard
     * Score < 7  → REVISION_REQUIRED → Back to Employee Todo
     */
    public DeliverableWithReviewDto submitManagerReview(
            Long deliverableId,
            Long reviewerId,
            SubmitReviewRequest request) {

        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        DeliverableVersion version = versionRepository.findById(request.getVersionId())
                .orElseThrow(() -> new RuntimeException("Version not found"));

        User manager = userRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        // Validate score
        if (request.getScore() < 0 || request.getScore() > 10) {
            throw new IllegalArgumentException("Score must be between 0 and 10");
        }

        if (request.getFeedbackText() == null || request.getFeedbackText().length() < 10) {
            throw new IllegalArgumentException("Feedback required (minimum 10 characters)");
        }

        // ✅ Business Logic: Auto-decide based on score
        DeliverableReview.ReviewDecision decision;
        if (request.getScore() >= 7.0f) {
            decision = DeliverableReview.ReviewDecision.ACCEPTED;
        } else {
            decision = DeliverableReview.ReviewDecision.REVISION_REQUIRED;
        }

        // Create review record
        DeliverableReview review = DeliverableReview.builder()
                .deliverable(deliverable)
                .version(version)
                .reviewer(manager)
                .reviewerRole(DeliverableReview.ReviewerRole.MANAGER)
                .score(request.getScore())
                .rubricScores(request.getRubricScores())
                .feedbackText(request.getFeedbackText())
                .annotations(request.getAnnotations())
                .decision(decision)
                .reviewedAt(LocalDateTime.now())
                .build();

        reviewRepository.save(review);

        // ✅ Update deliverable status & notify
        if (decision == DeliverableReview.ReviewDecision.ACCEPTED) {
            deliverable.setStatus(Deliverable.DeliverableStatus.accepted_by_manager);
            notifyPODeliverableReady(deliverable, manager);
        } else {
            deliverable.setStatus(Deliverable.DeliverableStatus.revision_required);
            notifyEmployeeToRevise(deliverable, manager, request.getFeedbackText());
        }

        deliverableRepository.save(deliverable);

        return mapToDeliverableWithReview(deliverable);
    }

    /**
     * Get all pending manager reviews
     */
    public List<PendingManagerReviewDto> getPendingManagerReviews(Long managerId) {
        List<DeliverableReview> reviews = reviewRepository.findPendingManagerReviews(managerId);

        return reviews.stream()
                .map(review -> PendingManagerReviewDto.builder()
                        .reviewId(review.getId())
                        .deliverableId(review.getDeliverable().getId())
                        .taskId(review.getDeliverable().getTask().getId())
                        .versionId(review.getVersion().getId())
                        .versionNumber(review.getVersion().getVersionNumber())
                        .employeeId(review.getDeliverable().getSubmittedBy().getId())
                        .employeeName(review.getDeliverable().getSubmittedBy().getFullName())
                        .deliverableTitle(review.getDeliverable().getTitle())
                        .description(review.getDeliverable().getDescription())
                        .fileUrl(review.getVersion().getFileUrl())
                        .fileType(review.getVersion().getFileUrl())
                        .fileSizeKb(review.getVersion().getFileSizeKb())
                        .submittedAt(review.getVersion().getSubmittedAt())
                        .changeSummary(review.getVersion().getChangeSummary())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get all reviews for a deliverable
     */
    public List<DeliverableReviewDto> getDeliverableReviews(Long deliverableId) {
        List<DeliverableReview> reviews = reviewRepository.findByDeliverableId(deliverableId);

        return reviews.stream()
                .map(this::mapReviewToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get manager dashboard metrics
     */
    public ManagerDashboardDto getManagerDashboard(Long managerId) {
        Long totalReviewed = reviewRepository.countReviewsByManager(managerId);
        Long acceptedCount = reviewRepository.countAcceptedReviewsByManager(managerId);
        Long rejectedCount = reviewRepository.countRejectedReviewsByManager(managerId);
        Double avgScore = reviewRepository.getAverageScoreByManager(managerId);

        float acceptanceRate = totalReviewed > 0 ? (acceptedCount * 100f) / totalReviewed : 0;
        float revisionRate = totalReviewed > 0 ? (rejectedCount * 100f) / totalReviewed : 0;

        List<EmployeeQualityMetricDto> employeeMetrics = List.of();

        return ManagerDashboardDto.builder()
                .averageScore(avgScore != null ? avgScore.floatValue() : 0f)
                .totalReviewed(totalReviewed)
                .acceptedCount(acceptedCount)
                .revisionRequiredCount(rejectedCount)
                .acceptanceRate(acceptanceRate)
                .revisionRate(revisionRate)
                .employeeMetrics(employeeMetrics)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private void notifyPODeliverableReady(Deliverable deliverable, User manager) {
        notificationService.sendNotification(
                null,
                "Deliverable Ready for Review",
                "Manager " + manager.getFullName() + " has accepted deliverable '" +
                        deliverable.getTitle() + "'. It's now ready for your review.",
                "deliverable_ready_po"
        );
    }

    private void notifyEmployeeToRevise(Deliverable deliverable, User manager, String feedback) {
        notificationService.sendNotification(
                deliverable.getSubmittedBy(),
                "Revision Required",
                "Your deliverable '" + deliverable.getTitle() + "' requires revision. " +
                        "Feedback: " + feedback,
                "deliverable_revision_required"
        );
    }

    private DeliverableReviewDto mapReviewToDto(DeliverableReview review) {
        return DeliverableReviewDto.builder()
                .id(review.getId())
                .deliverableId(review.getDeliverable().getId())
                .versionId(review.getVersion().getId())
                .reviewerId(review.getReviewer().getId())
                .reviewerName(review.getReviewer().getFullName())
                .reviewerRole(review.getReviewerRole().name().toLowerCase())
                .score(review.getScore())
                .rubricScores(review.getRubricScores())
                .feedbackText(review.getFeedbackText())
                .annotations(review.getAnnotations())
                .decision(review.getDecision().name().toLowerCase())
                .reviewedAt(review.getReviewedAt())
                .build();
    }

    private DeliverableWithReviewDto mapToDeliverableWithReview(Deliverable deliverable) {
        Optional<DeliverableReview> managerReview = reviewRepository
                .findLatestManagerReview(deliverable.getId());

        Optional<DeliverableReview> poReview = reviewRepository
                .findLatestReviewByRole(deliverable.getId(), DeliverableReview.ReviewerRole.PO);

        String overallStatus;
        if (poReview.isPresent()) {
            overallStatus = Deliverable.DeliverableStatus.validated.name();
        } else if (managerReview.isPresent() &&
                managerReview.get().getDecision() == DeliverableReview.ReviewDecision.ACCEPTED) {
            overallStatus = Deliverable.DeliverableStatus.po_review.name();
        } else if (managerReview.isPresent() &&
                managerReview.get().getDecision() == DeliverableReview.ReviewDecision.REVISION_REQUIRED) {
            overallStatus = Deliverable.DeliverableStatus.revision_required.name();
        } else {
            overallStatus = Deliverable.DeliverableStatus.under_review.name();
        }

        return DeliverableWithReviewDto.builder()
                .deliverableId(deliverable.getId())
                .taskId(deliverable.getTask().getId())
                .projectId(String.valueOf(deliverable.getProject().getId()))
                .employeeId(deliverable.getSubmittedBy().getId())
                .employeeName(deliverable.getSubmittedBy().getFullName())
                .title(deliverable.getTitle())
                .description(deliverable.getDescription())
                .fileUrl(deliverable.getFileUrl())
                .fileType(deliverable.getFileType())
                .fileSizeKb(deliverable.getFileSizeKb())
                .currentVersion(deliverable.getCurrentVersion())
                .overallStatus(overallStatus)
                .latestManagerReview(managerReview.map(this::mapReviewToDto).orElse(null))
                .latestPoReview(poReview.map(this::mapReviewToDto).orElse(null))
                .submittedAt(deliverable.getSubmittedAt())
                .lastReviewedAt(managerReview.map(DeliverableReview::getReviewedAt).orElse(null))
                .build();
    }
}