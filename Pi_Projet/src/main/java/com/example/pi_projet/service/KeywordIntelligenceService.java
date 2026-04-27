package com.example.pi_projet.service;

import com.example.pi_projet.dto.intelligence.HighlightedLineDto;
import com.example.pi_projet.dto.intelligence.KeywordChangeDto;
import com.example.pi_projet.dto.intelligence.KeywordChangeDto.ChangeType;
import com.example.pi_projet.dto.intelligence.KeywordChangeDto.RiskLevel;
import com.example.pi_projet.dto.intelligence.VersionDiffDto;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Keyword Intelligence — isolated service in charge of:
 *   1. extracting critical keywords from free-form text,
 *   2. detecting what changed between two texts (ADDED/REMOVED/MODIFIED),
 *   3. ranking the risk of those changes (HIGH, FEATURE_UPDATE, …),
 *   4. filtering a raw diff into a list of "highlighted" lines only.
 *
 * The keyword vocabulary is loaded from application.properties so product
 * owners can tune it without touching code:
 *
 *   intelligence.keywords=login,security,payment,...
 *   intelligence.keyword.synonyms=auth>authentication,pwd>password
 *
 * This service is intentionally dependency-free (no DB, no NLP lib) so it
 * stays simple and fully unit-testable.
 */
@Slf4j
@Service
public class KeywordIntelligenceService {

    /** Fallback list if nothing is defined in properties. */
    private static final List<String> DEFAULT_KEYWORDS = List.of(
            "login", "authentication", "security", "payment", "password",
            "authorization", "api", "database", "token", "encryption",
            "ssl", "tls", "sécurité", "paiement"
    );

    private final String rawKeywords;
    private final String rawSynonyms;

    /** Canonical critical keywords, lower-cased. */
    private Set<String> keywords;

    /** synonym → canonical keyword (e.g. "auth" → "authentication"). */
    private Map<String, String> synonymMap;

    public KeywordIntelligenceService(
            @Value("${intelligence.keywords:}") String rawKeywords,
            @Value("${intelligence.keyword.synonyms:}") String rawSynonyms) {
        this.rawKeywords = rawKeywords;
        this.rawSynonyms = rawSynonyms;
    }

    @PostConstruct
    void init() {
        this.keywords    = loadKeywords(rawKeywords);
        this.synonymMap  = loadSynonyms(rawSynonyms);
        log.info("KeywordIntelligenceService loaded {} keywords and {} synonyms",
                keywords.size(), synonymMap.size());
    }

    // ── public API ──────────────────────────────────────────────────────────

    /** Canonical keywords found in the given text (synonyms resolved). */
    public Set<String> extractKeywords(String text) {
        if (text == null || text.isBlank()) return Set.of();
        String lower = text.toLowerCase(Locale.ROOT);
        Set<String> hits = new LinkedHashSet<>();
        for (String kw : keywords) {
            if (lower.contains(kw)) hits.add(kw);
        }
        for (Map.Entry<String, String> e : synonymMap.entrySet()) {
            if (lower.contains(e.getKey())) hits.add(e.getValue());
        }
        return hits;
    }

    /**
     * Compare two texts and return what happened to each critical keyword:
     *   present only in new → ADDED   (feature update)
     *   present only in old → REMOVED (high risk)
     *   present in both but context/line moved → MODIFIED.
     */
    public List<KeywordChangeDto> detectKeywordChanges(String oldText, String newText) {
        Set<String> oldKw = extractKeywords(oldText);
        Set<String> newKw = extractKeywords(newText);

        List<KeywordChangeDto> changes = new ArrayList<>();

        // REMOVED = present before, absent now
        for (String kw : oldKw) {
            if (!newKw.contains(kw)) {
                changes.add(KeywordChangeDto.builder()
                        .keyword(kw).type(ChangeType.REMOVED)
                        .riskLevel(RiskLevel.HIGH).build());
            }
        }
        // ADDED = absent before, present now
        for (String kw : newKw) {
            if (!oldKw.contains(kw)) {
                changes.add(KeywordChangeDto.builder()
                        .keyword(kw).type(ChangeType.ADDED)
                        .riskLevel(RiskLevel.FEATURE_UPDATE).build());
            }
        }
        // MODIFIED = kept, but surrounding line text differs enough
        for (String kw : newKw) {
            if (oldKw.contains(kw) && contextChanged(oldText, newText, kw)) {
                changes.add(KeywordChangeDto.builder()
                        .keyword(kw).type(ChangeType.MODIFIED)
                        .riskLevel(RiskLevel.MEDIUM).build());
            }
        }
        return changes;
    }

    /** Overall risk = worst risk level across the detected changes. */
    public RiskLevel analyzeRisk(List<KeywordChangeDto> changes) {
        if (changes == null || changes.isEmpty()) return RiskLevel.LOW;
        boolean high = changes.stream().anyMatch(c -> c.getRiskLevel() == RiskLevel.HIGH);
        if (high) return RiskLevel.HIGH;
        boolean medium = changes.stream().anyMatch(c -> c.getRiskLevel() == RiskLevel.MEDIUM);
        if (medium) return RiskLevel.MEDIUM;
        boolean feature = changes.stream().anyMatch(c -> c.getRiskLevel() == RiskLevel.FEATURE_UPDATE);
        return feature ? RiskLevel.FEATURE_UPDATE : RiskLevel.LOW;
    }

