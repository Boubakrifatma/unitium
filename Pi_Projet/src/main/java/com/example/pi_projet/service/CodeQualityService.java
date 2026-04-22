package com.example.pi_projet.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.w3c.dom.*;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Runs PMD, Checkstyle, SpotBugs and JaCoCo via Maven (no token needed)
 * and parses their XML reports to expose code quality data.
 *
 * Configuration:
 *   quality.project.path=/absolute/path/to/Pi_Projet
 */
@Slf4j
@Service
public class CodeQualityService {

    @Value("${quality.project.path:${user.dir}}")
    private String projectPath;

    // ── Trigger analysis ─────────────────────────────────────────────────────

    /**
     * Runs: mvn pmd:pmd checkstyle:checkstyle spotbugs:spotbugs jacoco:report -DskipTests
     * Returns exit code and stdout tail (last 40 lines).
     */
    public Map<String, Object> runAnalysis() {
        List<String> cmd = List.of(
                isWindows() ? "mvn.cmd" : "mvn",
                "pmd:pmd", "checkstyle:checkstyle", "spotbugs:spotbugs",
                "jacoco:report", "-DskipTests", "-q"
        );
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.directory(new File(projectPath));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            int exitCode = finished ? process.exitValue() : -1;

            if (!finished) process.destroyForcibly();

            List<String> lines = Arrays.asList(output.split("\n"));
            List<String> tail = lines.subList(Math.max(0, lines.size() - 40), lines.size());

            return Map.of(
                    "exitCode", exitCode,
                    "success", exitCode == 0,
                    "output", String.join("\n", tail)
            );
        } catch (Exception e) {
            log.error("Maven analysis failed", e);
            return Map.of("exitCode", -1, "success", false, "output", e.getMessage());
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    public Map<String, Object> summary() {
        Map<String, Object> pmd = pmdSummary();
        Map<String, Object> cs = checkstyeSummary();
        Map<String, Object> sb = spotbugsSummary();
        Map<String, Object> cov = coverageSummary();

        int totalIssues = (int) pmd.getOrDefault("violations", 0)
                + (int) cs.getOrDefault("errors", 0)
                + (int) sb.getOrDefault("bugs", 0);

        String grade = grade(totalIssues, (double) cov.getOrDefault("lineCoverage", 0.0));

        return Map.of(
                "grade", grade,
                "totalIssues", totalIssues,
                "pmd", pmd,
                "checkstyle", cs,
                "spotbugs", sb,
                "coverage", cov
        );
    }

    // ── PMD ──────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> pmdViolations() {
        File xml = new File(projectPath, "target/pmd.xml");
        if (!xml.exists()) return List.of(Map.of("error", "Run analysis first (target/pmd.xml not found)"));

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Document doc = parse(xml);
            NodeList files = doc.getElementsByTagName("file");
            for (int i = 0; i < files.getLength(); i++) {
                Element file = (Element) files.item(i);
                String fileName = shortPath(file.getAttribute("name"));
                NodeList violations = file.getElementsByTagName("violation");
                for (int j = 0; j < violations.getLength(); j++) {
                    Element v = (Element) violations.item(j);
                    result.add(Map.of(
                            "file", fileName,
                            "line", v.getAttribute("beginline"),
                            "rule", v.getAttribute("rule"),
                            "ruleset", v.getAttribute("ruleset"),
                            "priority", v.getAttribute("priority"),
                            "message", v.getTextContent().trim()
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse PMD report", e);
        }
        return result;
    }

    private Map<String, Object> pmdSummary() {
        List<Map<String, Object>> v = pmdViolations();
        long p1 = v.stream().filter(m -> "1".equals(m.get("priority"))).count();
        long p2 = v.stream().filter(m -> "2".equals(m.get("priority"))).count();
        return Map.of("violations", v.size(), "priority1", p1, "priority2", p2);
    }

    // ── Checkstyle ───────────────────────────────────────────────────────────

    public List<Map<String, Object>> checkstyleIssues() {
        File xml = new File(projectPath, "target/checkstyle-result.xml");
        if (!xml.exists()) return List.of(Map.of("error", "Run analysis first (target/checkstyle-result.xml not found)"));

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Document doc = parse(xml);
            NodeList files = doc.getElementsByTagName("file");
            for (int i = 0; i < files.getLength(); i++) {
                Element file = (Element) files.item(i);
                String fileName = shortPath(file.getAttribute("name"));
                NodeList errors = file.getElementsByTagName("error");
                for (int j = 0; j < errors.getLength(); j++) {
                    Element e = (Element) errors.item(j);
                    result.add(Map.of(
                            "file", fileName,
                            "line", e.getAttribute("line"),
                            "severity", e.getAttribute("severity"),
                            "message", e.getAttribute("message"),
                            "rule", shortRule(e.getAttribute("source"))
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Checkstyle report", e);
        }
        return result;
    }

    private Map<String, Object> checkstyeSummary() {
        List<Map<String, Object>> issues = checkstyleIssues();
        long errors = issues.stream().filter(m -> "error".equals(m.get("severity"))).count();
        long warnings = issues.stream().filter(m -> "warning".equals(m.get("severity"))).count();
        return Map.of("errors", (int) errors, "warnings", (int) warnings, "total", issues.size());
    }

    // ── SpotBugs ──────────────────────────────────────────────────────────────

    public List<Map<String, Object>> spotbugsIssues() {
        File xml = new File(projectPath, "target/spotbugsXml.xml");
        if (!xml.exists()) return List.of(Map.of("error", "Run analysis first (target/spotbugsXml.xml not found)"));

        List<Map<String, Object>> result = new ArrayList<>();
        try {
            Document doc = parse(xml);
            NodeList bugs = doc.getElementsByTagName("BugInstance");
            for (int i = 0; i < bugs.getLength(); i++) {
                Element bug = (Element) bugs.item(i);
                String file = "";
                NodeList srcLines = bug.getElementsByTagName("SourceLine");
                if (srcLines.getLength() > 0) {
                    Element sl = (Element) srcLines.item(0);
                    file = sl.getAttribute("sourcefile");
                }
                NodeList longMsg = bug.getElementsByTagName("LongMessage");
                String message = longMsg.getLength() > 0 ? longMsg.item(0).getTextContent().trim() : "";

                result.add(Map.of(
                        "type", bug.getAttribute("type"),
                        "category", bug.getAttribute("category"),
                        "priority", bug.getAttribute("priority"),
                        "rank", bug.getAttribute("rank"),
                        "file", file,
                        "message", message
                ));
            }
        } catch (Exception e) {
            log.warn("Failed to parse SpotBugs report", e);
        }
        return result;
    }

    private Map<String, Object> spotbugsSummary() {
        List<Map<String, Object>> issues = spotbugsIssues();
        long high = issues.stream().filter(m -> "1".equals(m.get("priority"))).count();
        long medium = issues.stream().filter(m -> "2".equals(m.get("priority"))).count();
        long security = issues.stream().filter(m -> "SECURITY".equals(m.get("category"))).count();
        return Map.of("bugs", issues.size(), "high", (int) high, "medium", (int) medium, "security", (int) security);
    }

    // ── JaCoCo Coverage ───────────────────────────────────────────────────────

    public Map<String, Object> coverageSummary() {
        File xml = new File(projectPath, "target/site/jacoco/jacoco.xml");
        if (!xml.exists()) return Map.of("error", "Run analysis first (target/site/jacoco/jacoco.xml not found)");

        try {
            Document doc = parse(xml);
            NodeList counters = doc.getElementsByTagName("counter");

            Map<String, Object> result = new LinkedHashMap<>();
            for (int i = 0; i < counters.getLength(); i++) {
                Element c = (Element) counters.item(i);
                if (c.getParentNode().getNodeName().equals("report")) {
                    String type = c.getAttribute("type");
                    int missed = Integer.parseInt(c.getAttribute("missed"));
                    int covered = Integer.parseInt(c.getAttribute("covered"));
                    int total = missed + covered;
                    double pct = total > 0 ? Math.round((covered * 1000.0 / total)) / 10.0 : 0.0;
                    result.put(type.toLowerCase() + "Coverage", pct);
                    result.put(type.toLowerCase() + "Covered", covered);
                    result.put(type.toLowerCase() + "Total", total);
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse JaCoCo report", e);
            return Map.of("error", e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Document parse(File file) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Disable external entity processing (XXE prevention)
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory.newDocumentBuilder().parse(file);
    }

    private String shortPath(String fullPath) {
        int idx = fullPath.indexOf("src/main/java/");
        return idx >= 0 ? fullPath.substring(idx + 14) : new File(fullPath).getName();
    }

    private String shortRule(String source) {
        int dot = source.lastIndexOf('.');
        return dot >= 0 ? source.substring(dot + 1) : source;
    }

    private String grade(int totalIssues, double lineCoverage) {
        if (totalIssues == 0 && lineCoverage >= 80) return "A";
        if (totalIssues <= 5 && lineCoverage >= 60) return "B";
        if (totalIssues <= 20 && lineCoverage >= 40) return "C";
        if (totalIssues <= 50) return "D";
        return "E";
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }
}
