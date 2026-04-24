package com.example.pi_projet.dto.github;

public record GithubTokenStatus(
        boolean configured,
        String githubLogin,
        String githubAvatarUrl,
        String tokenHint
) {
    public static GithubTokenStatus missing() {
        return new GithubTokenStatus(false, null, null, null);
    }
}
