package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.github.GithubApiClient;
import com.example.pi_projet.service.github.GithubApiException;
import com.example.pi_projet.service.github.GithubCredentialService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Read-only code browser for MANAGER role.
 * Managers can view repos, branches, file trees and file content.
 * All write operations (push, commit, pull) are blocked at the role level.
 */
@Authorized
@RestController
@RequestMapping("/api/manager/code")
@RequiredArgsConstructor
public class ManagerCodeViewController {

    private final GithubCredentialService credentials;
    private final GithubApiClient github;

    /** GET /api/manager/code/repos — list all repos (public + private) */
    @GetMapping("/repos")
    public JsonNode listRepos(@RequestParam(defaultValue = "100") int perPage,
                              @RequestParam(defaultValue = "1") int page,
                              HttpServletRequest request) {
        requireManager(request);
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.listMyRepos(token, perPage, page));
    }

    /** GET /api/manager/code/repos/{owner}/{repo}/branches */
    @GetMapping("/repos/{owner}/{repo}/branches")
    public JsonNode listBranches(@PathVariable String owner,
                                 @PathVariable String repo,
                                 HttpServletRequest request) {
        requireManager(request);
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.listBranches(token, owner, repo));
    }

    /**
     * GET /api/manager/code/repos/{owner}/{repo}/tree?ref=main&treeSha=abc123
     * treeSha is the commit SHA or tree SHA to browse.
     */
    @GetMapping("/repos/{owner}/{repo}/tree")
    public JsonNode fileTree(@PathVariable String owner,
                             @PathVariable String repo,
                             @RequestParam String treeSha,
                             HttpServletRequest request) {
        requireManager(request);
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.getFileTree(token, owner, repo, treeSha));
    }

    /**
     * GET /api/manager/code/repos/{owner}/{repo}/contents?path=src&ref=main
     * Returns directory listing (array) OR decoded file content (object).
     * path="" means repo root.
     */
    @GetMapping("/repos/{owner}/{repo}/contents")
    public Object contents(@PathVariable String owner,
                           @PathVariable String repo,
                           @RequestParam(defaultValue = "") String path,
                           @RequestParam(defaultValue = "main") String ref,
                           HttpServletRequest request) {
        requireManager(request);
        String token = credentials.getRawToken(currentUserId(request));
        JsonNode node = safe(() -> github.getFileContent(token, owner, repo, path, ref));

        // Directory listing — GitHub returns a JSON array
        if (node.isArray()) {
            List<Map<String, Object>> entries = new ArrayList<>();
            for (JsonNode item : node) {
                entries.add(Map.of(
                        "name",    item.path("name").asText(),
                        "path",    item.path("path").asText(),
                        "type",    item.path("type").asText(),   // "file" | "dir"
                        "size",    item.path("size").asLong(),
                        "sha",     item.path("sha").asText(),
                        "htmlUrl", item.path("html_url").asText()
                ));
            }
            // Sort: dirs first, then files alphabetically
            entries.sort(Comparator
                    .comparing((Map<String, Object> e) -> "dir".equals(e.get("type")) ? 0 : 1)
                    .thenComparing(e -> (String) e.get("name")));
            return entries;
        }

        // File — decode base64 content
        String encoding = node.path("encoding").asText("base64");
        String raw = node.path("content").asText("").replaceAll("\\s", "");
        String decoded = "base64".equals(encoding)
                ? new String(Base64.getDecoder().decode(raw), StandardCharsets.UTF_8)
                : raw;

        return Map.of(
                "type",    "file",
                "path",    node.path("path").asText(),
                "name",    node.path("name").asText(),
                "size",    node.path("size").asLong(),
                "sha",     node.path("sha").asText(),
                "content", decoded,
                "htmlUrl", node.path("html_url").asText()
        );
    }

    /**
     * GET /api/manager/code/repos/{owner}/{repo}/commits?ref=main&limit=30
     * Commit history on a specific branch.
     */
    @GetMapping("/repos/{owner}/{repo}/commits")
    public JsonNode commits(@PathVariable String owner,
                            @PathVariable String repo,
                            @RequestParam(defaultValue = "main") String ref,
                            @RequestParam(defaultValue = "30") int limit,
                            HttpServletRequest request) {
        requireManager(request);
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.listCommitsOnRef(token, owner, repo, ref, Math.min(limit, 100)));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void requireManager(HttpServletRequest request) {
        User user = currentUser(request);
        if (user.getRole() != User.RoleName.MANAGER
                && user.getRole() != User.RoleName.TUTOR
                && user.getRole() != User.RoleName.ADMIN
                && user.getRole() != User.RoleName.SUPER_ADMIN) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Manager role required to access this resource.");
        }
    }

    private User currentUser(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u;
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }

    private Long currentUserId(HttpServletRequest request) {
        return currentUser(request).getId();
    }

    private <T> T safe(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (GithubApiException e) {
            Module2Exception.ErrorCode code = switch (e.getStatus()) {
                case 401, 403 -> Module2Exception.ErrorCode.FORBIDDEN;
                case 404 -> Module2Exception.ErrorCode.NOT_FOUND;
                default -> Module2Exception.ErrorCode.SERVICE_UNAVAILABLE;
            };
            throw new Module2Exception(code, "GitHub: " + e.getResponseBody());
        }
    }
}
