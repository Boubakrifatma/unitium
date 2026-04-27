package com.example.pi_projet.service.github;

import lombok.Getter;

@Getter
public class GithubApiException extends RuntimeException {

    private final int status;
    private final String responseBody;

    public GithubApiException(int status, String responseBody, Throwable cause) {
        super("GitHub API error " + status + ": " + responseBody, cause);
        this.status = status;
        this.responseBody = responseBody;
    }
}
