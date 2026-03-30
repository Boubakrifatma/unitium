package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository repository;

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
}