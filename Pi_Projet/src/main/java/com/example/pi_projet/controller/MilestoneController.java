package com.example.pi_projet.controller;

import com.example.pi_projet.dto.MilestoneCreateDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.service.MilestoneService;
import com.example.pi_projet.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;
    private final ProjectService projectService;

    @GetMapping
    public List<Milestone> getAll() {
        return milestoneService.getAll();
    }

    @GetMapping("/{id}")
    public Milestone getById(@PathVariable Long id) {
        return milestoneService.getById(id);
    }

    @PostMapping
    public Milestone create(@Valid @RequestBody MilestoneCreateDto dto) {
        Milestone milestone = new Milestone();
        milestone.setName(dto.getName());
        milestone.setDescription(dto.getDescription());
        milestone.setDueDate(dto.getDueDate());
        milestone.setStatus(Milestone.MilestoneStatus.valueOf(dto.getStatus()));
        milestone.setCompletionPct(Float.valueOf(dto.getCompletionPct()));
        milestone.setProject(projectService.getById(UUID.fromString(dto.getProjectId())));
        return milestoneService.create(milestone);
    }

    @PutMapping("/{id}")
    public Milestone update(@PathVariable Long id, @RequestBody Milestone milestone) {
        return milestoneService.update(id, milestone);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        milestoneService.delete(id);
    }
}