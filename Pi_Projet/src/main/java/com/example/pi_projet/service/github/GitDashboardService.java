package com.example.pi_projet.service.github;

import com.example.pi_projet.entity.GitRepoLink;
import com.example.pi_projet.repository.GitRepoLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.revwalk.RevCommit;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Aggregates commit data across all linked repos for the dashboard charts:
 *   - activity-over-time (commits per day, last N days)
 *   - contributions-pie (commits per author)
 *   - per-repo-bar (commits per repo)
 *   - global KPIs (totals, most active user)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitDashboardService {

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final GitRepoLinkRepository linkRepo;

    public Map<String, Object> snapshot(Long projectId, int days) {
        List<GitRepoLink> links = projectId != null
                ? linkRepo.findByProjectId(projectId)
                : linkRepo.findAll();

        Map<String, Integer> perDay = new TreeMap<>();
        Map<String, Integer> perAuthor = new HashMap<>();
        Map<String, Integer> perRepo = new HashMap<>();
        long totalCommits = 0;

        Instant cutoff = Instant.now().minusSeconds(days * 86400L);

        for (GitRepoLink link : links) {
            if (link.getLocalPath() == null || link.getLocalPath().isBlank()) continue;
            File dir = new File(link.getLocalPath());
            if (!dir.isDirectory()) continue;

            try (Git git = Git.open(dir)) {
                int repoCount = 0;
                for (RevCommit c : git.log().all().call()) {
                    Instant date = Instant.ofEpochSecond(c.getCommitTime());
                    if (date.isBefore(cutoff)) continue;
                    repoCount++;
                    totalCommits++;

                    String day = LocalDate.ofInstant(date, ZoneId.systemDefault()).format(DAY_FMT);
                    perDay.merge(day, 1, Integer::sum);

                    String author = c.getAuthorIdent().getName();
                    perAuthor.merge(author, 1, Integer::sum);
                }
                perRepo.put(link.fullName(), repoCount);
            } catch (IOException | GitAPIException e) {
                log.warn("[Dashboard] Skipping {}: {}", link.fullName(), e.getMessage());
            }
        }

        // Fill missing days with 0 so the chart x-axis is continuous.
        Map<String, Integer> filledDaily = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = days - 1; i >= 0; i--) {
            String d = today.minusDays(i).format(DAY_FMT);
            filledDaily.put(d, perDay.getOrDefault(d, 0));
        }

        String mostActive = perAuthor.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("repoCount", links.size());
        result.put("totalCommits", totalCommits);
        result.put("contributorCount", perAuthor.size());
        result.put("mostActiveAuthor", mostActive);
        result.put("activityByDay", filledDaily);
        result.put("commitsByAuthor", perAuthor);
        result.put("commitsByRepo", perRepo);
        return result;
    }
}
