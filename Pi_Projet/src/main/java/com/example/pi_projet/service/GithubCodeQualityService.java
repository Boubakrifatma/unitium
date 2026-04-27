package com.example.pi_projet.service;

import com.example.pi_projet.service.github.GithubApiClient;
import com.example.pi_projet.service.github.GithubCredentialService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches all .java files from a GitHub repo/branch via the GitHub API and
 * performs pattern-based static analysis (no local clone, no Maven required).
 *
 * Rules are modelled after real PMD / Checkstyle / SpotBugs checks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GithubCodeQualityService {

    private final GithubApiClient github;
    private final GithubCredentialService credentials;

    /** Maximum number of Java files to analyse (avoids rate-limit exhaustion). */
    private static final int MAX_FILES = 80;
    /** Skip files larger than 100 KB. */
    private static final long MAX_FILE_BYTES = 100_000;

    // ── Patterns ──────────────────────────────────────────────────────────────

    private static final Pattern RX_SYSOUT   = Pattern.compile("System\\.(out|err)\\.print");
    private static final Pattern RX_STACKTRACE = Pattern.compile("\\.printStackTrace\\(\\)");
    private static final Pattern RX_EMPTY_CATCH = Pattern.compile("catch\\s*\\([^)]+\\)\\s*\\{\\s*\\}");
    private static final Pattern RX_HARDCODED_IP = Pattern.compile("\"\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\"");
    private static final Pattern RX_MAGIC = Pattern.compile("(?<![\\w\".@])(?<![.])(-?(?:[2-9]\\d+|[1-9]\\d{2,}))(?![\\w.])");
    private static final Pattern RX_TODO   = Pattern.compile("//\\s*(TODO|FIXME|HACK|XXX)");
    private static final Pattern RX_STR_EQ = Pattern.compile("\"[^\"]+\"\\s*==|==\\s*\"[^\"]+\"");
    private static final Pattern RX_NO_BRACE = Pattern.compile("^\\s*(if|for|while)\\s*\\(.*\\)\\s*[^{;{\\s]");
    private static final Pattern RX_LONG_PARAMS = Pattern.compile("\\(([^)]*,){5,}[^)]*\\)");
    private static final Pattern RX_NPE_RISK = Pattern.compile("\\.(get|find|peek)\\(.*\\)\\.");

    // ── Public API ────────────────────────────────────────────────────────────

    public Map<String, Object> analyze(Long userId, String owner, String repo, String branch) {
        String token = credentials.getRawToken(userId);

        // 1. Resolve branch → commit SHA
        String treeSha = resolveBranchSha(token, owner, repo, branch);

        // 2. Get recursive file tree
        JsonNode treeNode = github.getFileTree(token, owner, repo, treeSha);
        JsonNode entries  = treeNode.path("tree");

        List<Map<String, Object>> violations = new ArrayList<>();
        int analysed = 0;
        int skipped  = 0;

        for (JsonNode entry : entries) {
            String entryPath = entry.path("path").asText();
            String type      = entry.path("type").asText();
            long   size      = entry.path("size").asLong();

            if (!"blob".equals(type))           continue;
            if (!entryPath.endsWith(".java"))    continue;
            if (size > MAX_FILE_BYTES)           { skipped++; continue; }
            if (analysed >= MAX_FILES)           { skipped++; continue; }

            try {
                JsonNode fileNode = github.getFileContent(token, owner, repo, entryPath, branch);
                String content    = decodeBase64(fileNode.path("content").asText(""));
                violations.addAll(analyzeFile(entryPath, content));
                analysed++;
            } catch (Exception e) {
                log.warn("Skipping {}: {}", entryPath, e.getMessage());
                skipped++;
            }
        }

        log.info("Quality analysis {}/{} @{}: {} files, {} violations", owner, repo, branch, analysed, violations.size());
        return buildResult(violations, analysed, skipped, owner, repo, branch);
    }

    // ── File-level analysis ───────────────────────────────────────────────────

    private List<Map<String, Object>> analyzeFile(String path, String content) {
        List<Map<String, Object>> results = new ArrayList<>();
        String[] lines = content.split("\n", -1);

        for (int i = 0; i < lines.length; i++) {
            String raw     = lines[i];
            String trimmed = raw.trim();
            int    lineNum = i + 1;

            // Skip pure comment lines for most checks
            boolean isComment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");

            if (!isComment) {
                // ── PMD ─────────────────────────────────────────────────────

                if (RX_SYSOUT.matcher(trimmed).find()) {
                    results.add(pmd(path, lineNum, "SystemPrintln", "Best Practices",
                            "Utiliser un logger (SLF4J) au lieu de System.out/err", "2"));
                }
                if (RX_STACKTRACE.matcher(trimmed).find()) {
                    results.add(pmd(path, lineNum, "AvoidPrintStackTrace", "Best Practices",
                            "Ne pas utiliser printStackTrace() — logger l'exception", "2"));
                }
                if (RX_EMPTY_CATCH.matcher(trimmed).find()) {
                    results.add(pmd(path, lineNum, "EmptyCatchBlock", "Error Prone",
                            "Bloc catch vide: l'exception est silencieusement ignorée", "1"));
                }
                if (RX_HARDCODED_IP.matcher(trimmed).find()) {
                    results.add(pmd(path, lineNum, "AvoidHardCodedIP", "Best Practices",
                            "Adresse IP codée en dur — externaliser dans la configuration", "2"));
                }
                if (!trimmed.startsWith("import") && !trimmed.contains("@")) {
                    Matcher m = RX_MAGIC.matcher(trimmed);
                    if (m.find()) {
                        results.add(pmd(path, lineNum, "MagicNumber", "Code Style",
                                "Nombre magique '" + m.group() + "' — définir une constante nommée", "3"));
                    }
                }
                if (RX_LONG_PARAMS.matcher(trimmed).find() && trimmed.contains(" ") && !trimmed.startsWith("@")) {
                    results.add(pmd(path, lineNum, "ExcessiveParameterList", "Design",
                            "Trop de paramètres (>5) — envisager un objet de paramètre ou un Builder", "3"));
                }

                // ── SpotBugs ─────────────────────────────────────────────────

                if (RX_STR_EQ.matcher(trimmed).find()) {
                    results.add(spotbugs(path, lineNum, "ES_COMPARING_STRINGS_WITH_EQ", "CORRECTNESS",
                            "1", "Comparaison de String avec == au lieu de .equals()"));
                }
                if (RX_NPE_RISK.matcher(trimmed).find()) {
                    results.add(spotbugs(path, lineNum, "NP_NULL_ON_SOME_PATH", "CORRECTNESS",
                            "2", "Possible NullPointerException: résultat non vérifié avant utilisation"));
                }
            }

            // ── TODO / FIXME (in comments too) ────────────────────────────
            if (RX_TODO.matcher(trimmed).find()) {
                String msg = trimmed.replaceAll("^//+\\s*", "").trim();
                results.add(pmd(path, lineNum, "TodoComment", "Documentation", msg, "4"));
            }

            // ── Checkstyle ────────────────────────────────────────────────

            if (raw.length() > 120) {
                results.add(checkstyle(path, lineNum, "warning", "LineLength",
                        "Ligne trop longue (" + raw.length() + " > 120 caractères)"));
            }
            if (!isComment && RX_NO_BRACE.matcher(raw).find()) {
                String kw = trimmed.split("\\s")[0];
                results.add(checkstyle(path, lineNum, "warning", "NeedBraces",
                        "Bloc '" + kw + "' sans accolades — risque de comportement inattendu"));
            }
        }

        // File-level checks
        if (lines.length > 500) {
            results.add(pmd(path, 1, "ExcessiveClassLength", "Design",
                    "Classe trop longue (" + lines.length + " lignes > 500) — envisager de la découper", "3"));
        }

        return results;
    }

    // ── Builders ──────────────────────────────────────────────────────────────

    private Map<String, Object> pmd(String file, int line, String rule, String ruleset,
                                    String message, String priority) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tool",     "pmd");
        m.put("file",     shortPath(file));
        m.put("line",     String.valueOf(line));
        m.put("rule",     rule);
        m.put("ruleset",  ruleset);
        m.put("message",  message);
        m.put("priority", priority);
        return m;
    }

    private Map<String, Object> checkstyle(String file, int line, String severity,
                                           String rule, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tool",     "checkstyle");
        m.put("file",     shortPath(file));
        m.put("line",     String.valueOf(line));
        m.put("severity", severity);
        m.put("rule",     rule);
        m.put("message",  message);
        return m;
    }

    private Map<String, Object> spotbugs(String file, int line, String type,
                                         String category, String priority, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tool",     "spotbugs");
        m.put("file",     shortPath(file));
        m.put("line",     String.valueOf(line));
        m.put("type",     type);
        m.put("category", category);
        m.put("priority", priority);
        m.put("message",  message);
        m.put("rank",     "1".equals(priority) ? "Haute" : "2".equals(priority) ? "Moyenne" : "Basse");
        return m;
    }

    private Map<String, Object> buildResult(List<Map<String, Object>> violations,
                                            int filesAnalyzed, int filesSkipped,
                                            String owner, String repo, String branch) {
        List<Map<String, Object>> pmd  = violations.stream().filter(v -> "pmd".equals(v.get("tool"))).toList();
        List<Map<String, Object>> cs   = violations.stream().filter(v -> "checkstyle".equals(v.get("tool"))).toList();
        List<Map<String, Object>> sb   = violations.stream().filter(v -> "spotbugs".equals(v.get("tool"))).toList();

        long p1   = pmd.stream().filter(v -> "1".equals(v.get("priority"))).count();
        long p2   = pmd.stream().filter(v -> "2".equals(v.get("priority"))).count();
        long errs = cs.stream().filter(v -> "error".equals(v.get("severity"))).count();
        long warn = cs.stream().filter(v -> "warning".equals(v.get("severity"))).count();
        long highB = sb.stream().filter(v -> "1".equals(v.get("priority"))).count();
        long secB  = sb.stream().filter(v -> "SECURITY".equals(v.get("category"))).count();

        int total = violations.size();
        String grade = computeGrade(total, filesAnalyzed);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("grade",         grade);
        summary.put("totalIssues",   total);
        summary.put("filesAnalyzed", filesAnalyzed);
        summary.put("filesSkipped",  filesSkipped);
        summary.put("repo",          owner + "/" + repo);
        summary.put("branch",        branch);
        summary.put("pmd", Map.of(
                "violations", pmd.size(),
                "priority1",  (int) p1,
                "priority2",  (int) p2));
        summary.put("checkstyle", Map.of(
                "errors",   (int) errs,
                "warnings", (int) warn,
                "total",    cs.size()));
        summary.put("spotbugs", Map.of(
                "bugs",     sb.size(),
                "high",     (int) highB,
                "medium",   (int) (sb.size() - highB),
                "security", (int) secB));
        summary.put("coverage", Map.of(
                "lineCoverage",   0,
                "branchCoverage", 0,
                "methodCoverage", 0,
                "lineCovered",    0,
                "lineTotal",      0,
                "branchCovered",  0,
                "branchTotal",    0,
                "error", "Couverture non disponible en analyse statique"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary",    summary);
        result.put("pmd",        pmd);
        result.put("checkstyle", cs);
        result.put("spotbugs",   sb);
        return result;
    }

    private String computeGrade(int total, int files) {
        if (files == 0) return "A";
        double ratio = (double) total / files;
        if (ratio <= 1)  return "A";
        if (ratio <= 3)  return "B";
        if (ratio <= 7)  return "C";
        if (ratio <= 12) return "D";
        return "E";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String resolveBranchSha(String token, String owner, String repo, String branch) {
        JsonNode branches = github.listBranches(token, owner, repo);
        for (JsonNode b : branches) {
            if (branch.equals(b.path("name").asText())) {
                return b.path("commit").path("sha").asText();
            }
        }
        throw new IllegalArgumentException("Branch '" + branch + "' not found in " + owner + "/" + repo);
    }

    private String shortPath(String fullPath) {
        String[] parts = fullPath.split("/");
        if (parts.length <= 2) return fullPath;
        return parts[parts.length - 2] + "/" + parts[parts.length - 1];
    }

    private String decodeBase64(String encoded) {
        String clean = encoded.replaceAll("\\s", "");
        if (clean.isEmpty()) return "";
        return new String(Base64.getDecoder().decode(clean), StandardCharsets.UTF_8);
    }
}
