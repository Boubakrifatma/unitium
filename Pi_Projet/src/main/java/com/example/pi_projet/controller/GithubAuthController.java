package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.github.GithubTokenStatus;
import com.example.pi_projet.dto.github.SaveGithubTokenRequest;
import com.example.pi_projet.entity.GithubCredential;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.service.github.GithubCredentialService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Authorized
@RestController
@RequestMapping("/api/github/auth")
@RequiredArgsConstructor
public class GithubAuthController {

    private final GithubCredentialService credentials;

    /**
     * POST /api/github/auth/save-token — validates the token against GitHub,
     * encrypts it and persists it for the current user.
     */
    @PostMapping("/save-token")
    public GithubTokenStatus saveToken(@Valid @RequestBody SaveGithubTokenRequest body,
                                       HttpServletRequest request) {
        Long userId = currentUserId(request);
        try {
            GithubCredential c = credentials.saveOrUpdateToken(userId, body.token());
            return new GithubTokenStatus(true, c.getGithubLogin(), c.getGithubAvatarUrl(), c.getTokenHint());
        } catch (IllegalArgumentException e) {
            throw new Module2Exception(Module2Exception.ErrorCode.VALIDATION, e.getMessage());
        }
    }

    /** GET /api/github/auth/check-token — returns whether the user has a token. */
    @GetMapping("/check-token")
    public GithubTokenStatus checkToken(HttpServletRequest request) {
        Long userId = currentUserId(request);
        return credentials.getCredential(userId)
                .map(c -> new GithubTokenStatus(true, c.getGithubLogin(), c.getGithubAvatarUrl(), c.getTokenHint()))
                .orElseGet(GithubTokenStatus::missing);
    }

    /** DELETE /api/github/auth/token — removes the stored token. */
    @DeleteMapping("/token")
    public void deleteToken(HttpServletRequest request) {
        credentials.deleteToken(currentUserId(request));
    }

    private Long currentUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("currentUser");
        if (attr instanceof User u) return u.getId();
        throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN, "Authentication required");
    }
}