    /**
     * Build the list of lines the UI should show.
     * Rules:
     *   - trivial punctuation/whitespace-only diffs → skipped,
     *   - every other added/removed/changed line   → kept with its color,
     *   - a line is marked critical if it mentions a keyword.
     */
    public List<HighlightedLineDto> buildHighlightedLines(
            List<String> addedLines,
            List<String> removedLines,
            List<VersionDiffDto.ChangedLine> changedLines) {

        List<HighlightedLineDto> out = new ArrayList<>();

        for (String line : safe(removedLines)) {
            if (isTrivial(line)) continue;
            out.add(buildLine(line, HighlightedLineDto.Kind.REMOVED, HighlightedLineDto.Color.RED));
        }
        for (String line : safe(addedLines)) {
            if (isTrivial(line)) continue;
            out.add(buildLine(line, HighlightedLineDto.Kind.ADDED, HighlightedLineDto.Color.GREEN));
        }
        for (VersionDiffDto.ChangedLine cl : safe(changedLines)) {
            String before = Optional.ofNullable(cl.getBefore()).orElse("");
            String after  = Optional.ofNullable(cl.getAfter()).orElse("");
            if (isTrivialChange(before, after)) continue;
            out.add(buildLine(before + "  →  " + after,
                    HighlightedLineDto.Kind.CHANGED,
                    HighlightedLineDto.Color.YELLOW));
        }
        return out;
    }

    /** True if at least one highlighted line touches a critical keyword. */
    public boolean containsCriticalChange(List<HighlightedLineDto> lines) {
        return lines != null && lines.stream().anyMatch(HighlightedLineDto::isCritical);
    }

    /**
     * Produce a short, human-friendly regression explanation or null
     * if no regression is detected.
     */
    public String explainRegression(String oldText,
                                    String newText,
                                    List<KeywordChangeDto> keywordChanges) {
        // 1) Critical keyword removed → highest priority.
        Optional<KeywordChangeDto> removed = keywordChanges.stream()
                .filter(c -> c.getType() == ChangeType.REMOVED)
                .findFirst();
        if (removed.isPresent()) {
            return "Critical keyword '" + removed.get().getKeyword() + "' was removed";
        }
        // 2) Content shrank by more than 30 %.
        int oldLen = oldText == null ? 0 : oldText.length();
        int newLen = newText == null ? 0 : newText.length();
        if (oldLen > 0) {
            double shrink = 1.0 - ((double) newLen / oldLen);
            if (shrink > 0.30) {
                return "Content shrank by " + (int) Math.round(shrink * 100) + "%";
            }
        }
        return null;
    }

    // ── internals ───────────────────────────────────────────────────────────

    /** Build a HighlightedLineDto with the keyword-match flag populated. */
    private HighlightedLineDto buildLine(String text,
                                         HighlightedLineDto.Kind kind,
                                         HighlightedLineDto.Color color) {
        Set<String> matches = extractKeywords(text);
        return HighlightedLineDto.builder()
                .text(text)
                .kind(kind)
                .color(color)
                .critical(!matches.isEmpty())
                .matchedKeywords(new ArrayList<>(matches))
                .build();
    }

    /** Punctuation / whitespace-only edits count as trivial. */
    private boolean isTrivial(String line) {
        if (line == null || line.isBlank()) return true;
        String letters = line.replaceAll("[^\\p{L}\\p{N}]", "");
        return letters.length() < 3;
    }

    /** A CHANGE is trivial if the two versions differ only in spacing/punctuation. */
    private boolean isTrivialChange(String before, String after) {
        if (before == null) before = "";
        if (after  == null) after  = "";
        String a = before.replaceAll("[^\\p{L}\\p{N}]", "").toLowerCase(Locale.ROOT);
        String b = after.replaceAll("[^\\p{L}\\p{N}]", "").toLowerCase(Locale.ROOT);
        return a.equals(b);
    }

    /** True if the line that mentions `kw` no longer looks the same between old and new. */
    private boolean contextChanged(String oldText, String newText, String kw) {
        String oldCtx = lineAround(oldText, kw);
        String newCtx = lineAround(newText, kw);
        if (oldCtx == null || newCtx == null) return false;
        return !oldCtx.equalsIgnoreCase(newCtx);
    }

    private String lineAround(String text, String kw) {
        if (text == null) return null;
        String lower = text.toLowerCase(Locale.ROOT);
        int idx = lower.indexOf(kw);
        if (idx < 0) return null;
        int start = Math.max(0, text.lastIndexOf('\n', idx) + 1);
        int end   = text.indexOf('\n', idx);
        if (end < 0) end = text.length();
        return text.substring(start, end).trim();
    }

    // ── config loaders ──────────────────────────────────────────────────────

    private Set<String> loadKeywords(String raw) {
        if (raw == null || raw.isBlank()) return new LinkedHashSet<>(DEFAULT_KEYWORDS);
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** Parse "auth>authentication,pwd>password" into a map. */
    private Map<String, String> loadSynonyms(String raw) {
        Map<String, String> map = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) return map;
        for (String pair : raw.split(",")) {
            String[] kv = pair.split(">");
            if (kv.length != 2) continue;
            String syn = kv[0].trim().toLowerCase(Locale.ROOT);
            String can = kv[1].trim().toLowerCase(Locale.ROOT);
            if (!syn.isEmpty() && !can.isEmpty()) map.put(syn, can);
        }
        return map;
    }

    private static <T> List<T> safe(List<T> in) {
        return in == null ? List.of() : in;
    }
}
