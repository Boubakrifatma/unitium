package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import com.example.pi_projet.repository.TaskDependencyRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskDependencyService {

    private final TaskDependencyRepository repository;
    private final TaskRepository taskRepository;

    public List<TaskDependency> getAll() {
        return repository.findAll();
    }

    public TaskDependency getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("TaskDependency not found"));
    }

    public TaskDependency create(TaskDependency taskDependency) {
        System.out.println("TaskDependencyService.create called with taskId: " + taskDependency.getTask().getId() + ", dependsOnTaskId: " + taskDependency.getDependsOnTask().getId());
        // Validate that both tasks exist
        taskRepository.findById(taskDependency.getTask().getId())
                .orElseThrow(() -> new RuntimeException("Task not found"));
        taskRepository.findById(taskDependency.getDependsOnTask().getId())
                .orElseThrow(() -> new RuntimeException("Dependency task not found"));
        System.out.println("Tasks exist");

        // Check for circular dependencies
        if (taskDependency.getTask().getId().equals(taskDependency.getDependsOnTask().getId())) {
            throw new RuntimeException("A task cannot depend on itself");
        }

        // Check if dependency already exists
        if (repository.existsByTaskIdAndDependsOnTaskId(taskDependency.getTask().getId(), taskDependency.getDependsOnTask().getId())) {
            throw new RuntimeException("This dependency already exists");
        }
        System.out.println("Validation passed, saving...");

        return repository.save(taskDependency);
    }

    public TaskDependency update(Long id, TaskDependency taskDependency) {
        TaskDependency existing = getById(id);

        if (taskDependency.getDependencyType() != null) {
            existing.setDependencyType(taskDependency.getDependencyType());
        }

        return repository.save(existing);
    }

    public void delete(Long id) {
        TaskDependency existing = getById(id);
        repository.deleteById(id);
    }

    public List<TaskDependency> getDependenciesByTaskId(Long taskId) {
        return repository.findByTaskId(taskId);
    }

    public List<TaskDependency> getDependentsForTaskId(Long taskId) {
        return repository.findByDependsOnTaskId(taskId);
    }

    public List<TaskDependency> getAllDependenciesForTask(Long taskId) {
        return repository.findByTaskIdOrDependsOnTaskId(taskId);
    }
}
