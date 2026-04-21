package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.service.github.GitDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Authorized
@RestController
@RequestMapping("/api/git/dashboard")
@RequiredArgsConstructor
public class GitDashboardController {

    private final GitDashboardService dashboard;

    /**
     * GET /api/git/dashboard?projectId=&days=30
     * Returns aggregated commit stats for charts (activity-by-day, by-author, by-repo)
     * plus global KPIs.
     */
    @GetMapping
    public Map<String, Object> snapshot(
            @RequestParam(required = false) Long projectId,
            @RequestParam(defaultValue = "30") int days) {
        return dashboard.snapshot(projectId, Math.max(1, Math.min(days, 365)));
    }
}
