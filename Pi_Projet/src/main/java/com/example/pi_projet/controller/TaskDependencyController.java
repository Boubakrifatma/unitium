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
        System.out.println("TaskDependencyController.create called with dto: " + dto);
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            System.out.println("Current user is null");
            return ResponseEntity.status(401).body("Session invalide ou expirée");
        }

        if (dto.getTaskId() == null || dto.getDependsOnTaskId() == null) {
            System.out.println("taskId or dependsOnTaskId is null");
            return ResponseEntity.badRequest().body("taskId and dependsOnTaskId are required");
        }

        if (dto.getDependencyType() == null || dto.getDependencyType().isBlank()) {
            System.out.println("dependencyType is null or blank");
            return ResponseEntity.badRequest().body("dependencyType is required");
        }

        TaskDependency.DependencyType dependencyType;
        try {
            dependencyType = TaskDependency.DependencyType.valueOf(dto.getDependencyType().toLowerCase());
            System.out.println("Dependency type: " + dependencyType);
        } catch (IllegalArgumentException e) {
            System.out.println("Invalid dependency type: " + dto.getDependencyType());
            return ResponseEntity.badRequest().body("Invalid dependencyType. Allowed values: finish_to_start, start_to_start, finish_to_finish");
        }

        Task task;
        Task dependsOnTask;
        try {
            task = taskService.getById(dto.getTaskId());
            dependsOnTask = taskService.getById(dto.getDependsOnTaskId());
            System.out.println("Task found: " + task.getId() + ", dependsOnTask found: " + dependsOnTask.getId());
        } catch (RuntimeException e) {
            System.out.println("Task not found: " + e.getMessage());
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
            System.out.println("TaskDependency saved with id: " + saved.getId());
            return ResponseEntity.ok(toDto(saved));
        } catch (RuntimeException e) {
            System.out.println("RuntimeException in create: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.out.println("Exception in create: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal server error");
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
