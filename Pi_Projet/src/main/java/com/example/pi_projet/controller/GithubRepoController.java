package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.github.CreateRepoRequest;
import com.example.pi_projet.dto.github.InviteCollaboratorRequest;
import com.example.pi_projet.dto.github.LinkRepoRequest;
import com.example.pi_projet.entity.GitRepoLink;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.GitRepoLinkRepository;
import com.example.pi_projet.service.github.GithubApiClient;
import com.example.pi_projet.service.github.GithubApiException;
import com.example.pi_projet.service.github.GithubCredentialService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Authorized
@RestController
@RequestMapping("/api/github/repos")
@RequiredArgsConstructor
public class GithubRepoController {

    private final GithubCredentialService credentials;
    private final GithubApiClient github;
    private final GitRepoLinkRepository repoLinks;

    /** GET /api/github/repos?page=1 — list the user's GitHub repositories. */
    @GetMapping
    public JsonNode listMyRepos(@RequestParam(defaultValue = "1") int page,
                                @RequestParam(defaultValue = "100") int perPage,
                                HttpServletRequest request) {
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.listMyRepos(token, perPage, page));
    }

    /** POST /api/github/repos — create a new repo on GitHub. */
    @PostMapping
    public JsonNode createRepo(@Valid @RequestBody CreateRepoRequest body, HttpServletRequest request) {
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.createRepo(token, body.name(), body.description(), body.isPrivate(), body.autoInit()));
    }

    /** POST /api/github/repos/link — link a GitHub repo (projectId is optional for employees/students). */
    @PostMapping("/link")
    public GitRepoLink linkRepo(@Valid @RequestBody LinkRepoRequest body, HttpServletRequest request) {
        Long userId = currentUserId(request);

        // Idempotent lookup: when projectId is provided check (project, owner, repo);
        // otherwise check (user, owner, repo) so employees can link without a project.
        GitRepoLink link;
        if (body.projectId() != null) {
            link = repoLinks
                    .findByProjectIdAndOwnerAndRepoName(body.projectId(), body.owner(), body.repoName())
                    .orElseGet(() -> GitRepoLink.builder()
                            .projectId(body.projectId())
                            .owner(body.owner())
                            .repoName(body.repoName())
                            .linkedByUserId(userId)
                            .build());
        } else {
            link = repoLinks
                    .findByLinkedByUserIdAndOwnerAndRepoName(userId, body.owner(), body.repoName())
                    .orElseGet(() -> GitRepoLink.builder()
                            .projectId(null)
                            .owner(body.owner())
                            .repoName(body.repoName())
                            .linkedByUserId(userId)
                            .build());
        }
        link.setLocalPath(body.localPath());
        link.setDefaultBranch(body.defaultBranch());
        return repoLinks.save(link);
    }

    /** GET /api/github/repos/links?projectId=... — list links (optionally filtered by project). */
    @GetMapping("/links")
    public List<GitRepoLink> listLinks(@RequestParam(required = false) Long projectId) {
        return projectId != null ? repoLinks.findByProjectId(projectId) : repoLinks.findAll();
    }

    @DeleteMapping("/link/{linkId}")
    public void unlinkRepo(@PathVariable Long linkId) {
        repoLinks.deleteById(linkId);
    }

    /** GET /api/github/repos/{owner}/{name}/collaborators. */
    @GetMapping("/{owner}/{name}/collaborators")
    public JsonNode listCollaborators(@PathVariable String owner, @PathVariable String name,
                                      HttpServletRequest request) {
        String token = credentials.getRawToken(currentUserId(request));
        return safe(() -> github.listCollaborators(token, owner, name));
    }

    /** PUT /api/github/repos/{owner}/{name}/collaborators — invite a user. */
    @PutMapping("/{owner}/{name}/collaborators")
    public JsonNode inviteCollaborator(@PathVariable String owner, @PathVariable String name,
                                       @Valid @RequestBody InviteCollaboratorRequest body,
                                       HttpServletRequest request) {
        String token = credentials.getRawToken(currentUserId(request));
        String perm = body.permission() == null ? "push" : body.permission();
        return safe(() -> github.addCollaborator(token, owner, name, body.username(), perm));
    }

    @DeleteMapping("/{owner}/{name}/collaborators/{username}")
    public void removeCollaborator(@PathVariable String owner, @PathVariable String name,
                                   @PathVariable String username, HttpServletRequest request) {
        String token = credentials.getRawToken(currentUserId(request));
        try {
            github.removeCollaborator(token, owner, name, username);
        } catch (GithubApiException e) {
            throw mapApi(e);
        }
    }

    // ---- helpers ------------------------------------------------------------

    private <T> T safe(java.util.function.Supplier<T> call) {
        try { return call.get(); }
        catch (GithubApiException e) { throw mapApi(e); }
    }

    private Module2Exception mapApi(GithubApiException e) {
        Module2Exception.ErrorCode code = switch (e.getStatus()) {
            case 401, 403 -> Module2Exception.ErrorCode.FORBIDDEN;
            case 404 -> Module2Exception.ErrorCode.NOT_FOUND;
            case 422 -> Module2Exception.ErrorCode.VALIDATION;
            default -> Module2Exception.ErrorCode.SERVICE_UNAVAILABLE;
        };
        return new Module2Exception(code, "GitHub: " + e.getResponseBody());
    }

    private Long currentUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u.getId();
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }
}
