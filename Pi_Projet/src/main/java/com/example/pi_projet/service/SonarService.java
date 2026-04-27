package com.example.pi_projet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Calls the SonarQube REST API to fetch code quality metrics.
 * All calls are read-only — this service never modifies SonarQube state.
 *
 * Configuration (application.properties):
 *   sonar.host.url=http://localhost:9000
 *   sonar.token=sqa_xxxxxxxxxxxxxxxxxxxx
 */
@Slf4j
@Service
public class SonarService {

    private static final String METRICS =
            "bugs,vulnerabilities,code_smells,coverage," +
            "duplicated_lines_density,ncloc,sqale_index,sqale_rating," +
            "reliability_rating,security_rating,alert_status";

    @Value("${sonar.host.url:http://localhost:9000}")
    private String sonarUrl;

    @Value("${sonar.token:}")
    private String sonarToken;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper;

    public SonarService(RestTemplate restTemplate, ObjectMapper mapper) {
        this.restTemplate = restTemplate;
        this.mapper = mapper;
    }

    /**
     * Returns a summary of all key metrics for a SonarQube project.
     * projectKey is the key configured in sonar-project.properties.
     */
    public Map<String, Object> metrics(String projectKey) {
        String url = sonarUrl + "/api/measures/component"
                + "?component=" + projectKey
                + "&metricKeys=" + METRICS;

        JsonNode root = call(url);
        JsonNode measures = root.path("component").path("measures");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectKey", projectKey);

        for (JsonNode m : measures) {
            String key = m.path("metric").asText();
            String value = m.path("value").asText(null);
            result.put(key, value);
        }
        return result;
    }

    /**
     * Returns the quality gate status (OK / ERROR) and each condition result.
     */
    public Map<String, Object> qualityGate(String projectKey) {
        String url = sonarUrl + "/api/qualitygates/project_status?projectKey=" + projectKey;
        JsonNode root = call(url);
        JsonNode ps = root.path("projectStatus");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", ps.path("status").asText());

        List<Map<String, Object>> conditions = new ArrayList<>();
        for (JsonNode c : ps.path("conditions")) {
            conditions.add(Map.of(
                    "metric", c.path("metricKey").asText(),
                    "status", c.path("status").asText(),
                    "actual", c.path("actualValue").asText(""),
                    "threshold", c.path("errorThreshold").asText("")
            ));
        }
        result.put("conditions", conditions);
        return result;
    }

    /**
     * Returns open issues filtered by severity.
     * severities: BLOCKER, CRITICAL, MAJOR, MINOR, INFO (comma-separated, or null for all)
     */
    public Map<String, Object> issues(String projectKey, String severities, int pageSize) {
        StringBuilder url = new StringBuilder(sonarUrl)
                .append("/api/issues/search?componentKeys=").append(projectKey)
                .append("&resolved=false")
                .append("&ps=").append(Math.min(pageSize, 500));
        if (severities != null && !severities.isBlank()) {
            url.append("&severities=").append(severities);
        }

        JsonNode root = call(url.toString());

        List<Map<String, Object>> issues = new ArrayList<>();
        for (JsonNode issue : root.path("issues")) {
            issues.add(Map.of(
                    "key", issue.path("key").asText(),
                    "type", issue.path("type").asText(),
                    "severity", issue.path("severity").asText(),
                    "message", issue.path("message").asText(),
                    "component", issue.path("component").asText(),
                    "line", issue.path("line").asInt(0),
                    "effort", issue.path("effort").asText(""),
                    "creationDate", issue.path("creationDate").asText("")
            ));
        }
        return Map.of(
                "total", root.path("total").asInt(),
                "issues", issues
        );
    }

    /**
     * Returns all SonarQube projects visible with the configured token.
     */
    public Map<String, Object> listProjects() {
        String url = sonarUrl + "/api/components/search?qualifiers=TRK&ps=100";
        JsonNode root = call(url);

        List<Map<String, Object>> projects = new ArrayList<>();
        for (JsonNode c : root.path("components")) {
            projects.add(Map.of(
                    "key", c.path("key").asText(),
                    "name", c.path("name").asText(),
                    "qualifier", c.path("qualifier").asText()
            ));
        }
        return Map.of(
                "total", root.path("paging").path("total").asInt(),
                "projects", projects
        );
    }

    // ── HTTP helper ───────────────────────────────────────────────────────────

    private JsonNode call(String url) {
        HttpHeaders headers = new HttpHeaders();
        if (sonarToken != null && !sonarToken.isBlank()) {
            // SonarQube token auth: token as username, empty password
            String creds = sonarToken + ":";
            String encoded = Base64.getEncoder().encodeToString(creds.getBytes());
            headers.set("Authorization", "Basic " + encoded);
        }
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<String> response =
                    restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            return mapper.readTree(response.getBody());
        } catch (Exception e) {
            log.warn("[SonarQube] Call failed: {} — {}", url, e.getMessage());
            throw new IllegalStateException("SonarQube unreachable: " + e.getMessage(), e);
        }
    }
}
