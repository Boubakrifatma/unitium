package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.MilestoneRiskDto;
import com.example.pi_projet.dto.ProjectAnalyticsDto;
import com.example.pi_projet.dto.WhatIfResultDto;
import com.example.pi_projet.service.ProjectAnalyticsService;
import com.example.pi_projet.service.SmartMilestoneService;
import com.example.pi_projet.service.WhatIfSimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Executive analytics & smart milestone endpoints.
 *
 * GET  /api/analytics/project/{projectId}          — project KPIs
 * GET  /api/analytics/workspace/{workspaceId}      — all projects in workspace
 * GET  /api/analytics/milestone/{milestoneId}/risk — risk analysis for one milestone
 * POST /api/analytics/milestone/{milestoneId}/recalculate — trigger recalc
 * POST /api/analytics/project/{projectId}/recalculate     — trigger recalc all milestones
 * POST /api/analytics/whatif                       — what-if simulation
 */
@Authorized
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class ProjectAnalyticsController {

    private final ProjectAnalyticsService analyticsService;
    private final SmartMilestoneService   smartService;
    private final WhatIfSimulationService whatIfService;

    // ── Dashboard ─────────────────────────────────────────────────────────

    @GetMapping("/project/{projectId}")
    public ProjectAnalyticsDto projectAnalytics(@PathVariable String projectId) {
        return analyticsService.getProjectAnalytics(toUUID(projectId));
    }

    @GetMapping("/workspace/{workspaceId}")
    public List<ProjectAnalyticsDto> workspaceAnalytics(@PathVariable String workspaceId) {
        return analyticsService.getWorkspaceAnalytics(toUUID(workspaceId));
    }

    // ── Smart Milestone ───────────────────────────────────────────────────

    @GetMapping("/milestone/{milestoneId}/risk")
    public MilestoneRiskDto milestoneRisk(@PathVariable Long milestoneId) {
        return smartService.analyse(milestoneId);
    }

    @PostMapping("/milestone/{milestoneId}/recalculate")
    public MilestoneRiskDto recalculateMilestone(@PathVariable Long milestoneId) {
        smartService.recalculateOnTaskChange(milestoneId);
        return smartService.analyse(milestoneId);
    }

    @PostMapping("/project/{projectId}/recalculate")
    public List<MilestoneRiskDto> recalculateProject(@PathVariable String projectId) {
        return smartService.recalculateForProject(toUUID(projectId));
    }

    // ── What-If ───────────────────────────────────────────────────────────

    /**
     * Body: { "taskId": 42, "delayDays": 5 }
     */
    @PostMapping("/whatif")
    public WhatIfResultDto simulate(@RequestBody Map<String, Object> body) {
        Long taskId    = Long.valueOf(body.get("taskId").toString());
        int delayDays  = Integer.parseInt(body.get("delayDays").toString());
        return whatIfService.simulate(taskId, delayDays);
    }

    // ── Helper ────────────────────────────────────────────────────────────

    private UUID toUUID(String id) {
        try {
            if (id.length() == 32) {
                id = id.replaceFirst(
                        "(\\w{8})(\\w{4})(\\w{4})(\\w{4})(\\w{12})", "$1-$2-$3-$4-$5");
            }
            return UUID.fromString(id);
        } catch (Exception e) {
            throw new RuntimeException("Invalid UUID: " + id);
        }
    }
}
