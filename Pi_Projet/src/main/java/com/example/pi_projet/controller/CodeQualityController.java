package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.User.RoleName;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.CodeQualityService;
import com.example.pi_projet.service.GithubCodeQualityService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Code quality dashboard — no external token required.
 * Uses PMD, Checkstyle, SpotBugs and JaCoCo (all Maven plugins, offline).
 *
 * Read endpoints:  MANAGER, ADMIN, SUPER_ADMIN
 * Trigger analysis: ADMIN, SUPER_ADMIN only
 */
@Authorized
@RestController
@RequestMapping("/api/quality")
@RequiredArgsConstructor
public class CodeQualityController {

    private final CodeQualityService quality;
    private final GithubCodeQualityService githubQuality;

    /**
     * POST /api/quality/analyze
     * Triggers mvn analysis (takes ~1-2 min). Admin/SuperAdmin only.
     * After this, all GET endpoints return fresh data.
     */
    @PostMapping("/analyze")
    public Map<String, Object> analyze(HttpServletRequest request) {
        requireAdmin(request);
        return quality.runAnalysis();
    }

    /**
     * GET /api/quality/summary
     * Global dashboard: grade, total issues, coverage %.
     */
    @GetMapping("/summary")
    public Map<String, Object> summary(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return quality.summary();
    }

    /**
     * GET /api/quality/pmd
     * All PMD violations (code smells, errorprone, performance, security).
     */
    @GetMapping("/pmd")
    public List<Map<String, Object>> pmd(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return quality.pmdViolations();
    }

    /**
     * GET /api/quality/checkstyle
     * All Checkstyle style issues (Google Java Style Guide).
     */
    @GetMapping("/checkstyle")
    public List<Map<String, Object>> checkstyle(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return quality.checkstyleIssues();
    }

    /**
     * GET /api/quality/spotbugs
     * All SpotBugs detected bugs and security vulnerabilities.
     */
    @GetMapping("/spotbugs")
    public List<Map<String, Object>> spotbugs(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return quality.spotbugsIssues();
    }

    /**
     * GET /api/quality/coverage
     * JaCoCo test coverage: line, branch, method percentages.
     */
    @GetMapping("/coverage")
    public Map<String, Object> coverage(HttpServletRequest request) {
        requireManagerOrAbove(request);
        return quality.coverageSummary();
    }

    /**
     * POST /api/quality/analyze-repo?owner=&repo=&branch=
     * Fetches all .java files from the given GitHub repo/branch via GitHub API
     * and runs pattern-based static analysis (PMD + Checkstyle + SpotBugs rules).
     * No local clone or Maven required.
     */
    @PostMapping("/analyze-repo")
    public Map<String, Object> analyzeRepo(@RequestParam String owner,
                                           @RequestParam String repo,
                                           @RequestParam(defaultValue = "main") String branch,
                                           HttpServletRequest request) {
        requireManagerOrAbove(request);
        Long userId = currentUser(request).getId();
        return githubQuality.analyze(userId, owner, repo, branch);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private User currentUser(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u;
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }

    private void requireManagerOrAbove(HttpServletRequest request) {
        RoleName role = currentUser(request).getRole();
        if (role != RoleName.MANAGER && role != RoleName.ADMIN && role != RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Manager role required.");
        }
    }

    private void requireAdmin(HttpServletRequest request) {
        RoleName role = currentUser(request).getRole();
        if (role != RoleName.ADMIN && role != RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Admin role required to trigger analysis.");
        }
    }
}
