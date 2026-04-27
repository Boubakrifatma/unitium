package com.example.pi_projet.controller;

import com.example.pi_projet.dto.intelligence.DetailedComparisonResult;
import com.example.pi_projet.dto.intelligence.PaginatedDiffResult;
import com.example.pi_projet.dto.student.StudentDeliverableResponseDto;
import com.example.pi_projet.dto.student.TutorEvaluationRequest;
import com.example.pi_projet.service.TutorEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tutor")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class TutorEvaluationController {

    private final TutorEvaluationService service;

    /**
     * POST /api/tutor/compare?leftId=&rightId=
     * Compare two student deliverables and persist the result.
     */
    @PostMapping("/compare")
    public ResponseEntity<DetailedComparisonResult> compare(
            @RequestParam Long leftId,
            @RequestParam Long rightId) {
        return ResponseEntity.ok(service.compare(leftId, rightId));
    }

    /**
     * GET /api/tutor/compare/paged?leftId=&rightId=&page=0&pageSize=5
     * Compare and return a specific page of diff sections.
     */
    @GetMapping("/compare/paged")
    public ResponseEntity<PaginatedDiffResult> comparePaged(
            @RequestParam Long leftId,
            @RequestParam Long rightId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int pageSize) {
        return ResponseEntity.ok(service.comparePaged(leftId, rightId, page, pageSize));
    }

    /**
     * GET /api/tutor/compare/stored/{deliverableId}?page=0&pageSize=5
     * Paginate over the comparison result stored on a deliverable (no re-diff).
     * Returns 404 if no comparison has been run yet.
     */
    @GetMapping("/compare/stored/{deliverableId}")
    public ResponseEntity<PaginatedDiffResult> compareFromStored(
            @PathVariable Long deliverableId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int pageSize) {
        return service.comparePagedFromStored(deliverableId, page, pageSize)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/tutor/evaluate/{deliverableId}?tutorId=
     * Submit the tutor's final evaluation (score + decision).
     */
    @PostMapping("/evaluate/{deliverableId}")
    public ResponseEntity<StudentDeliverableResponseDto> evaluate(
            @PathVariable Long deliverableId,
            @RequestParam Long tutorId,
            @RequestBody TutorEvaluationRequest request) {
        return ResponseEntity.ok(service.evaluate(deliverableId, tutorId, request));
    }

    /**
     * GET /api/tutor/report/{deliverableId}?organization=
     * Generate and download a PDF evaluation report.
     */
    @GetMapping("/report/{deliverableId}")
    public ResponseEntity<byte[]> downloadReport(
            @PathVariable Long deliverableId,
            @RequestParam(defaultValue = "Institution") String organization) {
        byte[] pdf = service.generateReport(deliverableId, organization);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"evaluation-" + deliverableId + ".pdf\"")
                .body(pdf);
    }
}
