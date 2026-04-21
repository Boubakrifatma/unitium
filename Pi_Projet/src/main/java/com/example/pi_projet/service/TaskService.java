package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository repository;
    private final ProjectService projectService;
    private final PulseEventBus pulseEventBus;

    public List<Task> getAll() {
        return repository.findAll();
    }

    public Task getById(Long id) {
        return repository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public Task create(Task task) {
        Task saved = repository.save(task);
        // ✅ recalcul projet
        if (saved.getProject() != null) {
            projectService.updateStatusFromTasks(saved.getProject().getId());
            publishTaskEvent(saved, "TASK_CREATED", "Task \"" + saved.getTitle() + "\" created");
        }
        return saved;
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

        if (t.getMilestone() != null) existing.setMilestone(t.getMilestone());
        if (t.getProject()   != null) existing.setProject(t.getProject());

        Task saved = repository.save(existing);

        if (saved.getProject() != null) {
            projectService.updateStatusFromTasks(saved.getProject().getId());
            publishTaskEvent(saved, "TASK_UPDATED", "Task \"" + saved.getTitle() + "\" updated");
        }

        return saved;
    }

    public void delete(Long id) {
        Task task = getById(id);
        UUID projectId = task.getProject() != null
                ? task.getProject().getId()
                : null;

        // Détacher les sous-tâches avant de supprimer le parent
        List<Task> children = repository.findByParentTask_Id(id);
        for (Task child : children) {
            child.setParentTask(null);
            repository.save(child);
        }

        repository.deleteById(id);

        // ✅ recalcul après suppression
        if (projectId != null) {
            projectService.updateStatusFromTasks(projectId);
            publishTaskDeleteEvent(projectId, task.getTitle());
        }
    }

    public List<Task> getTasksByMilestone(Long milestoneId) {
        return repository.findByMilestoneId(milestoneId);
    }

    public List<Task> getTasksByUser(Long userId) {
        return repository.findByAssignedTo_Id(userId);
    }

    private void publishTaskEvent(Task task, String type, String message) {
        if (task == null || task.getProject() == null || task.getProject().getId() == null) {
            return;
        }

        try {
            var project = projectService.getById(task.getProject().getId());
            var workspace = project.getWorkspace();
            if (workspace == null || workspace.getId() == null) {
                return;
            }

            String actor = task.getCreatedBy() != null && task.getCreatedBy().getFullName() != null
                ? task.getCreatedBy().getFullName()
                : "System";
            pulseEventBus.publish(workspace.getId(), type, message, actor);
        } catch (Exception ignored) {
            // SSE publishing must not break task lifecycle operations.
        }
    }

    private void publishTaskDeleteEvent(UUID projectId, String taskTitle) {
        try {
            var project = projectService.getById(projectId);
            var workspace = project.getWorkspace();
            if (workspace == null || workspace.getId() == null) {
                return;
            }

            String label = taskTitle == null || taskTitle.isBlank() ? "Task deleted" : "Task \"" + taskTitle + "\" deleted";
            pulseEventBus.publish(workspace.getId(), "TASK_DELETED", label, "System");
        } catch (Exception ignored) {
            // SSE publishing must not break task lifecycle operations.
        }
    }

}
