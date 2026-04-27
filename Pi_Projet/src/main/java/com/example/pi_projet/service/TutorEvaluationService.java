package com.example.pi_projet.service;

import com.example.pi_projet.dto.intelligence.DetailedComparisonResult;
import com.example.pi_projet.dto.intelligence.PaginatedDiffResult;
import com.example.pi_projet.dto.student.StudentDeliverableResponseDto;
import com.example.pi_projet.dto.student.TutorEvaluationRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.student.StudentDeliverable;
import com.example.pi_projet.entity.student.StudentDeliverable.StudentDeliverableStatus;
import com.example.pi_projet.entity.student.StudentDeliverable.TutorDecision;
import com.example.pi_projet.repository.StudentDeliverableRepository;
import com.example.pi_projet.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Handles all tutor-facing actions for the student–tutor workflow:
 *   - Comparing two student deliverables (with pagination)
 *   - Submitting an evaluation (score + decision)
 *   - Generating and downloading a PDF report
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TutorEvaluationService {

    private final StudentDeliverableRepository studentDeliverableRepository;
    private final UserRepository userRepository;
    private final EnhancedComparisonService comparisonService;
    private final StudentDeliverablePdfService pdfService;
    private final ObjectMapper objectMapper;

    // ══════════════════════════════════════════════════════════════════════════
    // 1. Comparison
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Compare two student deliverables. The result is also persisted on
     * the left deliverable so the PDF can be regenerated later without
     * re-running the diff.
     */
    @Transactional
    public DetailedComparisonResult compare(Long leftId, Long rightId) {
        DetailedComparisonResult result = comparisonService.compareStudentDeliverables(leftId, rightId);
        persistComparisonResult(leftId, result);
        return result;
    }

    /** Paginated view of a comparison — returns empty if no stored result exists yet. */
    @Transactional(readOnly = true)
    public java.util.Optional<PaginatedDiffResult> comparePagedFromStored(Long deliverableId, int page, int pageSize) {
        StudentDeliverable d = studentDeliverableRepository.findByIdWithDetails(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + deliverableId));

        if (d.getComparisonResult() == null) {
            return java.util.Optional.empty();
        }
        try {
            DetailedComparisonResult result = objectMapper.readValue(
                    d.getComparisonResult(), DetailedComparisonResult.class);
            return java.util.Optional.of(comparisonService.paginate(result, page, pageSize));
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize comparison result", e);
        }
    }

    /** Compare and immediately return a specific page. */
    @Transactional
    public PaginatedDiffResult comparePaged(Long leftId, Long rightId, int page, int pageSize) {
        DetailedComparisonResult result = compare(leftId, rightId);
        return comparisonService.paginate(result, page, pageSize);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. Evaluation (decision + score)
    // ══════════════════════════════════════════════════════════════════════════

    @Transactional
    public StudentDeliverableResponseDto evaluate(Long deliverableId, Long tutorId,
                                                  TutorEvaluationRequest request) {
        StudentDeliverable d = studentDeliverableRepository.findByIdWithDetails(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + deliverableId));
        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> new RuntimeException("Tutor not found: " + tutorId));

        TutorDecision decision = TutorDecision.valueOf(request.getDecision().toUpperCase());

        int finalScore = resolveScore(request, d);

        d.setTutorDecision(decision);
        d.setScore(finalScore);
        d.setTutorFeedback(request.getFeedback());
        d.setEvaluatedBy(tutor);
        d.setEvaluatedAt(LocalDateTime.now());
        d.setStatus(decision == TutorDecision.ACCEPTED
                ? StudentDeliverableStatus.ACCEPTED
                : StudentDeliverableStatus.REJECTED);

        return StudentDeliverableResponseDto.from(studentDeliverableRepository.save(d));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. PDF report
    // ══════════════════════════════════════════════════════════════════════════

    @Transactional
    public byte[] generateReport(Long deliverableId, String organizationName) {
        StudentDeliverable d = studentDeliverableRepository.findByIdWithDetails(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + deliverableId));

        DetailedComparisonResult compResult = null;
        if (d.getComparisonResult() != null) {
            try {
                compResult = objectMapper.readValue(d.getComparisonResult(), DetailedComparisonResult.class);
            } catch (Exception e) {
                log.warn("Could not parse stored comparison result for deliverable {}", deliverableId, e);
            }
        }

        return pdfService.generateReport(d, compResult, organizationName);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════════════

    private int resolveScore(TutorEvaluationRequest req, StudentDeliverable d) {
        if (req.getScore() != null) {
            return Math.max(0, Math.min(100, req.getScore()));
        }
        // Fall back to suggested score stored in comparison result
        if (d.getComparisonResult() != null) {
            try {
                DetailedComparisonResult r = objectMapper.readValue(
                        d.getComparisonResult(), DetailedComparisonResult.class);
                return r.getSuggestedScore();
            } catch (Exception ignored) {}
        }
        return 0;
    }

    private void persistComparisonResult(Long deliverableId, DetailedComparisonResult result) {
        studentDeliverableRepository.findByIdWithDetails(deliverableId).ifPresent(d -> {
            try {
                d.setComparisonResult(objectMapper.writeValueAsString(result));
                studentDeliverableRepository.save(d);
            } catch (Exception e) {
                log.warn("Could not persist comparison result for deliverable {}", deliverableId, e);
            }
        });
    }
}
