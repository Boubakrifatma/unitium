package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final TaskRepository taskRepository;
    private final ProjectRepository repository;
    private final ProjectMemberRepository projectMemberRepository;

    public List<Project> getAll() {
        return repository.findAll();
    }

    public Project getById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project create(Project project) {
        return repository.save(project);
    }

    public Project update(UUID id, Project p) {
        Project existing = getById(id);

        existing.setName(p.getName());
        existing.setDescription(p.getDescription());
        existing.setStatus(p.getStatus());
        existing.setVisibility(p.getVisibility());

        return repository.save(existing);
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }

    public List<User> getMembers(UUID projectId) {
        return projectMemberRepository.findMembersByProjectId(projectId)
                .stream()
                .map(ProjectMember::getUser)
                .toList();
    }

    public List<Project> getUserProjects(Long userId) {
        return projectMemberRepository.findByUserId(userId)
                .stream()
                .map(ProjectMember::getProject)
                .distinct()
                .toList();
    }


    //adding for task
    public void updateStatusFromTasks(UUID projectId) {
        Project project = getById(projectId);
        List<Task> tasks = taskRepository.findByProject_Id(projectId);

        if (tasks.isEmpty()) return;

        long total      = tasks.size();
        long done       = tasks.stream()
                .filter(t -> t.getStatus() == Task.TaskStatus.done)
                .count();
        long active     = tasks.stream()
                .filter(t -> t.getStatus() == Task.TaskStatus.in_progress
                        || t.getStatus() == Task.TaskStatus.review)
                .count();

        Project.ProjectStatus newStatus;

        if (done == total) {
            // Toutes les tâches terminées → COMPLETED
            newStatus = Project.ProjectStatus.COMPLETED;

        } else if (active > 0 || done > 0) {
            // Au moins une tâche en cours ou terminée → ACTIVE
            newStatus = Project.ProjectStatus.ACTIVE;

        } else {
            // Toutes encore en todo/blocked → PLANNING
            newStatus = Project.ProjectStatus.PLANNING;
        }

        // Sauvegarder seulement si le statut change
        if (project.getStatus() != newStatus) {
            project.setStatus(newStatus);
            repository.save(project);
        }
    }
}