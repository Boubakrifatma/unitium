package com.example.pi_projet.controller;

import com.example.pi_projet.dto.TaskDependencyCreateDto;
import com.example.pi_projet.dto.TaskDependencyResponseDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.TaskDependencyService;
import com.example.pi_projet.service.TaskService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/task-dependencies")
@CrossOrigin(origins = "http://localhost:4200")
public class TaskDependencyController {

    private final TaskDependencyService taskDependencyService;
    private final TaskService taskService;

    public TaskDependencyController(TaskDependencyService taskDependencyService,
                                   TaskService taskService) {
        this.taskDependencyService = taskDependencyService;
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody TaskDependencyCreateDto dto,
                                    HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Session invalide ou expirée");
        }

        if (dto.getTaskId() == null || dto.getDependsOnTaskId() == null) {
            return ResponseEntity.badRequest().body("taskId and dependsOnTaskId are required");
        }

        if (dto.getDependencyType() == null || dto.getDependencyType().isBlank()) {
            return ResponseEntity.badRequest().body("dependencyType is required");
        }

        TaskDependency.DependencyType dependencyType;
        try {
            dependencyType = TaskDependency.DependencyType.valueOf(dto.getDependencyType().toLowerCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid dependencyType. Allowed values: finish_to_start, start_to_start, finish_to_finish");
        }

        Task task;
        Task dependsOnTask;
        try {
            task = taskService.getById(dto.getTaskId());
            dependsOnTask = taskService.getById(dto.getDependsOnTaskId());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        TaskDependency taskDependency = TaskDependency.builder()
                .task(task)
                .dependsOnTask(dependsOnTask)
                .dependencyType(dependencyType)
                .createdBy(currentUser)
                .build();

        try {
            TaskDependency saved = taskDependencyService.create(taskDependency);
            return ResponseEntity.ok(toDto(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDependencyResponseDto> getById(@PathVariable Long id) {
        TaskDependency taskDependency = taskDependencyService.getById(id);
        return ResponseEntity.ok(toDto(taskDependency));
    }

    @GetMapping
    public ResponseEntity<List<TaskDependencyResponseDto>> getAll() {
        List<TaskDependency> dependencies = taskDependencyService.getAll();
        List<TaskDependencyResponseDto> dtos = dependencies.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<TaskDependencyResponseDto>> getDependenciesByTask(@PathVariable Long taskId) {
        List<TaskDependency> dependencies = taskDependencyService.getDependenciesByTaskId(taskId);
        List<TaskDependencyResponseDto> dtos = dependencies.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/dependents/{taskId}")
    public ResponseEntity<List<TaskDependencyResponseDto>> getDependentsForTask(@PathVariable Long taskId) {
        List<TaskDependency> dependents = taskDependencyService.getDependentsForTaskId(taskId);
        List<TaskDependencyResponseDto> dtos = dependents.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/all/{taskId}")
    public ResponseEntity<List<TaskDependencyResponseDto>> getAllDependenciesForTask(@PathVariable Long taskId) {
        List<TaskDependency> dependencies = taskDependencyService.getAllDependenciesForTask(taskId);
        List<TaskDependencyResponseDto> dtos = dependencies.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDependencyResponseDto> update(@PathVariable Long id,
                                                            @RequestBody TaskDependencyCreateDto dto) {
        TaskDependency existing = taskDependencyService.getById(id);

        if (dto.getDependencyType() != null && !dto.getDependencyType().isBlank()) {
            existing.setDependencyType(TaskDependency.DependencyType.valueOf(dto.getDependencyType().toLowerCase()));
        }

        TaskDependency updated = taskDependencyService.update(id, existing);
        return ResponseEntity.ok(toDto(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taskDependencyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private TaskDependencyResponseDto toDto(TaskDependency td) {
        return TaskDependencyResponseDto.builder()
                .id(td.getId())
                .taskId(td.getTask() != null ? td.getTask().getId() : null)
                .taskTitle(td.getTask() != null ? td.getTask().getTitle() : null)
                .dependsOnTaskId(td.getDependsOnTask() != null ? td.getDependsOnTask().getId() : null)
                .dependsOnTaskTitle(td.getDependsOnTask() != null ? td.getDependsOnTask().getTitle() : null)
                .dependencyType(td.getDependencyType() != null ? td.getDependencyType().name() : null)
                .createdById(td.getCreatedBy() != null ? td.getCreatedBy().getId() : null)
                .createdByName(td.getCreatedBy() != null ? td.getCreatedBy().getFullName() : null)
                .createdAt(td.getCreatedAt())
                .build();
    }
}
