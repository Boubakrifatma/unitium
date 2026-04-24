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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliverableVersionService {

    private final DeliverableVersionRepository versionRepository;
    private final DeliverableRepository deliverableRepository;
    private final DeliverableReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE NEW VERSION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Employee submits a new version (resubmission after revision required)
     */
    public DeliverableVersionDto createVersion(
            Long deliverableId,
            Long submittedById,
            CreateDeliverableVersionRequest request) {

        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        User submittedBy = userRepository.findById(submittedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get next version number
        Integer nextVersion = versionRepository.getNextVersionNumber(deliverableId);

        // Validate file URL
        if (request.getFileUrl() == null || request.getFileUrl().isEmpty()) {
            throw new IllegalArgumentException("File URL is required");
        }

        // Resolve scan status carried by the upload controller (clean / unverified / infected).
        // Falls back to "pending" for the legacy JSON-only path that never went through the guard.
        DeliverableVersion.VirusScanStatus scanStatus = DeliverableVersion.VirusScanStatus.pending;
        LocalDateTime scannedAt = null;
        if (request.getVirusScanStatus() != null && !request.getVirusScanStatus().isBlank()) {
            try {
                scanStatus = DeliverableVersion.VirusScanStatus.valueOf(
                        request.getVirusScanStatus().toLowerCase());
                scannedAt = LocalDateTime.now();
            } catch (IllegalArgumentException ignored) { /* keep pending */ }
        }

        // Create version record
        DeliverableVersion version = DeliverableVersion.builder()
                .deliverable(deliverable)
                .versionNumber(nextVersion)
                .fileUrl(request.getFileUrl())
                .fileSizeKb(request.getFileSizeKb())
                .changeSummary(request.getChangeSummary())
                .submittedBy(submittedBy)
                .submittedAt(LocalDateTime.now())
                .virusScanStatus(scanStatus)
                .scannedAt(scannedAt)
                .virusName(request.getVirusName())
                .build();

        DeliverableVersion saved = versionRepository.save(version);

        // ✅ Update deliverable: increment version, reset status to under_review
        deliverable.setCurrentVersion(nextVersion);
        deliverable.setStatus(Deliverable.DeliverableStatus.under_review);
        deliverableRepository.save(deliverable);

        // Notifier les managers qu'une nouvelle version a été soumise
        notificationService.notifyManagersOnSubmission(deliverable, submittedBy);

        return mapToDto(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET VERSIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all versions of a deliverable with their reviews
     */
    public DeliverableWithVersionsDto getDeliverableWithVersions(Long deliverableId) {
        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        List<DeliverableVersion> versions = versionRepository.findByDeliverableId(deliverableId);

        List<DeliverableVersionDto> versionDtos = versions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return DeliverableWithVersionsDto.builder()
                .deliverableId(deliverable.getId())
                .taskId(deliverable.getTask().getId())
                .projectId(String.valueOf(deliverable.getProject().getId()))
                .employeeId(deliverable.getSubmittedBy().getId())
                .employeeName(deliverable.getSubmittedBy().getFullName())
                .title(deliverable.getTitle())
                .description(deliverable.getDescription())
                .currentVersion(deliverable.getCurrentVersion())
                .overallStatus(deliverable.getStatus().name())
                .submittedAt(deliverable.getSubmittedAt())
                .versions(versionDtos)
                .build();
    }

    /**
     * Get specific version
     */
    public DeliverableVersionDto getVersion(Long versionId) {
        DeliverableVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        return mapToDto(version);
    }

    /**
     * Get latest version of a deliverable
     */
    public DeliverableVersionDto getLatestVersion(Long deliverableId) {
        DeliverableVersion version = versionRepository.findLatestByDeliverableId(deliverableId)
                .orElseThrow(() -> new RuntimeException("No versions found"));

        return mapToDto(version);
    }

    /**
     * Get version history with reviews
     */
    public List<DeliverableVersionHistoryDto> getVersionHistory(Long deliverableId) {
        List<DeliverableVersion> versions = versionRepository.findByDeliverableId(deliverableId);

        return versions.stream()
                .map(version -> {
                    // Get latest review for this version
                    DeliverableReview review = reviewRepository.findByVersionId(version.getId())
                            .stream()
                            .filter(r -> r.getReviewerRole() == DeliverableReview.ReviewerRole.MANAGER)
                            .findFirst()
                            .orElse(null);

                    return DeliverableVersionHistoryDto.builder()
                            .versionNumber(version.getVersionNumber())
                            .submittedAt(version.getSubmittedAt())
                            .changeSummary(version.getChangeSummary())
                            .virusScanStatus(version.getVirusScanStatus().name().toLowerCase())
                            .employeeName(version.getSubmittedBy().getFullName())
                            .managerFeedback(review != null ? review.getFeedbackText() : null)
                            .managerScore(review != null ? review.getScore() : null)
                            .managerDecision(review != null ? review.getDecision().name().toLowerCase() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIRUS SCAN
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Update virus scan status (called by virus scan service)
     */
    public void updateVirusScanStatus(Long versionId, String status) {
        DeliverableVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        DeliverableVersion.VirusScanStatus scanStatus =
                DeliverableVersion.VirusScanStatus.valueOf(status.toLowerCase());

        version.setVirusScanStatus(scanStatus);
        versionRepository.save(version);

        // If infected, mark deliverable as draft
        if (scanStatus == DeliverableVersion.VirusScanStatus.infected) {
            Deliverable deliverable = version.getDeliverable();
            deliverable.setStatus(Deliverable.DeliverableStatus.draft);
            deliverableRepository.save(deliverable);
        }
    }

    /**
     * Get all versions pending virus scan
     */
    public List<DeliverableVersionDto> getPendingVirusScan() {
        List<DeliverableVersion> versions = versionRepository.findPendingVirusScan();

        return versions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    private DeliverableVersionDto mapToDto(DeliverableVersion version) {
        return DeliverableVersionDto.builder()
                .id(version.getId())
                .deliverableId(version.getDeliverable().getId())
                .versionNumber(version.getVersionNumber())
                .fileUrl(version.getFileUrl())
                .fileSizeKb(version.getFileSizeKb())
                .changeSummary(version.getChangeSummary())
                .submittedById(version.getSubmittedBy().getId())
                .submittedByName(version.getSubmittedBy().getFullName())
                .submittedAt(version.getSubmittedAt())
                .virusScanStatus(version.getVirusScanStatus().name().toLowerCase())
                .build();
    }
}