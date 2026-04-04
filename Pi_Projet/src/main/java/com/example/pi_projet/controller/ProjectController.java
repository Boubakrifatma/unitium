package com.example.pi_projet.controller;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService service;

    @GetMapping
    public List<Project> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Project getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @PostMapping
    public Project create(@RequestBody Project project) {
        return service.create(project);
    }

    @PutMapping("/{id}")
    public Project update(@PathVariable UUID id, @RequestBody Project project) {
        return service.update(id, project);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}/members")
    public List<User> getMembers(@PathVariable UUID id) {
        return service.getMembers(id);
    }

    @GetMapping("/user/{userId}")
    public List<Project> getUserProjects(@PathVariable Long userId) {
        return service.getUserProjects(userId);
    }
}