package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository repository;

    public List<Task> getAll() {
        return repository.findAll();
    }

    public Task getById(Long id) {
        return repository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public Task create(Task task) {
        return repository.save(task);
    }

    public Task update(Long id, Task t) {
        Task existing = getById(id);

        existing.setTitle(t.getTitle());
        existing.setDescription(t.getDescription());
        existing.setTaskType(t.getTaskType());
        existing.setAssignedTo(t.getAssignedTo());
        existing.setStatus(t.getStatus());
        existing.setPriority(t.getPriority());
        existing.setEstimatedHours(t.getEstimatedHours());
        existing.setActualHours(t.getActualHours());
        existing.setStartDate(t.getStartDate());
        existing.setDueDate(t.getDueDate());
        existing.setCompletedAt(t.getCompletedAt());

        if (t.getMilestone() != null) {
            existing.setMilestone(t.getMilestone());
        }
        if (t.getProject() != null) {
            existing.setProject(t.getProject());
        }

        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
    public List<Task> getTasksByMilestone(Long milestoneId) {
        return repository.findByMilestoneId(milestoneId);
    }
}