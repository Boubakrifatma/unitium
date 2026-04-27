package com.example.pi_projet.service;

import com.example.pi_projet.exception.Module2Exception;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.VALIDATION;

@Service
@RequiredArgsConstructor
@Slf4j
public class M2PublicIntegrationService {

    private static final Pattern GITHUB_REPO_PATTERN = Pattern.compile("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$");

    private final RestTemplate restTemplate;

    @Value("${integrations.public.nager.base-url:https://date.nager.at}")
    private String nagerBaseUrl;

    @Value("${integrations.public.github.base-url:https://api.github.com}")
    private String githubBaseUrl;

    @Value("${integrations.public.github.token:}")
    private String githubToken;

    @Value("${integrations.public.openverse.base-url:https://api.openverse.engineering/v1}")
    private String openverseBaseUrl;

    @Value("${integrations.public.openalex.base-url:https://api.openalex.org}")
    private String openAlexBaseUrl;

    @Value("${integrations.public.openalex.contact-email:}")
    private String openAlexContactEmail;

    public Map<String, Object> getPublicHolidays(String countryCode, int year) {
        String safeCountry = normalizeCountryCode(countryCode);
        int safeYear = Math.max(2000, Math.min(2100, year));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", "Nager.Date");
        payload.put("providerUrl", trimTrailingSlash(nagerBaseUrl));
        payload.put("country", safeCountry);
        payload.put("year", safeYear);
        payload.put("generatedAt", Instant.now());

        String url = trimTrailingSlash(nagerBaseUrl) + "/api/v3/PublicHolidays/" + safeYear + "/" + safeCountry;
        try {
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);
            List<?> raw = response.getBody() == null ? List.of() : response.getBody();
            List<Map<String, Object>> items = new ArrayList<>();

            for (Object item : raw) {
                if (!(item instanceof Map<?, ?> row)) continue;
                Map<String, Object> normalized = new LinkedHashMap<>();
                normalized.put("date", row.get("date"));
                normalized.put("localName", row.get("localName"));
                normalized.put("name", row.get("name"));
                normalized.put("countryCode", row.get("countryCode"));
                normalized.put("global", row.get("global"));
                normalized.put("types", row.get("types"));
                items.add(normalized);
            }

            payload.put("providerStatus", "live");
            payload.put("count", items.size());
            payload.put("items", items);
            return payload;
        } catch (RestClientException ex) {
            log.warn("Nager.Date unavailable: {}", ex.getMessage());
            payload.put("providerStatus", "fallback");
            payload.put("warning", "Holiday provider is temporarily unavailable. Showing empty list.");
            payload.put("count", 0);
            payload.put("items", List.of());
            return payload;
        }
    }

    public Map<String, Object> getRepoInsights(String repoFullName) {
        if (!StringUtils.hasText(repoFullName) || !GITHUB_REPO_PATTERN.matcher(repoFullName.trim()).matches()) {
            throw new Module2Exception(VALIDATION, "repo must be formatted as owner/repository");
        }

        String safeRepo = repoFullName.trim();
        String base = trimTrailingSlash(githubBaseUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        if (StringUtils.hasText(githubToken)) {
            headers.setBearerAuth(githubToken.trim());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", "GitHub");
        payload.put("providerUrl", base);
        payload.put("repo", safeRepo);
        payload.put("generatedAt", Instant.now());

        try {
            ResponseEntity<Map> repoResponse = restTemplate.exchange(
                base + "/repos/" + safeRepo,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
            );

            Map<?, ?> repoData = repoResponse.getBody() == null ? Map.of() : repoResponse.getBody();

            ResponseEntity<Map> languagesResponse = restTemplate.exchange(
                base + "/repos/" + safeRepo + "/languages",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
            );

            ResponseEntity<List> contributorsResponse = restTemplate.exchange(
                base + "/repos/" + safeRepo + "/contributors?per_page=8&anon=true",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
            );

            ResponseEntity<List> commitsResponse = restTemplate.exchange(
                base + "/repos/" + safeRepo + "/commits?per_page=6",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
            );

            ResponseEntity<List> pullsResponse = restTemplate.exchange(
                base + "/repos/" + safeRepo + "/pulls?state=open&per_page=1",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
            );

            Map<String, Object> languages = new LinkedHashMap<>();
            if (languagesResponse.getBody() != null) {
                for (Object key : languagesResponse.getBody().keySet()) {
                    languages.put(String.valueOf(key), languagesResponse.getBody().get(key));
                }
            }

            String topLanguage = null;
            long topBytes = -1L;
            for (Map.Entry<String, Object> entry : languages.entrySet()) {
                long bytes = toLong(entry.getValue());
                if (bytes > topBytes) {
                    topBytes = bytes;
                    topLanguage = entry.getKey();
                }
            }

            List<Map<String, Object>> topContributors = normalizeContributors(contributorsResponse.getBody());
            List<Map<String, Object>> recentCommits = normalizeCommits(commitsResponse.getBody());
            long openPullRequests = resolveOpenPullRequestCount(pullsResponse);

            Instant now = Instant.now();
            Instant lastPushAt = parseInstant(repoData.get("pushed_at"));
            Long daysSinceLastPush = lastPushAt == null ? null : ChronoUnit.DAYS.between(lastPushAt, now);

            payload.put("providerStatus", "live");
            payload.put("name", repoData.get("name"));
            payload.put("description", repoData.get("description"));
            payload.put("homepage", repoData.get("homepage"));
            payload.put("visibility", repoData.get("visibility"));
            payload.put("defaultBranch", repoData.get("default_branch"));
            payload.put("stars", toLong(repoData.get("stargazers_count")));
            payload.put("forks", toLong(repoData.get("forks_count")));
            payload.put("watchers", toLong(repoData.get("subscribers_count")));
            payload.put("openIssues", toLong(repoData.get("open_issues_count")));
            payload.put("openPullRequests", openPullRequests);
            payload.put("lastPushAt", repoData.get("pushed_at"));
            payload.put("daysSinceLastPush", daysSinceLastPush);
            payload.put("topLanguage", topLanguage);
            payload.put("languages", languages);
            payload.put("topContributors", topContributors);
            payload.put("contributorsSampleCount", topContributors.size());
            payload.put("recentCommits", recentCommits);
            payload.put("htmlUrl", repoData.get("html_url"));
            return payload;
        } catch (RestClientException ex) {
            log.warn("GitHub insights unavailable for {}: {}", safeRepo, ex.getMessage());
            payload.put("providerStatus", "fallback");
            payload.put("warning", "GitHub provider unavailable or rate-limited. Try again later.");
            payload.put("stars", 0);
            payload.put("forks", 0);
            payload.put("watchers", 0);
            payload.put("openIssues", 0);
            payload.put("openPullRequests", 0);
            payload.put("topContributors", List.of());
            payload.put("contributorsSampleCount", 0);
            payload.put("recentCommits", List.of());
            payload.put("languages", Map.of());
            return payload;
        }
    }

    private List<Map<String, Object>> normalizeContributors(List<?> rawRows) {
        if (rawRows == null) return List.of();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object raw : rawRows) {
            if (!(raw instanceof Map<?, ?> row)) continue;
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("login", row.get("login"));
            out.put("contributions", toLong(row.get("contributions")));
            out.put("avatarUrl", row.get("avatar_url"));
            out.put("profileUrl", row.get("html_url"));
            out.put("type", row.get("type"));
            rows.add(out);
        }
        return rows;
    }

    private List<Map<String, Object>> normalizeCommits(List<?> rawRows) {
        if (rawRows == null) return List.of();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object raw : rawRows) {
            if (!(raw instanceof Map<?, ?> row)) continue;
            Map<?, ?> commit = row.get("commit") instanceof Map<?, ?> commitMap ? commitMap : Map.of();
            Map<?, ?> author = commit.get("author") instanceof Map<?, ?> authorMap ? authorMap : Map.of();
            Map<?, ?> committer = row.get("committer") instanceof Map<?, ?> committerMap ? committerMap : Map.of();

            String message = commit.get("message") == null ? null : String.valueOf(commit.get("message"));
            String title = message;
            if (title != null && title.contains("\n")) {
                title = title.substring(0, title.indexOf('\n')).trim();
            }

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("sha", row.get("sha"));
            out.put("title", title);
            out.put("message", message);
            out.put("authorName", author.get("name"));
            out.put("authorDate", author.get("date"));
            out.put("authorLogin", committer.get("login"));
            out.put("url", row.get("html_url"));
            rows.add(out);
        }
        return rows;
    }

    private long resolveOpenPullRequestCount(ResponseEntity<List> pullsResponse) {
        if (pullsResponse == null) return 0L;
        String linkHeader = pullsResponse.getHeaders().getFirst("Link");
        if (linkHeader != null && !linkHeader.isBlank()) {
            Long lastPage = extractLastPage(linkHeader);
            if (lastPage != null) {
                return Math.max(0L, lastPage);
            }
        }

        List<?> body = pullsResponse.getBody();
        return body == null ? 0L : body.size();
    }

    private Long extractLastPage(String linkHeader) {
        if (linkHeader == null || linkHeader.isBlank()) return null;
        // Example: <https://api.github.com/.../pulls?state=open&page=3>; rel="last"
        Pattern lastPattern = Pattern.compile("[?&]page=(\\d+)>;\\s*rel=\"last\"");
        Matcher matcher = lastPattern.matcher(linkHeader);
        if (!matcher.find()) return null;
        try {
            return Long.parseLong(matcher.group(1));
        } catch (Exception ignored) {
            return null;
        }
    }

    private Instant parseInstant(Object raw) {
        if (raw == null) return null;
        try {
            return Instant.parse(String.valueOf(raw));
        } catch (Exception ignored) {
            return null;
        }
    }

    public Map<String, Object> getTemplateCoverSuggestions(String query, int pageSize) {
        if (!StringUtils.hasText(query)) {
            throw new Module2Exception(VALIDATION, "q is required");
        }

        int safePageSize = Math.max(1, Math.min(pageSize, 24));
        String encodedQuery = UriUtils.encodeQueryParam(query.trim(), StandardCharsets.UTF_8);
        String url = trimTrailingSlash(openverseBaseUrl)
            + "/images/?q=" + encodedQuery
            + "&page_size=" + safePageSize
            + "&license_type=all";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", "Openverse");
        payload.put("providerUrl", trimTrailingSlash(openverseBaseUrl));
        payload.put("query", query.trim());
        payload.put("generatedAt", Instant.now());

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<?, ?> body = response.getBody() == null ? Map.of() : response.getBody();
            List<Map<String, Object>> items = new ArrayList<>();

            Object rawResults = body.get("results");
            if (rawResults instanceof List<?> results) {
                for (Object raw : results) {
                    if (!(raw instanceof Map<?, ?> row)) continue;

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", row.get("id"));
                    item.put("title", row.get("title"));
                    item.put("thumbnail", row.get("thumbnail"));
                    item.put("creator", row.get("creator"));
                    item.put("license", row.get("license"));
                    item.put("licenseVersion", row.get("license_version"));
                    item.put("provider", row.get("source"));
                    item.put("url", row.get("url"));
                    item.put("foreignLandingUrl", row.get("foreign_landing_url"));
                    items.add(item);
                }
            }

            payload.put("providerStatus", "live");
            payload.put("count", items.size());
            payload.put("items", items);
            return payload;
        } catch (RestClientException ex) {
            log.warn("Openverse unavailable: {}", ex.getMessage());
            payload.put("providerStatus", "fallback");
            payload.put("warning", "Cover suggestion provider unavailable. Showing empty list.");
            payload.put("count", 0);
            payload.put("items", List.of());
            return payload;
        }
    }

    public Map<String, Object> getAcademicSources(String query, int perPage) {
        if (!StringUtils.hasText(query)) {
            throw new Module2Exception(VALIDATION, "q is required");
        }

        int safePerPage = Math.max(1, Math.min(perPage, 20));
        String encodedQuery = UriUtils.encodeQueryParam(query.trim(), StandardCharsets.UTF_8);
        String url = trimTrailingSlash(openAlexBaseUrl)
            + "/works?search=" + encodedQuery
            + "&per-page=" + safePerPage;

        if (StringUtils.hasText(openAlexContactEmail)) {
            url += "&mailto=" + UriUtils.encodeQueryParam(openAlexContactEmail.trim(), StandardCharsets.UTF_8);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", "OpenAlex");
        payload.put("providerUrl", trimTrailingSlash(openAlexBaseUrl));
        payload.put("query", query.trim());
        payload.put("pageSize", safePerPage);
        payload.put("generatedAt", Instant.now());

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<?, ?> body = response.getBody() == null ? Map.of() : response.getBody();
            List<Map<String, Object>> items = new ArrayList<>();

            Object rawResults = body.get("results");
            if (rawResults instanceof List<?> results) {
                for (Object raw : results) {
                    if (!(raw instanceof Map<?, ?> row)) continue;

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", row.get("id"));
                    item.put("title", row.get("title"));
                    item.put("publicationYear", toNullableLong(row.get("publication_year")));
                    item.put("citedByCount", toNullableLong(row.get("cited_by_count")));

                    String openAccessUrl = null;
                    Object openAccessRaw = row.get("open_access");
                    if (openAccessRaw instanceof Map<?, ?> openAccess) {
                        Object oaUrl = openAccess.get("oa_url");
                        if (oaUrl != null) {
                            openAccessUrl = String.valueOf(oaUrl);
                        }
                    }
                    item.put("openAccessUrl", openAccessUrl);

                    String landingPageUrl = null;
                    Object primaryLocationRaw = row.get("primary_location");
                    if (primaryLocationRaw instanceof Map<?, ?> primaryLocation) {
                        Object landingUrl = primaryLocation.get("landing_page_url");
                        if (landingUrl != null) {
                            landingPageUrl = String.valueOf(landingUrl);
                        }
                    }
                    item.put("landingPageUrl", landingPageUrl);

                    String firstAuthor = null;
                    Object authorshipsRaw = row.get("authorships");
                    if (authorshipsRaw instanceof List<?> authorships && !authorships.isEmpty()) {
                        Object firstAuthorshipRaw = authorships.get(0);
                        if (firstAuthorshipRaw instanceof Map<?, ?> firstAuthorship) {
                            Object authorRaw = firstAuthorship.get("author");
                            if (authorRaw instanceof Map<?, ?> authorMap) {
                                Object displayName = authorMap.get("display_name");
                                if (displayName != null) {
                                    firstAuthor = String.valueOf(displayName);
                                }
                            }
                        }
                    }
                    item.put("firstAuthor", firstAuthor);

                    items.add(item);
                }
            }

            payload.put("providerStatus", "live");
            payload.put("count", items.size());
            payload.put("items", items);
            return payload;
        } catch (RestClientException ex) {
            log.warn("OpenAlex unavailable: {}", ex.getMessage());
            payload.put("providerStatus", "fallback");
            payload.put("warning", "Academic source provider is temporarily unavailable. Showing empty list.");
            payload.put("count", 0);
            payload.put("items", List.of());
            return payload;
        }
    }

    private String normalizeCountryCode(String countryCode) {
        if (!StringUtils.hasText(countryCode)) {
            return "TN";
        }
        String normalized = countryCode.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() != 2) {
            throw new Module2Exception(VALIDATION, "country must be a 2-letter ISO code");
        }
        return normalized;
    }

    private String trimTrailingSlash(String value) {
        if (value == null) return "";
        return value.replaceAll("/+$", "");
    }

    private long toLong(Object raw) {
        if (raw == null) return 0L;
        if (raw instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(raw.toString());
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private Long toNullableLong(Object raw) {
        if (raw == null) return null;
        if (raw instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(raw.toString());
        } catch (Exception ignored) {
            return null;
        }
    }
}
