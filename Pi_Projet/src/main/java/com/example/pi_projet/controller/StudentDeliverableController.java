package com.example.pi_projet.controller;

import com.example.pi_projet.dto.student.StudentDeliverableCreateDto;
import com.example.pi_projet.dto.student.StudentDeliverableResponseDto;
import com.example.pi_projet.service.StudentDeliverableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/student-deliverables")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class StudentDeliverableController {

    private final StudentDeliverableService service;

    // POST /api/student-deliverables
    @PostMapping
    public ResponseEntity<StudentDeliverableResponseDto> submit(
            @RequestBody StudentDeliverableCreateDto dto) {
        return ResponseEntity.ok(service.submit(dto));
    }

    // GET /api/student-deliverables/{id}
    @GetMapping("/{id}")
    public ResponseEntity<StudentDeliverableResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // GET /api/student-deliverables/student/{studentId}
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<StudentDeliverableResponseDto>> getByStudent(
            @PathVariable Long studentId) {
        return ResponseEntity.ok(service.getByStudent(studentId));
    }

    // GET /api/student-deliverables/tutor/{tutorId}
    @GetMapping("/tutor/{tutorId}")
    public ResponseEntity<List<StudentDeliverableResponseDto>> getByTutor(
            @PathVariable Long tutorId) {
        return ResponseEntity.ok(service.getByTutor(tutorId));
    }

    // GET /api/student-deliverables/tutor/{tutorId}/pending
    @GetMapping("/tutor/{tutorId}/pending")
    public ResponseEntity<List<StudentDeliverableResponseDto>> getPending(
            @PathVariable Long tutorId) {
        return ResponseEntity.ok(service.getPendingForTutor(tutorId));
    }

    // PATCH /api/student-deliverables/{id}/under-review
    @PatchMapping("/{id}/under-review")
    public ResponseEntity<StudentDeliverableResponseDto> markUnderReview(@PathVariable Long id) {
        return ResponseEntity.ok(service.markUnderReview(id));
    }

    // GET /api/student-deliverables/project/{projectId}/tutors
    @GetMapping("/project/{projectId}/tutors")
    public ResponseEntity<List<Map<String, Object>>> getTutorsByProject(
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(service.getTutorsByProject(projectId));
    }

    // POST /api/student-deliverables/{id}/versions
    @PostMapping("/{id}/versions")
    public ResponseEntity<StudentDeliverableResponseDto> addVersion(
            @PathVariable Long id,
            @RequestBody StudentDeliverableCreateDto dto) {
        return ResponseEntity.ok(service.addVersion(id, dto));
    }

    // GET /api/student-deliverables/{id}/versions
    @GetMapping("/{id}/versions")
    public ResponseEntity<List<StudentDeliverableResponseDto>> getVersions(@PathVariable Long id) {
        return ResponseEntity.ok(service.getVersions(id));
    }
}
