package com.example.pi_projet.controller;

import com.example.pi_projet.dto.CreateDeliverableVersionRequest;
import com.example.pi_projet.dto.DeliverableVersionDto;
import com.example.pi_projet.dto.DeliverableVersionHistoryDto;
import com.example.pi_projet.dto.DeliverableWithVersionsDto;
import com.example.pi_projet.service.DeliverableVersionService;
import com.example.pi_projet.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/deliverable-versions")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DeliverableVersionController {

    private final DeliverableVersionService versionService;
    private final FileStorageService fileStorageService;

    // ─── POST /api/deliverable-versions/{deliverableId} ────────────────────────
    // Create a new version for an existing deliverable (JSON body — fileUrl already uploaded)
    @PostMapping("/{deliverableId}")
    public ResponseEntity<DeliverableVersionDto> createVersion(
            @PathVariable Long deliverableId,
            @RequestParam Long submittedById,
            @RequestBody CreateDeliverableVersionRequest request) {
        return ResponseEntity.ok(versionService.createVersion(deliverableId, submittedById, request));
    }

    // ─── POST /api/deliverable-versions/{deliverableId}/upload ───────────────
    // Convenience: uploads the file and creates the new version in one request.
    // Sends multipart/form-data with:
    //   - file          (required)  the new version file
    //   - submittedById (required)
    //   - changeSummary (optional)  what changed in this version
    @PostMapping(value = "/{deliverableId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DeliverableVersionDto> uploadAndCreateVersion(
            @PathVariable Long deliverableId,
            @RequestParam Long submittedById,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "changeSummary", required = false) String changeSummary
    ) throws IOException {
        if (file.isEmpty()) return ResponseEntity.badRequest().build();

        String storedName = fileStorageService.store(file);
        String fileUrl = "/api/files/deliverables/" + storedName;

        CreateDeliverableVersionRequest request = CreateDeliverableVersionRequest.builder()
                .deliverableId(deliverableId)
                .fileUrl(fileUrl)
                .fileSizeKb(Math.max(1L, file.getSize() / 1024))
                .changeSummary(changeSummary)
                .build();

        return ResponseEntity.ok(versionService.createVersion(deliverableId, submittedById, request));
    }

    // ─── GET /api/deliverable-versions/deliverable/{deliverableId} ───────────
    // Get deliverable with all its versions
    @GetMapping("/deliverable/{deliverableId}")
    public ResponseEntity<DeliverableWithVersionsDto> getDeliverableWithVersions(
            @PathVariable Long deliverableId) {
        return ResponseEntity.ok(versionService.getDeliverableWithVersions(deliverableId));
    }

    // ─── GET /api/deliverable-versions/{versionId} ────────────────────────────
    // Get specific version by ID
    @GetMapping("/{versionId}")
    public ResponseEntity<DeliverableVersionDto> getVersion(@PathVariable Long versionId) {
        return ResponseEntity.ok(versionService.getVersion(versionId));
    }

    // ─── GET /api/deliverable-versions/deliverable/{deliverableId}/latest ─────
    // Get latest version of a deliverable
    @GetMapping("/deliverable/{deliverableId}/latest")
    public ResponseEntity<DeliverableVersionDto> getLatestVersion(@PathVariable Long deliverableId) {
        return ResponseEntity.ok(versionService.getLatestVersion(deliverableId));
    }

    // ─── GET /api/deliverable-versions/deliverable/{deliverableId}/history ────
    // Get version history with reviews
    @GetMapping("/deliverable/{deliverableId}/history")
    public ResponseEntity<List<DeliverableVersionHistoryDto>> getVersionHistory(
            @PathVariable Long deliverableId) {
        return ResponseEntity.ok(versionService.getVersionHistory(deliverableId));
    }

    // ─── GET /api/deliverable-versions/pending-scan ──────────────────────────
    // Get all versions pending virus scan (admin use)
    @GetMapping("/pending-scan")
    public ResponseEntity<List<DeliverableVersionDto>> getPendingVirusScan() {
        return ResponseEntity.ok(versionService.getPendingVirusScan());
    }

    // ─── PUT /api/deliverable-versions/{versionId}/virus-scan ────────────────
    // Update virus scan status (called by virus scan service)
    @PutMapping("/{versionId}/virus-scan")
    public ResponseEntity<Void> updateVirusScanStatus(
            @PathVariable Long versionId,
            @RequestParam String status) {
        versionService.updateVirusScanStatus(versionId, status);
        return ResponseEntity.ok().build();
    }
}
