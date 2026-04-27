package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.github.CommitRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.User.RoleName;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.github.JGitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Local Git operations on a linked repo (commit / push / pull / history)
 * implemented with JGit. The repo is always referenced by its `linkId`.
 */
@Authorized
@RestController
@RequestMapping("/api/git/{linkId}")
@RequiredArgsConstructor
public class GitOpsController {

    private final JGitService jgit;

    @GetMapping("/status")
    public Map<String, Object> status(@PathVariable Long linkId) {
        return safe(() -> jgit.status(linkId));
    }

    @PostMapping("/commit")
    public Map<String, Object> commit(@PathVariable Long linkId,
                                      @Valid @RequestBody CommitRequest body,
                                      HttpServletRequest request) {
        User u = currentUser(request);
        denyReadOnly(u);
        return safe(() -> jgit.commit(linkId, u.getId(), body.message(),
                body.authorName(), body.authorEmail(),
                body.stageAll() == null || body.stageAll()));
    }

    @PostMapping("/push")
    public Map<String, Object> push(@PathVariable Long linkId, HttpServletRequest request) {
        User u = currentUser(request);
        denyReadOnly(u);
        return safe(() -> jgit.push(linkId, u.getId()));
    }

    @PostMapping("/pull")
    public Map<String, Object> pull(@PathVariable Long linkId, HttpServletRequest request) {
        User u = currentUser(request);
        denyReadOnly(u);
        return safe(() -> jgit.pull(linkId, u.getId()));
    }

    @GetMapping("/history")
    public List<Map<String, Object>> history(@PathVariable Long linkId,
                                             @RequestParam(defaultValue = "30") int limit) {
        return safe(() -> jgit.history(linkId, limit));
    }

    @GetMapping("/branches")
    public Map<String, Object> branches(@PathVariable Long linkId) {
        return safe(() -> jgit.branches(linkId));
    }

    @PostMapping("/checkout")
    public Map<String, Object> checkout(@PathVariable Long linkId,
                                        @RequestParam String branch,
                                        HttpServletRequest request) {
        denyReadOnly(currentUser(request));
        return safe(() -> jgit.checkout(linkId, branch));
    }

    // ---- helpers ------------------------------------------------------------

    private <T> T safe(java.util.function.Supplier<T> call) {
        try { return call.get(); }
        catch (IllegalArgumentException e) {
            throw new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, e.getMessage());
        }
    }

    private User currentUser(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u;
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }

    /** Blocks write operations for MANAGER and VIEWER roles. */
    private void denyReadOnly(User user) {
        if (user.getRole() == RoleName.MANAGER || user.getRole() == RoleName.VIEWER) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                    "Read-only access: managers cannot perform write operations (commit, push, pull, checkout).");
        }
    }
}
