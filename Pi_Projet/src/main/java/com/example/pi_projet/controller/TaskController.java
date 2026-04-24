package com.example.pi_projet.controller;

import com.example.pi_projet.dto.TaskCreateDto;
import com.example.pi_projet.dto.TaskResponseDto;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.ProjectService;
import com.example.pi_projet.service.TaskService;
import com.example.pi_projet.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:4200")
public class TaskController {

    private final TaskService taskService;
    private final ProjectService projectService;
    private final UserService userService;

    public TaskController(TaskService taskService,
                          ProjectService projectService,
                          UserService userService) {
        this.taskService = taskService;
        this.projectService = projectService;
        this.userService = userService;
    }




    @PostMapping
    public ResponseEntity<TaskResponseDto> create(@RequestBody TaskCreateDto dto, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        String raw = dto.getProjectId().trim();
        if (raw.startsWith("0x") || raw.startsWith("0X")) {
            String hex = raw.substring(2);
            raw = hex.substring(0, 8)  + "-"
                    + hex.substring(8, 12)  + "-"
                    + hex.substring(12, 16) + "-"
                    + hex.substring(16, 20) + "-"
                    + hex.substring(20, 32);
        }
        UUID projectId = UUID.fromString(raw);

        Project project = projectService.getById(projectId);

        User assignedTo = null;
        if (dto.getAssignedToId() != null) {
            assignedTo = userService.getUserByIdForTasks(dto.getAssignedToId());
        }

        Milestone milestone = null;
        if (dto.getMilestoneId() != null) {
            milestone = new Milestone();
            milestone.setId(dto.getMilestoneId());
        }

        Task parentTask = null;
        if (dto.getParentTaskId() != null) {
            parentTask = taskService.getById(dto.getParentTaskId());
        }

        Task task = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .taskType(Task.TaskType.valueOf(dto.getTaskType()))
                .status(Task.TaskStatus.valueOf(dto.getStatus().toLowerCase()))
                .priority(dto.getPriority() != null
                        ? Task.TaskPriority.valueOf(dto.getPriority().toLowerCase())
                        : null)
                .estimatedHours(dto.getEstimatedHours())
                .actualHours(dto.getActualHours())
                .startDate(dto.getStartDate())
                .dueDate(dto.getDueDate())
                .project(project)
                .assignedTo(assignedTo)
                .milestone(milestone)
                .parentTask(parentTask)
                .createdBy(currentUser)
                .isVisibleToAssignees(dto.getIsVisibleToAssignees() == null || dto.getIsVisibleToAssignees())
                .build();

        Task saved = taskService.create(task);
        return ResponseEntity.ok(toDto(saved));
    }
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(taskService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAll() {
        return ResponseEntity.ok(taskService.getAll());
    }

    @GetMapping("/milestone/{milestoneId}")
    public ResponseEntity<List<Task>> getTasksByMilestone(@PathVariable Long milestoneId) {
        return ResponseEntity.ok(taskService.getTasksByMilestone(milestoneId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDto> update(@PathVariable Long id, @RequestBody TaskCreateDto dto) {
        Task existing = taskService.getById(id);

        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }

        if (dto.getDescription() != null) {
            existing.setDescription(dto.getDescription());
        }

        if (dto.getTaskType() != null && !dto.getTaskType().isBlank()) {
            existing.setTaskType(Task.TaskType.valueOf(dto.getTaskType()));
        }

        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            Task.TaskStatus newStatus = Task.TaskStatus.valueOf(dto.getStatus().toLowerCase());
            if (newStatus == Task.TaskStatus.done && existing.getStatus() != Task.TaskStatus.done) {
                existing.setCompletedAt(LocalDateTime.now());
            }
            existing.setStatus(newStatus);
        }

        if (dto.getPriority() != null && !dto.getPriority().isBlank()) {
            existing.setPriority(Task.TaskPriority.valueOf(dto.getPriority().toLowerCase()));
        }

        if (dto.getEstimatedHours() != null) {
            existing.setEstimatedHours(dto.getEstimatedHours());
        }

        if (dto.getActualHours() != null) {
            existing.setActualHours(dto.getActualHours());
        }

        if (dto.getStartDate() != null) {
            existing.setStartDate(dto.getStartDate());
        }

        if (dto.getDueDate() != null) {
            existing.setDueDate(dto.getDueDate());
        }

        // assignedTo
        if (dto.getAssignedToId() != null) {
            existing.setAssignedTo(userService.getUserByIdForTasks(dto.getAssignedToId()));
        }

        // milestone
        if (dto.getMilestoneId() != null) {
            Milestone milestone = new Milestone();
            milestone.setId(dto.getMilestoneId());
            existing.setMilestone(milestone);
        }

        // parent task
        if (dto.getParentTaskId() != null) {
            existing.setParentTask(taskService.getById(dto.getParentTaskId()));
        } else {
            existing.setParentTask(null);
        }

        // project
        if (dto.getProjectId() != null && !dto.getProjectId().isBlank()) {
            existing.setProject(projectService.getById(UUID.fromString(dto.getProjectId())));
        }

        // visibility
        if (dto.getIsVisibleToAssignees() != null) {
            existing.setVisibleToAssignees(dto.getIsVisibleToAssignees());
        }

        return ResponseEntity.ok(toDto(taskService.update(id, existing)));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<Task> setVisibility(@PathVariable Long id,
                                              @RequestParam boolean visible,
                                              HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        // Only manager or admin may change visibility
        if (currentUser.getRole() != com.example.pi_projet.entity.User.RoleName.ADMIN
                && currentUser.getRole() != com.example.pi_projet.entity.User.RoleName.MANAGER) {
            return ResponseEntity.status(403).build();
        }
        Task updated = taskService.setVisibility(id, visible);
        return ResponseEntity.ok(updated);
    }
    @GetMapping("/my-tasks")
    public ResponseEntity<List<TaskResponseDto>> getMyTasks(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        List<Task> tasks = taskService.getTasksByUser(currentUser.getId());

        // Filter out hidden tasks for non-manager/admin users
        boolean isManagerOrAdmin = currentUser.getRole() == com.example.pi_projet.entity.User.RoleName.ADMIN
                || currentUser.getRole() == com.example.pi_projet.entity.User.RoleName.MANAGER;
        if (!isManagerOrAdmin) {
            tasks = tasks.stream()
                    .filter(Task::isVisibleToAssignees)
                    .collect(Collectors.toList());
        }

        List<TaskResponseDto> dtos = tasks.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/dto/{id}")
    public ResponseEntity<TaskResponseDto> getByIdDto(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(taskService.getById(id)));
    }

    @GetMapping("/milestone/{milestoneId}/dto")
    public ResponseEntity<List<TaskResponseDto>> getTasksByMilestoneDto(@PathVariable Long milestoneId) {
        return ResponseEntity.ok(
                taskService.getTasksByMilestone(milestoneId)
                        .stream().map(this::toDto).collect(Collectors.toList())
        );
    }

    private TaskResponseDto toDto(Task t) {
        return TaskResponseDto.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .taskType(t.getTaskType() != null ? t.getTaskType().name() : null)
                .status(t.getStatus() != null ? t.getStatus().name() : null)
                .priority(t.getPriority() != null ? t.getPriority().name() : null)
                .estimatedHours(t.getEstimatedHours() != null ? t.getEstimatedHours().doubleValue() : null)
                .actualHours(t.getActualHours() != null ? t.getActualHours().doubleValue() : null)
                .startDate(t.getStartDate())
                .dueDate(t.getDueDate())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .completedAt(t.getCompletedAt())
                .projectId(t.getProject() != null ? t.getProject().getId().toString() : null)
                .projectName(t.getProject() != null ? t.getProject().getName() : null)
                .assignedToId(t.getAssignedTo() != null ? t.getAssignedTo().getId() : null)
                .assignedToName(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : null)
                .assignedToEmail(t.getAssignedTo() != null ? t.getAssignedTo().getEmail() : null)
                .createdById(t.getCreatedBy() != null ? t.getCreatedBy().getId() : null)
                .createdByName(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null)
                .parentTaskId(t.getParentTask() != null ? t.getParentTask().getId() : null)
                .parentTaskTitle(t.getParentTask() != null ? t.getParentTask().getTitle() : null)
                .milestoneId(t.getMilestone() != null ? t.getMilestone().getId() : null)
                .milestoneName(t.getMilestone() != null ? t.getMilestone().getName() : null)
                .isVisibleToAssignees(t.isVisibleToAssignees())
                .build();
    }

    }

