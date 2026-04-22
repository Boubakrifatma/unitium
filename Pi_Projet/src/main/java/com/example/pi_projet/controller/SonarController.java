package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.User.RoleName;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.SonarService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SonarQube dashboard endpoints — accessible to MANAGER, ADMIN, SUPER_ADMIN.
 * Read-only: never triggers a SonarQube analysis, only fetches existing results.
 */
@Authorized
@RestController
@RequestMapping("/api/manager/sonar")
@RequiredArgsConstructor
public class SonarController {

    private final SonarService sonar;

    /** GET /api/manager/sonar/projects — list all SonarQube projects */
    @GetMapping("/projects")
    public Map<String, Object> projects(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return safe(sonar::listProjects);
    }

    /**
     * GET /api/manager/sonar/metrics?projectKey=com.example:my-project
     * Returns bugs, vulnerabilities, code smells, coverage, duplications, LOC, ratings.
     */
    @GetMapping("/metrics")
    public Map<String, Object> metrics(@RequestParam String projectKey,
                                       HttpServletRequest request) {
        requireManagerOrAbove(request);
        return safe(() -> sonar.metrics(projectKey));
    }

    /**
     * GET /api/manager/sonar/gate?projectKey=com.example:my-project
     * Returns quality gate status (OK / ERROR) and each failing condition.
     */
    @GetMapping("/gate")
    public Map<String, Object> qualityGate(@RequestParam String projectKey,
                                           HttpServletRequest request) {
        requireManagerOrAbove(request);
        return safe(() -> sonar.qualityGate(projectKey));
    }

    /**
     * GET /api/manager/sonar/issues?projectKey=...&severities=BLOCKER,CRITICAL&pageSize=50
     * Returns open issues (unresolved) filtered by severity.
     */
    @GetMapping("/issues")
    public Map<String, Object> issues(@RequestParam String projectKey,
                                      @RequestParam(required = false) String severities,
                                      @RequestParam(defaultValue = "50") int pageSize,
                                      HttpServletRequest request) {
        requireManagerOrAbove(request);
        return safe(() -> sonar.issues(projectKey, severities, pageSize));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void requireManagerOrAbove(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (!(attr instanceof User user)) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
        }
        RoleName role = user.getRole();
        if (role != RoleName.MANAGER && role != RoleName.ADMIN && role != RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Manager role or above required to access SonarQube data.");
        }
    }

    private <T> T safe(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (IllegalStateException e) {
            throw new Module2Exception(Module2Exception.ErrorCode.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }
}
