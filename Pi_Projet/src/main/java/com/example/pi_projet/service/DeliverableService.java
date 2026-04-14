package com.example.pi_projet.service;

import com.example.pi_projet.dto.*;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable.DeliverableStatus;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.DeliverableRepository;
import com.example.pi_projet.repository.DeliverableVersionRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliverableService {

    private final DeliverableRepository deliverableRepository;
    private final DeliverableVersionRepository versionRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

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

        // ✅ Statut par défaut : under_review (en révision) lors de la création
        DeliverableStatus status = DeliverableStatus.under_review;
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            try {
                status = DeliverableStatus.valueOf(dto.getStatus().toLowerCase());
            } catch (IllegalArgumentException e) {
                // Si le statut fourni est invalide, on garde under_review par défaut
                status = DeliverableStatus.under_review;
            }
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

        Deliverable saved = deliverableRepository.save(deliverable);

        // Notifier tous les managers qu'un nouveau livrable est soumis
        notificationService.notifyManagersOnSubmission(saved, submittedBy);

        return mapToDto(saved);
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
        return deliverableRepository.findBySubmittedByIdOrderBySubmittedAtDesc(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DeliverableResponseDto> getEmployeeDeliverables(Long employeeId) {
        return deliverableRepository.findBySubmittedByIdOrderBySubmittedAtDesc(employeeId)
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
    // MANAGER VIEW - grouped by milestone then task
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<MilestoneDeliverableGroupDto> getManagerView(String projectId) {
        List<Deliverable> deliverables = deliverableRepository
                .findByProjectIdWithMilestone(UUID.fromString(projectId));

        // Separate deliverables with and without milestone
        Map<Long, List<Deliverable>> byMilestone = new LinkedHashMap<>();
        Map<Long, Milestone> milestoneMap = new LinkedHashMap<>();
        List<Deliverable> noMilestone = new ArrayList<>();

        for (Deliverable d : deliverables) {
            Milestone m = d.getTask() != null ? d.getTask().getMilestone() : null;
            if (m != null) {
                byMilestone.computeIfAbsent(m.getId(), k -> new ArrayList<>()).add(d);
                milestoneMap.put(m.getId(), m);
            } else {
                noMilestone.add(d);
            }
        }

        List<MilestoneDeliverableGroupDto> result = new ArrayList<>();

        // Build milestone groups
        for (Map.Entry<Long, List<Deliverable>> entry : byMilestone.entrySet()) {
            Milestone m = milestoneMap.get(entry.getKey());
            result.add(MilestoneDeliverableGroupDto.builder()
                    .milestoneId(m.getId())
                    .milestoneName(m.getName())
                    .milestoneDescription(m.getDescription())
                    .milestoneStatus(m.getStatus().name())
                    .dueDate(m.getDueDate())
                    .completionPct(m.getCompletionPct())
                    .tasks(buildTaskGroups(entry.getValue()))
                    .build());
        }

        // Deliverables without milestone
        if (!noMilestone.isEmpty()) {
            result.add(MilestoneDeliverableGroupDto.builder()
                    .milestoneId(null)
                    .milestoneName("Sans milestone")
                    .milestoneDescription(null)
                    .milestoneStatus(null)
                    .dueDate(null)
                    .completionPct(null)
                    .tasks(buildTaskGroups(noMilestone))
                    .build());
        }

        return result;
    }

    private List<TaskDeliverableGroupDto> buildTaskGroups(List<Deliverable> deliverables) {
        Map<Long, List<Deliverable>> byTask = deliverables.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getTask().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        return byTask.entrySet().stream().map(e -> {
            Task task = e.getValue().get(0).getTask();
            List<DeliverableWithVersionsDto> deliverableDtos = e.getValue().stream()
                    .map(this::buildDeliverableWithVersions)
                    .collect(Collectors.toList());
            return TaskDeliverableGroupDto.builder()
                    .taskId(task.getId())
                    .taskTitle(task.getTitle())
                    .taskStatus(task.getStatus().name())
                    .assignedToName(task.getAssignedTo() != null ? task.getAssignedTo().getFullName() : null)
                    .deliverables(deliverableDtos)
                    .build();
        }).collect(Collectors.toList());
    }

    private DeliverableWithVersionsDto buildDeliverableWithVersions(Deliverable d) {
        List<DeliverableVersion> versions = versionRepository.findByDeliverableId(d.getId());
        List<DeliverableVersionDto> versionDtos = versions.stream()
                .map(v -> DeliverableVersionDto.builder()
                        .id(v.getId())
                        .deliverableId(d.getId())
                        .versionNumber(v.getVersionNumber())
                        .fileUrl(v.getFileUrl())
                        .fileSizeKb(v.getFileSizeKb())
                        .changeSummary(v.getChangeSummary())
                        .submittedById(v.getSubmittedBy().getId())
                        .submittedByName(v.getSubmittedBy().getFullName())
                        .submittedAt(v.getSubmittedAt())
                        .virusScanStatus(v.getVirusScanStatus().name().toLowerCase())
                        .build())
                .collect(Collectors.toList());

        return DeliverableWithVersionsDto.builder()
                .deliverableId(d.getId())
                .taskId(d.getTask().getId())
                .taskTitle(d.getTask().getTitle())
                .taskStatus(d.getTask().getStatus().name())
                .taskDueDate(d.getTask().getDueDate())
                .projectId(d.getProject().getId().toString())
                .employeeId(d.getSubmittedBy().getId())
                .employeeName(d.getSubmittedBy().getFullName())
                .title(d.getTitle())
                .description(d.getDescription())
                .currentVersion(d.getCurrentVersion())
                .overallStatus(d.getStatus().name())
                .fileUrl(d.getFileUrl())
                .fileType(d.getFileType())
                .fileSizeKb(d.getFileSizeKb())
                .submittedAt(d.getSubmittedAt())
                .updatedAt(d.getUpdatedAt())
                .versions(versionDtos)
                .build();
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
                .taskStatus(d.getTask() != null && d.getTask().getStatus() != null ? d.getTask().getStatus().name() : null)
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