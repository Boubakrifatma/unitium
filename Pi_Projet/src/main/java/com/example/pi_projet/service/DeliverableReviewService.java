package com.example.pi_projet.service;

import com.example.pi_projet.dto.*;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableReview;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
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
    private final TaskRepository taskRepository;
    private final DeliverableChatService deliverableChatService;

    /**
     * Manager submits review with score and feedback.
     *
     * ✅ WORKFLOW (mis à jour) :
     *   Score = 10  → ACCEPTED            → livrable transmis au PO
     *   Score 7..9  → REVISION_REQUIRED   → "encore une itération" — tâche retourne à TODO
     *   Score 1..6  → REVISION_REQUIRED   → révision majeure        — tâche retourne à TODO
     *
     * Dans les deux cas de révision, la tâche associée est remise à TODO
     * pour que l'employé la retrouve dans son Kanban / sa liste à faire.
     */
    public DeliverableWithReviewDto submitManagerReview(
            Long deliverableId,
            Long reviewerId,
            SubmitReviewRequest request) {

        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        // Resolve version: use provided versionId, or latest, or auto-create from deliverable data
        DeliverableVersion version;
        if (request.getVersionId() != null) {
            version = versionRepository.findById(request.getVersionId())
                    .orElseThrow(() -> new RuntimeException("Version not found"));
        } else {
            version = versionRepository.findLatestByDeliverableId(deliverableId)
                    .orElseGet(() -> {
                        // Auto-create a version record from the deliverable itself
                        User submitter = deliverable.getSubmittedBy();
                        DeliverableVersion auto = DeliverableVersion.builder()
                                .deliverable(deliverable)
                                .versionNumber(deliverable.getCurrentVersion() != null ? deliverable.getCurrentVersion() : 1)
                                .fileUrl(deliverable.getFileUrl() != null ? deliverable.getFileUrl() : "")
                                .fileSizeKb(deliverable.getFileSizeKb())
                                .changeSummary("Version initiale")
                                .submittedBy(submitter)
                                .submittedAt(deliverable.getSubmittedAt() != null ? deliverable.getSubmittedAt() : java.time.LocalDateTime.now())
                                .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
                                .build();
                        return versionRepository.save(auto);
                    });
        }

        User manager = userRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        // Validate score
        if (request.getScore() < 0 || request.getScore() > 10) {
            throw new IllegalArgumentException("Score must be between 0 and 10");
        }

        if (request.getFeedbackText() == null || request.getFeedbackText().length() < 10) {
            throw new IllegalArgumentException("Feedback required (minimum 10 characters)");
        }

        // ✅ Business Logic: only a perfect score (10) is auto-accepted.
        // 1-6  → révision majeure
        // 7-9  → "encore une itération" (révision mineure)
        // 10   → accepté
        DeliverableReview.ReviewDecision decision;
        boolean minorRevision = false;
        float score = request.getScore();
        if (score >= 10.0f) {
            decision = DeliverableReview.ReviewDecision.ACCEPTED;
        } else {
            decision = DeliverableReview.ReviewDecision.REVISION_REQUIRED;
            minorRevision = score >= 7.0f; // 7..9 = minor, 1..6 = major
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
            notificationService.notifyPOsOnManagerAccepted(deliverable, manager);
        } else {
            deliverable.setStatus(Deliverable.DeliverableStatus.revision_required);

            // 🔁 La tâche associée doit retourner à TODO afin que l'employé
            // la retrouve dans son Kanban et puisse soumettre une nouvelle version.
            Task task = deliverable.getTask();
            if (task != null) {
                task.setStatus(Task.TaskStatus.todo);
                task.setCompletedAt(null);
                taskRepository.save(task);
            }

            // Préfixe le feedback pour distinguer une révision mineure (7-9)
            // d'une révision majeure (1-6) — utile pour l'employé.
            String feedbackPrefix = minorRevision
                    ? "[Révision mineure — encore une itération] "
                    : "[Révision majeure] ";
            notificationService.notifyEmployeeOnRevisionRequired(
                    deliverable, manager, feedbackPrefix + request.getFeedbackText());
        }

        deliverableRepository.save(deliverable);

        return mapToDeliverableWithReview(deliverable);
    }

    /**
     * PO submits final decision on an accepted deliverable
     *
     * ✅ WORKFLOW:
     * decision = ACCEPTED   → Deliverable status = validated
     * decision = REJECTED   → Deliverable status = rejected_final
     * decision = REVISION   → Deliverable status = revision_required (back to employee)
     */
    public DeliverableWithReviewDto submitPOReview(
            Long deliverableId,
            Long poId,
            String decision,
            String feedbackText) {

        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        User po = userRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("PO not found"));

        if (feedbackText == null || feedbackText.trim().length() < 5) {
            throw new IllegalArgumentException("Feedback requis (minimum 5 caractères)");
        }

        DeliverableReview.ReviewDecision reviewDecision;
        Deliverable.DeliverableStatus newStatus;

        switch (decision.toUpperCase()) {
            case "ACCEPTED" -> {
                reviewDecision = DeliverableReview.ReviewDecision.ACCEPTED;
                newStatus = Deliverable.DeliverableStatus.validated;
            }
            case "REJECTED" -> {
                reviewDecision = DeliverableReview.ReviewDecision.REJECTED;
                newStatus = Deliverable.DeliverableStatus.rejected_final;
            }
            default -> {
                reviewDecision = DeliverableReview.ReviewDecision.REVISION_REQUIRED;
                newStatus = Deliverable.DeliverableStatus.revision_required;
            }
        }

        // Resolve version (latest or auto-create)
        DeliverableVersion version = versionRepository.findLatestByDeliverableId(deliverableId)
                .orElseGet(() -> {
                    DeliverableVersion auto = DeliverableVersion.builder()
                            .deliverable(deliverable)
                            .versionNumber(deliverable.getCurrentVersion() != null ? deliverable.getCurrentVersion() : 1)
                            .fileUrl(deliverable.getFileUrl() != null ? deliverable.getFileUrl() : "")
                            .fileSizeKb(deliverable.getFileSizeKb())
                            .changeSummary("Version initiale")
                            .submittedBy(deliverable.getSubmittedBy())
                            .submittedAt(deliverable.getSubmittedAt() != null ? deliverable.getSubmittedAt() : java.time.LocalDateTime.now())
                            .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
                            .build();
                    return versionRepository.save(auto);
                });

        DeliverableReview review = DeliverableReview.builder()
                .deliverable(deliverable)
                .version(version)
                .reviewer(po)
                .reviewerRole(DeliverableReview.ReviewerRole.PO)
                .feedbackText(feedbackText.trim())
                .decision(reviewDecision)
                .reviewedAt(java.time.LocalDateTime.now())
                .build();

        reviewRepository.save(review);

        // Update deliverable status and poDecisionField
        deliverable.setStatus(newStatus);
        if (reviewDecision == DeliverableReview.ReviewDecision.ACCEPTED) {
            deliverable.setPoDecisionField(Deliverable.PoDecisionField.validated);
        } else if (reviewDecision == DeliverableReview.ReviewDecision.REJECTED) {
            deliverable.setPoDecisionField(Deliverable.PoDecisionField.rejected);
        } else {
            deliverable.setPoDecisionField(Deliverable.PoDecisionField.major_rework);

            // 🔁 Idem côté PO : si révision demandée, la tâche retourne à TODO.
            Task task = deliverable.getTask();
            if (task != null) {
                task.setStatus(Task.TaskStatus.todo);
                task.setCompletedAt(null);
                taskRepository.save(task);
            }
        }
        deliverableRepository.save(deliverable);

        // Find the manager who previously reviewed this deliverable
        User managerWhoReviewed = reviewRepository.findLatestManagerReview(deliverableId)
                .map(DeliverableReview::getReviewer)
                .orElse(null);

        if (reviewDecision == DeliverableReview.ReviewDecision.ACCEPTED) {
            // Employé : son livrable est validé
            notificationService.notifyEmployeeOnPOValidated(deliverable, po);
            // Manager : le PO a validé, suggérer une réunion
            if (managerWhoReviewed != null) {
                notificationService.notifyManagerOnPOValidated(deliverable, po, managerWhoReviewed);
            }
            // ── Auto-create (or reuse) the PO-Manager shared chatroom ──────────
            ChatRoom poManagerRoom = deliverableChatService.ensurePoManagerRoom(deliverable, po);
            if (poManagerRoom != null && deliverable.getChatRoom() == null) {
                deliverable.setChatRoom(poManagerRoom);
                deliverableRepository.save(deliverable);
            }
        } else if (reviewDecision == DeliverableReview.ReviewDecision.REJECTED) {
            // Manager : le PO a rejeté
            if (managerWhoReviewed != null) {
                notificationService.notifyManagerOnPORejected(deliverable, po, managerWhoReviewed, feedbackText);
            }
        } else {
            // REVISION_REQUIRED : employé doit refaire le livrable
            notificationService.notifyEmployeeOnPORevision(deliverable, po, feedbackText);
        }

        return mapToDeliverableWithReview(deliverable);
    }

    /**
     * Get all deliverables pending PO review for a project
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.pi_projet.dto.DeliverableResponseDto> getDeliverablesPendingPOReview(String projectId) {
        return deliverableRepository
                .findByProjectId(java.util.UUID.fromString(projectId))
                .stream()
                .filter(d -> d.getStatus() == Deliverable.DeliverableStatus.accepted_by_manager)
                .map(this::mapDeliverableToResponseDto)
                .collect(java.util.stream.Collectors.toList());
    }

    private com.example.pi_projet.dto.DeliverableResponseDto mapDeliverableToResponseDto(Deliverable d) {
        return com.example.pi_projet.dto.DeliverableResponseDto.builder()
                .id(d.getId())
                .title(d.getTitle())
                .description(d.getDescription())
                .currentVersion(d.getCurrentVersion())
                .fileUrl(d.getFileUrl())
                .fileType(d.getFileType())
                .fileSizeKb(d.getFileSizeKb())
                .status(d.getStatus() != null ? d.getStatus().name().toLowerCase() : null)
                .poDecisionField(d.getPoDecisionField() != null ? d.getPoDecisionField().name().toLowerCase() : null)
                .submittedAt(d.getSubmittedAt())
                .updatedAt(d.getUpdatedAt())
                .taskId(d.getTask() != null ? d.getTask().getId() : null)
                .taskTitle(d.getTask() != null ? d.getTask().getTitle() : null)
                .taskStatus(d.getTask() != null ? d.getTask().getStatus().name() : null)
                .projectId(d.getProject() != null ? d.getProject().getId().toString() : null)
                .projectName(d.getProject() != null ? d.getProject().getName() : null)
                .submittedById(d.getSubmittedBy() != null ? d.getSubmittedBy().getId() : null)
                .submittedByName(d.getSubmittedBy() != null ? d.getSubmittedBy().getFullName() : null)
                .submittedByEmail(d.getSubmittedBy() != null ? d.getSubmittedBy().getEmail() : null)
                .build();
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