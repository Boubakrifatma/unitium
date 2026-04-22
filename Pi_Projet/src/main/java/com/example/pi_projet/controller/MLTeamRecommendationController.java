package com.example.pi_projet.controller;

import com.example.pi_projet.entity.MLTeamRecommendation;
import com.example.pi_projet.service.MLTeamRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ml-team-recommendations")
@RequiredArgsConstructor
public class MLTeamRecommendationController {

    private final MLTeamRecommendationService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MLTeamRecommendation create(@RequestBody MLTeamRecommendation recommendation) {
        return service.create(recommendation);
    }

    @GetMapping
    public List<MLTeamRecommendation> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public MLTeamRecommendation getById(@PathVariable UUID id) {
        return service.getByIdOrThrow(id);
    }

    @GetMapping("/project/{projectId}")
    public List<MLTeamRecommendation> getByProjectId(@PathVariable UUID projectId) {
        return service.getByProjectId(projectId);
    }

    @GetMapping("/user/{userId}")
    public List<MLTeamRecommendation> getByRecommendedUserId(@PathVariable Long userId) {
        return service.getByRecommendedUserId(userId);
    }

    @PutMapping("/{id}")
    public MLTeamRecommendation update(@PathVariable UUID id,
                                       @RequestBody MLTeamRecommendation recommendation) {
        return service.update(id, recommendation);
    }

    @PatchMapping("/{id}/accept")
    public MLTeamRecommendation acceptRecommendation(@PathVariable UUID id,
                                                     @RequestBody Map<String, Object> body) {
        Long reviewerId = Long.parseLong((String) body.get("reviewerId"));
        return service.acceptRecommendation(id, reviewerId);
    }

    @PatchMapping("/{id}/reject")
    public MLTeamRecommendation rejectRecommendation(@PathVariable UUID id,
                                                     @RequestBody Map<String, Object> body) {
        Long reviewerId = Long.parseLong((String) body.get("reviewerId"));
        return service.rejectRecommendation(id, reviewerId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
