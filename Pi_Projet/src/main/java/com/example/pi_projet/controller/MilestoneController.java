package com.example.pi_projet.controller;

import com.example.pi_projet.dto.MilestoneCreateDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.service.MilestoneService;
import com.example.pi_projet.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> create(@Valid @RequestBody MilestoneCreateDto dto) {
        try {
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

            Milestone milestone = new Milestone();
            milestone.setName(dto.getName());
            milestone.setDescription(dto.getDescription());
            milestone.setDueDate(dto.getDueDate());
            milestone.setStatus(Milestone.MilestoneStatus.valueOf(dto.getStatus()));
            milestone.setCompletionPct(Float.valueOf(dto.getCompletionPct()));
            milestone.setProject(projectService.getById(projectId));

            return ResponseEntity.status(201).body(milestoneService.create(milestone));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
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