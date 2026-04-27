package com.example.pi_projet.controller;

import com.example.pi_projet.dto.intelligence.*;
import com.example.pi_projet.service.DeliverableIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST endpoints exposed by the Deliverable Intelligence Module.
 *
 * Base path: /api/deliverable-intelligence
 *
 *   GET  /compare/versions?oldVersionId=&newVersionId=   -> VersionDiffDto
 *   POST /compare/text  (body: CompareTextRequest)        -> VersionDiffDto
 *   GET  /summary?oldVersionId=&newVersionId=             -> AutoSummaryDto
 *   GET  /feedback/{deliverableId}                        -> AutoFeedbackDto
 *   GET  /duplicates/{deliverableId}                      -> DuplicateReportDto
 *   GET  /analytics?projectId=                            -> PoDecisionAnalyticsDto
 */
@RestController
@RequestMapping("/api/deliverable-intelligence")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DeliverableIntelligenceController {

    private final DeliverableIntelligenceService service;

    @GetMapping("/compare/versions")
    public ResponseEntity<VersionDiffDto> compareVersions(
            @RequestParam Long oldVersionId,
            @RequestParam Long newVersionId) {
        return ResponseEntity.ok(service.compareVersions(oldVersionId, newVersionId));
    }

    @PostMapping("/compare/text")
    public ResponseEntity<VersionDiffDto> compareText(@RequestBody CompareTextRequest body) {
        return ResponseEntity.ok(service.compareText(body.getOldText(), body.getNewText()));
    }

    @GetMapping("/summary")
    public ResponseEntity<AutoSummaryDto> summary(
            @RequestParam Long oldVersionId,
            @RequestParam Long newVersionId) {
        return ResponseEntity.ok(service.autoSummary(oldVersionId, newVersionId));
    }

    @GetMapping("/feedback/{deliverableId}")
    public ResponseEntity<AutoFeedbackDto> feedback(@PathVariable Long deliverableId) {
        return ResponseEntity.ok(service.autoFeedback(deliverableId));
    }

    @GetMapping("/duplicates/{deliverableId}")
    public ResponseEntity<DuplicateReportDto> duplicates(@PathVariable Long deliverableId) {
        return ResponseEntity.ok(service.findDuplicates(deliverableId));
    }

    @GetMapping("/analytics")
    public ResponseEntity<PoDecisionAnalyticsDto> analytics(
            @RequestParam(required = false) UUID projectId) {
        return ResponseEntity.ok(service.analyticsForProject(projectId));
    }

    /** Tutor feature: compare the actual file content of two deliverables. */
    @GetMapping("/compare/deliverables")
    public ResponseEntity<DeliverableComparisonDto> compareDeliverables(
            @RequestParam Long leftId,
            @RequestParam Long rightId) {
        return ResponseEntity.ok(service.compareDeliverables(leftId, rightId));
    }
}
