package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.DashboardAggregationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardAggregationService dashboardAggregationService;

    @GetMapping("/portfolio")
    public Map<String, Object> getPortfolio(@RequestParam(defaultValue = "20") int activityLimit,
                                            @RequestParam(defaultValue = "12") int milestoneLimit,
                                            @RequestParam(defaultValue = "3") int templateLimit,
                                            HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return dashboardAggregationService.buildPortfolio(currentUser, activityLimit, milestoneLimit, templateLimit);
    }

    @GetMapping("/projects/{projectId}/focus")
    public Map<String, Object> getProjectFocus(@PathVariable UUID projectId,
                                               @RequestParam(required = false) UUID workspaceId,
                                               HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);
        return dashboardAggregationService.buildProjectFocus(currentUser, workspaceId, projectId);
    }

    @GetMapping("/activity")
    public Map<String, Object> getActivity(@RequestParam(defaultValue = "30") int limit,
                                           HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("items", dashboardAggregationService.buildActivityFeed(currentUser, limit));
        return payload;
    }

    @GetMapping("/templates/top")
    public Map<String, Object> getTopTemplates(@RequestParam(defaultValue = "3") int limit,
                                               HttpServletRequest request) {
        User currentUser = requireCurrentUser(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("items", dashboardAggregationService.buildTopTemplates(limit));
        return payload;
    }

    private User requireCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof User currentUser)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Missing authenticated user context");
        }
        return currentUser;
    }
}
