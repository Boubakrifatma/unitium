package com.example.pi_projet.service.github;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around the GitHub REST v3 API. Always called with the user's
 * own Personal Access Token, so all calls are scoped to that user.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GithubApiClient {

    private static final String BASE = "https://api.github.com";
    private static final String API_VERSION = "2022-11-28";

    private final RestClient restClient = RestClient.builder()
            .baseUrl(BASE)
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", API_VERSION)
            .defaultHeader("User-Agent", "Unitum-Git-Module")
            .build();

    /** GET /user — used to validate the token and resolve login + avatar. */
    public JsonNode getAuthenticatedUser(String token) {
        return get(token, "/user", JsonNode.class);
    }

    /** GET /user/repos?per_page=100&sort=updated. */
    public JsonNode listMyRepos(String token, int perPage, int page) {
        return get(token,
                "/user/repos?per_page=" + perPage + "&page=" + page + "&sort=updated&affiliation=owner,collaborator,organization_member",
                JsonNode.class);
    }

    /** POST /user/repos. */
    public JsonNode createRepo(String token, String name, String description, boolean isPrivate, boolean autoInit) {
        return post(token, "/user/repos", Map.of(
                "name", name,
                "description", description == null ? "" : description,
                "private", isPrivate,
                "auto_init", autoInit
        ), JsonNode.class);
    }

    /** PUT /repos/{owner}/{repo}/collaborators/{username}?permission=push. */
    public JsonNode addCollaborator(String token, String owner, String repo, String username, String permission) {
        return put(token,
                "/repos/" + owner + "/" + repo + "/collaborators/" + username,
                Map.of("permission", permission),
                JsonNode.class);
    }

    public JsonNode listCollaborators(String token, String owner, String repo) {
        return get(token, "/repos/" + owner + "/" + repo + "/collaborators", JsonNode.class);
    }

    public void removeCollaborator(String token, String owner, String repo, String username) {
        delete(token, "/repos/" + owner + "/" + repo + "/collaborators/" + username);
    }

    public JsonNode listCommits(String token, String owner, String repo, int perPage) {
        return get(token, "/repos/" + owner + "/" + repo + "/commits?per_page=" + perPage, JsonNode.class);
    }

    // ---- HTTP plumbing ------------------------------------------------------

    private <T> T get(String token, String path, Class<T> type) {
        try {
            return restClient.get().uri(path)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(type);
        } catch (HttpClientErrorException e) {
            throw rethrow(e);
        }
    }

    private <T> T post(String token, String path, Object body, Class<T> type) {
        try {
            return restClient.post().uri(path)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(type);
        } catch (HttpClientErrorException e) {
            throw rethrow(e);
        }
    }

    private <T> T put(String token, String path, Object body, Class<T> type) {
        try {
            return restClient.put().uri(path)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(type);
        } catch (HttpClientErrorException e) {
            throw rethrow(e);
        }
    }

    private void delete(String token, String path) {
        try {
            restClient.delete().uri(path)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException e) {
            throw rethrow(e);
        }
    }

    private RuntimeException rethrow(HttpClientErrorException e) {
        HttpStatusCode status = e.getStatusCode();
        String body = e.getResponseBodyAsString();
        log.warn("[GitHub API] {} {}", status, body);
        return new GithubApiException(status.value(), body, e);
    }
}
