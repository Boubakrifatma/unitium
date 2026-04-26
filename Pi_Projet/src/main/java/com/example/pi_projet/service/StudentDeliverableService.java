package com.example.pi_projet.service;

import com.example.pi_projet.dto.student.StudentDeliverableCreateDto;
import com.example.pi_projet.dto.student.StudentDeliverableResponseDto;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.student.StudentDeliverable;
import com.example.pi_projet.entity.student.StudentDeliverable.StudentDeliverableStatus;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.StudentDeliverableRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentDeliverableService {

    private final StudentDeliverableRepository studentDeliverableRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;

    // ── Submit a new deliverable ──────────────────────────────────────────────

    @Transactional
    public StudentDeliverableResponseDto submit(StudentDeliverableCreateDto dto) {
        User student = userRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found: " + dto.getStudentId()));
        User tutor = userRepository.findById(dto.getTutorId())
                .orElseThrow(() -> new RuntimeException("Tutor not found: " + dto.getTutorId()));

        StudentDeliverable deliverable = StudentDeliverable.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .fileUrl(dto.getFileUrl())
                .fileType(dto.getFileType())
                .fileSizeKb(dto.getFileSizeKb())
                .virusScanStatus(dto.getVirusScanStatus() != null ? dto.getVirusScanStatus() : "pending")
                .virusName(dto.getVirusName())
                .projectId(dto.getProjectId())
                .projectName(dto.getProjectName())
                .submittedBy(student)
                .tutor(tutor)
                .status(StudentDeliverableStatus.SUBMITTED)
                .build();

        return StudentDeliverableResponseDto.from(studentDeliverableRepository.save(deliverable));
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StudentDeliverableResponseDto getById(Long id) {
        return StudentDeliverableResponseDto.from(
                studentDeliverableRepository.findByIdWithDetails(id)
                        .orElseThrow(() -> new RuntimeException("Deliverable not found: " + id)));
    }

    @Transactional(readOnly = true)
    public List<StudentDeliverableResponseDto> getByStudent(Long studentId) {
        return studentDeliverableRepository.findByStudentId(studentId)
                .stream().map(StudentDeliverableResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<StudentDeliverableResponseDto> getByTutor(Long tutorId) {
        return studentDeliverableRepository.findByTutorId(tutorId)
                .stream().map(StudentDeliverableResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<StudentDeliverableResponseDto> getPendingForTutor(Long tutorId) {
        return studentDeliverableRepository
                .findByTutorIdAndStatus(tutorId, StudentDeliverableStatus.SUBMITTED)
                .stream().map(StudentDeliverableResponseDto::from).toList();
    }

    // ── Versioning ────────────────────────────────────────────────────────────

    @Transactional
    public StudentDeliverableResponseDto addVersion(Long parentId, StudentDeliverableCreateDto dto) {
        StudentDeliverable parent = studentDeliverableRepository.findByIdWithDetails(parentId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + parentId));

        int nextVersion = studentDeliverableRepository.findMaxVersionNumber(parentId) + 1;

        StudentDeliverable version = StudentDeliverable.builder()
                .title(parent.getTitle())
                .description(dto.getDescription() != null ? dto.getDescription() : parent.getDescription())
                .fileUrl(dto.getFileUrl())
                .fileType(dto.getFileType())
                .fileSizeKb(dto.getFileSizeKb())
                .virusScanStatus(dto.getVirusScanStatus() != null ? dto.getVirusScanStatus() : "pending")
                .virusName(dto.getVirusName())
                .submittedBy(parent.getSubmittedBy())
                .tutor(parent.getTutor())
                .status(StudentDeliverableStatus.SUBMITTED)
                .versionNumber(nextVersion)
                .parentId(parentId)
                .build();

        return StudentDeliverableResponseDto.from(studentDeliverableRepository.save(version));
    }

    @Transactional(readOnly = true)
    public List<StudentDeliverableResponseDto> getVersions(Long parentId) {
        return studentDeliverableRepository.findVersionsByParentId(parentId)
                .stream().map(StudentDeliverableResponseDto::from).toList();
    }

    // ── Mark under review ─────────────────────────────────────────────────────

    @Transactional
    public StudentDeliverableResponseDto markUnderReview(Long deliverableId) {
        StudentDeliverable d = findOrThrow(deliverableId);
        d.setStatus(StudentDeliverableStatus.UNDER_REVIEW);
        return StudentDeliverableResponseDto.from(studentDeliverableRepository.save(d));
    }

    // ── Tutors by project ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTutorsByProject(UUID projectId) {
        return projectMemberRepository
                .findUsersByProjectIdAndRole(projectId, ProjectMember.ProjectRole.PROFESSOR)
                .stream()
                .<Map<String, Object>>map(u -> Map.of(
                        "id", u.getId(),
                        "fullName", u.getFullName() != null ? u.getFullName() : "",
                        "email", u.getEmail() != null ? u.getEmail() : ""))
                .toList();
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    public StudentDeliverable findOrThrow(Long id) {
        return studentDeliverableRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + id));
    }
}
