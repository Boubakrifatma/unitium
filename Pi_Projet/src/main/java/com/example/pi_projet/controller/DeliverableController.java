package com.example.pi_projet.controller;

import com.example.pi_projet.dto.DeliverableCreateDto;
import com.example.pi_projet.dto.DeliverableResponseDto;
import com.example.pi_projet.dto.EmployeeStatsDto;
import com.example.pi_projet.dto.MilestoneDeliverableGroupDto;
import com.example.pi_projet.service.DeliverableService;
import com.example.pi_projet.service.DeliverableUploadGuard;
import com.example.pi_projet.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/deliverables")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DeliverableController {

    private final DeliverableService deliverableService;
    private final FileStorageService fileStorageService;
    private final DeliverableUploadGuard uploadGuard;

    // ─── POST /api/deliverables ───────────────────────────────────────────────
    // Business rule enforced in service: task.status must be 'done'
    @PostMapping
    public ResponseEntity<DeliverableResponseDto> create(@RequestBody DeliverableCreateDto dto) {
        return ResponseEntity.ok(deliverableService.create(dto));
    }

    // ─── POST /api/deliverables/upload ───────────────────────────────────────
    // Convenience: uploads the file and creates the deliverable in one request.
    // Sends multipart/form-data with:
    //   - file       (required)  the deliverable file
    //   - taskId     (required)
    //   - projectId  (required)
    //   - submittedById (required)
    //   - title      (required)
    //   - description (optional)
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DeliverableResponseDto> uploadAndCreate(
            @RequestParam("file") MultipartFile file,
            @RequestParam("taskId") Long taskId,
            @RequestParam("projectId") String projectId,
            @RequestParam("submittedById") Long submittedById,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description
    ) throws IOException {
        // Whitelist + size check + ClamAV scan. Throws 4xx if rejected → no file is stored.
        // No DeliverableVersion row exists at v1, so the result is not persisted here.
        uploadGuard.validateAndScan(file);

        String storedName = fileStorageService.store1(file);
        String fileUrl = "/api/files/deliverables/" + storedName;

        DeliverableCreateDto dto = new DeliverableCreateDto();
        dto.setTaskId(taskId);
        dto.setProjectId(projectId);
        dto.setSubmittedById(submittedById);
        dto.setTitle(title);
        dto.setDescription(description);
        dto.setFileUrl(fileUrl);
        dto.setFileType(file.getContentType());
        dto.setFileSizeKb(Math.max(1L, file.getSize() / 1024));

        return ResponseEntity.ok(deliverableService.create(dto));
    }

    // ─── GET /api/deliverables ────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<DeliverableResponseDto>> getAll() {
        return ResponseEntity.ok(deliverableService.getAll());
    }

    // ─── GET /api/deliverables/{id} ───────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<DeliverableResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(deliverableService.getById(id));
    }

    // ─── GET /api/deliverables/task/{taskId} ──────────────────────────────────
    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<DeliverableResponseDto>> getByTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(deliverableService.getByTaskId(taskId));
    }

    // ─── GET /api/deliverables/project/{projectId} ────────────────────────────
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<DeliverableResponseDto>> getByProject(@PathVariable String projectId) {
        return ResponseEntity.ok(deliverableService.getByProjectId(projectId));
    }

    // ─── GET /api/deliverables/project/{projectId}/manager-view ──────────────
    // Returns deliverables grouped by milestone > task, with all versions
    @GetMapping("/project/{projectId}/manager-view")
    public ResponseEntity<List<MilestoneDeliverableGroupDto>> getManagerView(@PathVariable String projectId) {
        return ResponseEntity.ok(deliverableService.getManagerView(projectId));
    }

    // ─── GET /api/deliverables/user/{userId} ──────────────────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DeliverableResponseDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(deliverableService.getBySubmittedBy(userId));
    }

    // ─── GET /api/deliverables/stats/me?userId={userId} ───────────────────────
    @GetMapping("/stats/me")
    public ResponseEntity<EmployeeStatsDto> getMyStats(@RequestParam Long userId) {
        return ResponseEntity.ok(deliverableService.getMyStats(userId));
    }

    // ─── PUT /api/deliverables/{id} ───────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<DeliverableResponseDto> update(
            @PathVariable Long id,
            @RequestBody DeliverableCreateDto dto) {
        return ResponseEntity.ok(deliverableService.update(id, dto));
    }

    // ─── DELETE /api/deliverables/{id} ────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deliverableService.delete(id);
        return ResponseEntity.noContent().build();
    }

}