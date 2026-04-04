package com.example.pi_projet.controller;

import com.example.pi_projet.dto.DeliverableCreateDto;
import com.example.pi_projet.dto.DeliverableResponseDto;
import com.example.pi_projet.service.DeliverableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliverables")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DeliverableController {

    private final DeliverableService deliverableService;

    // ─── POST /api/deliverables ───────────────────────────────────────────────
    // Business rule enforced in service: task.status must be 'done'
    @PostMapping
    public ResponseEntity<DeliverableResponseDto> create(@RequestBody DeliverableCreateDto dto) {
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

    // ─── GET /api/deliverables/user/{userId} ──────────────────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DeliverableResponseDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(deliverableService.getBySubmittedBy(userId));
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