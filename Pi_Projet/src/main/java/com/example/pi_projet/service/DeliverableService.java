package com.example.pi_projet.service;

import com.example.pi_projet.dto.DeliverableCreateDto;
import com.example.pi_projet.dto.DeliverableResponseDto;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable.DeliverableStatus;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.DeliverableRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliverableService {

    private final DeliverableRepository deliverableRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    // ═════════════════════════════════════════════════════════════════════════
    // CREATE
    // ═════════════════════════════════════════════════════════════════════════

    public DeliverableResponseDto create(DeliverableCreateDto dto) {
        Task task = taskRepository.findById(dto.getTaskId())
                .orElseThrow(() -> new RuntimeException("Task not found: " + dto.getTaskId()));

        if (task.getStatus() != Task.TaskStatus.done) {
            throw new IllegalStateException(
                    "Un livrable ne peut être soumis que quand le statut de la tâche est 'done'. " +
                            "Statut actuel: " + task.getStatus());
        }

        Project project = projectRepository.findById(UUID.fromString(dto.getProjectId()))
                .orElseThrow(() -> new RuntimeException("Project not found: " + dto.getProjectId()));

        User submittedBy = userRepository.findById(dto.getSubmittedById())
                .orElseThrow(() -> new RuntimeException("User not found: " + dto.getSubmittedById()));

        // Statut par défaut : draft si non fourni, sinon on parse
        DeliverableStatus status = DeliverableStatus.draft;
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            status = DeliverableStatus.valueOf(dto.getStatus().toLowerCase());
        }

        Deliverable deliverable = Deliverable.builder()
                .task(task)
                .project(project)
                .submittedBy(submittedBy)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .fileUrl(dto.getFileUrl())
                .fileType(dto.getFileType())
                .fileSizeKb(dto.getFileSizeKb())
                .currentVersion(1)
                .status(status)
                .submittedAt(LocalDateTime.now())
                .build();

        return mapToDto(deliverableRepository.save(deliverable));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // READ
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getAll() {
        return deliverableRepository.findAll()
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DeliverableResponseDto getById(Long id) {
        return mapToDto(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getByTaskId(Long taskId) {
        return deliverableRepository.findByTaskId(taskId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getByProjectId(String projectId) {
        return deliverableRepository.findByProjectId(UUID.fromString(projectId))
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getBySubmittedBy(Long userId) {
        return deliverableRepository.findBySubmittedById(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getEmployeeDeliverables(Long employeeId) {
        return deliverableRepository.findBySubmittedById(employeeId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getEmployeeDeliverablesByStatus(Long employeeId, DeliverableStatus status) {
        return deliverableRepository.findBySubmittedByIdAndStatus(employeeId, status)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getByStatus(DeliverableStatus status) {
        return deliverableRepository.findByStatus(status)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UPDATE
    // ═════════════════════════════════════════════════════════════════════════

    public DeliverableResponseDto update(Long id, DeliverableCreateDto dto) {
        Deliverable existing = findOrThrow(id);

        if (dto.getTitle() != null)       existing.setTitle(dto.getTitle());
        if (dto.getDescription() != null) existing.setDescription(dto.getDescription());
        if (dto.getFileUrl() != null)     existing.setFileUrl(dto.getFileUrl());
        if (dto.getFileType() != null)    existing.setFileType(dto.getFileType());
        if (dto.getFileSizeKb() != null)  existing.setFileSizeKb(dto.getFileSizeKb());
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            existing.setStatus(DeliverableStatus.valueOf(dto.getStatus().toLowerCase()));
        }

        // Bump version à chaque resoumission
        existing.setCurrentVersion(existing.getCurrentVersion() + 1);
        existing.setUpdatedAt(LocalDateTime.now());

        return mapToDto(deliverableRepository.save(existing));
    }

    public DeliverableResponseDto updateStatus(Long id, DeliverableStatus status) {
        Deliverable deliverable = findOrThrow(id);
        deliverable.setStatus(status);
        deliverable.setUpdatedAt(LocalDateTime.now());
        return mapToDto(deliverableRepository.save(deliverable));
    }

    public DeliverableResponseDto updatePoDecision(Long id, Deliverable.PoDecisionField poDecision) {
        Deliverable deliverable = findOrThrow(id);
        deliverable.setPoDecisionField(poDecision);
        deliverable.setUpdatedAt(LocalDateTime.now());
        return mapToDto(deliverableRepository.save(deliverable));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DELETE
    // ═════════════════════════════════════════════════════════════════════════

    public void delete(Long id) {
        findOrThrow(id);
        deliverableRepository.deleteById(id);
    }

    public void deleteByTaskId(Long taskId) {
        deliverableRepository.deleteByTaskId(taskId);
    }

    public void deleteByProjectId(String projectId) {
        deliverableRepository.deleteByProjectId(UUID.fromString(projectId));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private Deliverable findOrThrow(Long id) {
        return deliverableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + id));
    }

    private DeliverableResponseDto mapToDto(Deliverable d) {
        return DeliverableResponseDto.builder()
                .id(d.getId())
                .title(d.getTitle())
                .description(d.getDescription())
                .currentVersion(d.getCurrentVersion())
                .fileUrl(d.getFileUrl())
                .fileType(d.getFileType())
                .fileSizeKb(d.getFileSizeKb())
                .status(d.getStatus() != null ? d.getStatus().name().toLowerCase() : null)
                .poDecisionField(d.getPoDecisionField() != null ?
                        d.getPoDecisionField().name().toLowerCase() : null)
                .submittedAt(d.getSubmittedAt())
                .updatedAt(d.getUpdatedAt())
                // Task
                .taskId(d.getTask() != null ? d.getTask().getId() : null)
                .taskTitle(d.getTask() != null ? d.getTask().getTitle() : null)
                .taskStatus(d.getTask() != null ? d.getTask().getStatus().name() : null)
                // Project
                .projectId(d.getProject() != null ? d.getProject().getId().toString() : null)
                .projectName(d.getProject() != null ? d.getProject().getName() : null)
                // User
                .submittedById(d.getSubmittedBy() != null ? d.getSubmittedBy().getId() : null)
                .submittedByName(d.getSubmittedBy() != null ? d.getSubmittedBy().getFullName() : null)
                .submittedByEmail(d.getSubmittedBy() != null ? d.getSubmittedBy().getEmail() : null)
                .build();
    }
}