package com.example.pi_projet.service;

import com.example.pi_projet.dto.intelligence.*;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.PoDecision;
import com.example.pi_projet.repository.DeliverableRepository;
import com.example.pi_projet.repository.DeliverableVersionRepository;
import com.example.pi_projet.repository.PoDecisionRepository;
import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Chunk;
import com.github.difflib.patch.Patch;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Deliverable Intelligence Module — single service that groups
 * the "smart" features applied on deliverables:
 *   1. Version diff + impact level + regression detection
 *   2. Auto summary of changes
 *   3. Auto PO feedback (rules + cosine similarity)
 *   4. Duplicate detection (TF-IDF + cosine)
 *   5. PO decision history analytics
 *
 * Everything is pure Java so the module works without the Python sidecar.
 * If the NlpClient is reachable it is used to enrich the results (richer summary).
 */
@Service
@RequiredArgsConstructor
public class DeliverableIntelligenceService {

    private final DeliverableRepository deliverableRepository;
    private final DeliverableVersionRepository versionRepository;
    private final PoDecisionRepository poDecisionRepository;
    private final NlpClient nlpClient; // optional Python microservice client
    private final KeywordIntelligenceService keywordIntelligence; // smart keyword/highlight engine
    private final FileTextExtractor fileTextExtractor; // PDF/DOCX text extraction

    // ─── configuration ────────────────────────────────────────────────────────
    private static final double DUPLICATE_THRESHOLD = 0.80;
    private static final int SHORT_DESCRIPTION_CHARS = 40;
    private static final double LOW_SIMILARITY_THRESHOLD = 0.30;
    private static final double BIG_CHANGE_RATIO = 0.50; // >50% lines touched ⇒ big change

    /** Keywords whose removal is treated as a regression. */
    private static final Set<String> IMPORTANT_KEYWORDS = Set.of(
            "security", "sécurité", "payment", "paiement", "login",
            "auth", "password", "token", "encryption", "ssl", "tls"
    );

    // ══════════════════════════════════════════════════════════════════════════
    // 1. VERSION COMPARISON
    // ══════════════════════════════════════════════════════════════════════════

    /** Compare two stored versions by id. */
    public VersionDiffDto compareVersions(Long oldVersionId, Long newVersionId) {
        DeliverableVersion oldV = versionRepository.findById(oldVersionId)
                .orElseThrow(() -> new RuntimeException("Old version not found"));
        DeliverableVersion newV = versionRepository.findById(newVersionId)
                .orElseThrow(() -> new RuntimeException("New version not found"));

        String oldText = snapshotText(oldV);
        String newText = snapshotText(newV);

        VersionDiffDto diff = compareText(oldText, newText);
        diff.setFromVersion(oldV.getVersionNumber());
        diff.setToVersion(newV.getVersionNumber());
        return diff;
    }

    /** Compare two free-form texts (used by the /compare/text endpoint & tests). */
    public VersionDiffDto compareText(String oldText, String newText) {
        List<String> oldLines = toLines(oldText);
        List<String> newLines = toLines(newText);

        Patch<String> patch = DiffUtils.diff(oldLines, newLines);

        List<String> added = new ArrayList<>();
        List<String> removed = new ArrayList<>();
        List<VersionDiffDto.ChangedLine> changed = new ArrayList<>();

        for (AbstractDelta<String> delta : patch.getDeltas()) {
            Chunk<String> src = delta.getSource();
            Chunk<String> tgt = delta.getTarget();
            switch (delta.getType()) {
                case INSERT -> added.addAll(tgt.getLines());
                case DELETE -> removed.addAll(src.getLines());
                case CHANGE -> {
                    int n = Math.max(src.getLines().size(), tgt.getLines().size());
                    for (int i = 0; i < n; i++) {
                        String before = i < src.getLines().size() ? src.getLines().get(i) : "";
                        String after  = i < tgt.getLines().size() ? tgt.getLines().get(i) : "";
                        changed.add(VersionDiffDto.ChangedLine.builder()
                                .before(before).after(after).build());
                    }
                }
                default -> { /* EQUAL ignored */ }
            }
        }

        // ── Smart keyword + highlighting layer (delegated) ────────────────────
        Set<String> keywordsTouched = new LinkedHashSet<>();
        keywordsTouched.addAll(keywordIntelligence.extractKeywords(String.join("\n", added)));
        keywordsTouched.addAll(keywordIntelligence.extractKeywords(String.join("\n", removed)));
        keywordsTouched.addAll(keywordIntelligence.extractKeywords(changed.stream()
                .map(c -> c.getBefore() + " " + c.getAfter())
                .collect(Collectors.joining("\n"))));

        var keywordChanges    = keywordIntelligence.detectKeywordChanges(oldText, newText);
        var highlightedLines  = keywordIntelligence.buildHighlightedLines(added, removed, changed);
        boolean criticalOnly  = keywordIntelligence.containsCriticalChange(highlightedLines);

        String impact = classifyImpact(added.size(), removed.size(), changed.size(),
                oldLines.size(), !keywordsTouched.isEmpty());

        String regressionReason = keywordIntelligence.explainRegression(oldText, newText, keywordChanges);
        boolean regression = regressionReason != null
                || detectRegression(oldText, newText, removed);

        return VersionDiffDto.builder()
                .added(added)
                .removed(removed)
                .changed(changed)
                .addedCount(added.size())
                .removedCount(removed.size())
                .changedCount(changed.size())
                .impactLevel(impact)
                .regressionDetected(regression)
                .regressionReason(regressionReason)
                .importantKeywords(new ArrayList<>(keywordsTouched))
                .keywordChanges(keywordChanges)
                .highlightedLines(highlightedLines)
                .criticalChangesOnly(criticalOnly)
                .build();
    }

    /**
     * Tutor feature: compare the actual file content (PDF / DOCX) of two
     * student deliverables. Reuses the same diff + keyword pipeline as the
     * version compare, plus a cosine-similarity score for plagiarism hints.
     */
    public DeliverableComparisonDto compareDeliverables(Long leftId, Long rightId) {
        if (leftId == null || rightId == null || leftId.equals(rightId)) {
            throw new IllegalArgumentException("Two distinct deliverable ids are required");
        }

        Deliverable left = deliverableRepository.findByIdWithDetails(leftId)
                .orElseThrow(() -> new RuntimeException("Left deliverable not found"));
        Deliverable right = deliverableRepository.findByIdWithDetails(rightId)
                .orElseThrow(() -> new RuntimeException("Right deliverable not found"));

        String leftText  = fileTextExtractor.extract(left.getFileUrl());
        String rightText = fileTextExtractor.extract(right.getFileUrl());

        VersionDiffDto diff = compareText(leftText, rightText);

        double similarity = nlpClient.similarity(leftText, rightText)
                .orElseGet(() -> cosineSimilarity(leftText, rightText));
        similarity = round2(similarity);

        return DeliverableComparisonDto.builder()
                .left(buildSide(left, leftText))
                .right(buildSide(right, rightText))
                .similarity(similarity)
                .possiblePlagiarism(similarity >= DUPLICATE_THRESHOLD)
                .diff(diff)
                .build();
    }

    private DeliverableComparisonDto.Side buildSide(Deliverable d, String text) {
        return DeliverableComparisonDto.Side.builder()
                .deliverableId(d.getId())
                .title(d.getTitle())
                .submittedById(d.getSubmittedBy() != null ? d.getSubmittedBy().getId() : null)
                .submittedByName(d.getSubmittedBy() != null ? d.getSubmittedBy().getFullName() : null)
                .fileUrl(d.getFileUrl())
                .fileType(d.getFileType())
                .textLength(text == null ? 0 : text.length())
                .extracted(text != null && !text.isBlank())
                .build();
    }

    /** Classify the magnitude of a diff into MINOR / MEDIUM / MAJOR. */
    private String classifyImpact(int added, int removed, int changed,
                                  int oldSize, boolean importantKeywordTouched) {
        int total = added + removed + changed;
        if (importantKeywordTouched) return "MAJOR";
        if (oldSize == 0) return total == 0 ? "MINOR" : "MAJOR";
        double ratio = (double) total / Math.max(1, oldSize);
        if (ratio >= BIG_CHANGE_RATIO) return "MAJOR";
        if (ratio >= 0.15 || total >= 10) return "MEDIUM";
        return "MINOR";
    }

    /**
     * Regression = a sensitive keyword was present in the old version
     * and no longer present in the new one, OR more than 50% of the old
     * content was removed.
     */
    private boolean detectRegression(String oldText, String newText, List<String> removedLines) {
        String oldLower = oldText.toLowerCase(Locale.ROOT);
        String newLower = newText.toLowerCase(Locale.ROOT);
        for (String kw : IMPORTANT_KEYWORDS) {
            if (oldLower.contains(kw) && !newLower.contains(kw)) return true;
        }
        long oldLen = oldText.length();
        long removedLen = removedLines.stream().mapToLong(String::length).sum();
        return oldLen > 0 && removedLen > oldLen * BIG_CHANGE_RATIO;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. AUTO SUMMARY
    // ══════════════════════════════════════════════════════════════════════════

    public AutoSummaryDto autoSummary(Long oldVersionId, Long newVersionId) {
        VersionDiffDto diff = compareVersions(oldVersionId, newVersionId);
        String basic = String.format("%d lines added, %d removed, %d changed",
                diff.getAddedCount(), diff.getRemovedCount(), diff.getChangedCount());

        // Enrich with Python NLP if available, otherwise fall back.
        String nlp = nlpClient.summarize(
                "Changes summary: added=" + diff.getAdded()
                + " removed=" + diff.getRemoved()
                + " changed=" + diff.getChanged()
        ).orElse(null);

        return AutoSummaryDto.builder()
                .summary(basic)
                .nlpSummary(nlp)
                .impactLevel(diff.getImpactLevel())
                .build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. AUTO PO FEEDBACK
    // ══════════════════════════════════════════════════════════════════════════

    public AutoFeedbackDto autoFeedback(Long deliverableId) {
        Deliverable d = deliverableRepository.findByIdWithDetails(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        List<String> feedback = new ArrayList<>();
        String description = Optional.ofNullable(d.getDescription()).orElse("");
        String taskTitle   = d.getTask() != null ? Optional.ofNullable(d.getTask().getTitle()).orElse("") : "";
        String taskDesc    = d.getTask() != null ? Optional.ofNullable(d.getTask().getDescription()).orElse("") : "";

        // Rule 1: description too short
        if (description.trim().length() < SHORT_DESCRIPTION_CHARS) {
            feedback.add("Manque de détails techniques");
        }

        // Rule 2: description not aligned with task title/description
        double sim = nlpClient.similarity(taskTitle + " " + taskDesc, description)
                .orElseGet(() -> cosineSimilarity(taskTitle + " " + taskDesc, description));
        if (sim < LOW_SIMILARITY_THRESHOLD) {
            feedback.add("La description n’est pas alignée avec la tâche");
        }

        // Rule 3: many versions / many changes between last two
        List<DeliverableVersion> versions = versionRepository.findByDeliverableId(deliverableId);
        if (versions.size() >= 2) {
            DeliverableVersion newer = versions.get(0);
            DeliverableVersion older = versions.get(versions.size() - 1);
            VersionDiffDto diff = compareText(snapshotText(older), snapshotText(newer));
            if ("MAJOR".equals(diff.getImpactLevel())) {
                feedback.add("Modifications importantes nécessitent une revalidation");
            }
        }

        String suggested = suggestDecision(feedback, sim);

        return AutoFeedbackDto.builder()
                .deliverableId(deliverableId)
                .feedback(feedback)
                .taskDescriptionSimilarity(round2(sim))
                .suggestedDecision(suggested)
                .build();
    }

    private String suggestDecision(List<String> feedback, double similarity) {
        if (feedback.isEmpty())                                return "validated";
        if (feedback.size() == 1)                              return "minor_changes";
        if (similarity < 0.15)                                 return "rejected";
        return "major_rework";
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. DUPLICATE DETECTION
    // ══════════════════════════════════════════════════════════════════════════

    public DuplicateReportDto findDuplicates(Long deliverableId) {
        Deliverable target = deliverableRepository.findByIdWithDetails(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        // Only compare inside the same project to keep it meaningful.
        List<Deliverable> candidates = deliverableRepository
                .findByProjectId(target.getProject().getId()).stream()
                .filter(d -> !d.getId().equals(deliverableId))
                .toList();

        String targetText = (target.getTitle() + " " + target.getDescription()).trim();

        List<DuplicateReportDto.DuplicateMatch> matches = candidates.stream()
                .map(c -> {
                    String text = (c.getTitle() + " " + c.getDescription()).trim();
                    double sim = nlpClient.similarity(targetText, text)
                            .orElseGet(() -> cosineSimilarity(targetText, text));
                    return DuplicateReportDto.DuplicateMatch.builder()
                            .deliverableId(c.getId())
                            .title(c.getTitle())
                            .submittedByName(c.getSubmittedBy() != null ? c.getSubmittedBy().getFullName() : null)
                            .similarity(round2(sim))
                            .build();
                })
                .filter(m -> m.getSimilarity() >= 0.50) // hide truly unrelated
                .sorted(Comparator.comparingDouble(DuplicateReportDto.DuplicateMatch::getSimilarity).reversed())
                .limit(5)
                .toList();

        boolean warn = matches.stream().anyMatch(m -> m.getSimilarity() >= DUPLICATE_THRESHOLD);

        return DuplicateReportDto.builder()
                .deliverableId(deliverableId)
                .duplicateWarning(warn)
                .threshold(DUPLICATE_THRESHOLD)
                .matches(matches)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. PO DECISION ANALYTICS
    // ══════════════════════════════════════════════════════════════════════════

    public PoDecisionAnalyticsDto analyticsForProject(UUID projectId) {
        List<PoDecision> decisions = projectId == null
                ? poDecisionRepository.findAll()
                : poDecisionRepository.findByProjectId(projectId);

        return buildAnalytics(decisions);
    }

    private PoDecisionAnalyticsDto buildAnalytics(List<PoDecision> decisions) {
        long total = decisions.size();
        Map<String, Long> breakdown = decisions.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getDecision().name(),
                        Collectors.counting()));

        long validated = breakdown.getOrDefault("validated", 0L);
        long rejected  = breakdown.getOrDefault("rejected", 0L);

        double acceptanceRate = total == 0 ? 0.0 : round2((double) validated / total);
        double rejectionRate  = total == 0 ? 0.0 : round2((double) rejected / total);

        // Top rejection reasons = most common words in `finalComments` of rejected decisions
        List<PoDecisionAnalyticsDto.RejectionReasonCount> topReasons = decisions.stream()
                .filter(d -> d.getDecision() == PoDecision.PoDecisionType.rejected
                        || d.getDecision() == PoDecision.PoDecisionType.major_rework)
                .map(PoDecision::getFinalComments)
                .filter(Objects::nonNull)
                .flatMap(c -> Arrays.stream(c.toLowerCase(Locale.ROOT).split("[\\s,.;:!?]+")))
                .filter(w -> w.length() > 3 && !STOP_WORDS.contains(w))
                .collect(Collectors.groupingBy(w -> w, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> PoDecisionAnalyticsDto.RejectionReasonCount.builder()
                        .reason(e.getKey()).count(e.getValue()).build())
                .toList();

        // Insights (simple rules)
        List<String> insights = new ArrayList<>();
        if (total > 0) {
            if (rejectionRate > 0.25) insights.add("High rejection rate: " + (int)(rejectionRate * 100) + "% of deliverables are rejected");
            if (!topReasons.isEmpty()) insights.add("Most rejections mention '" + topReasons.get(0).getReason() + "'");
            if (acceptanceRate > 0.7) insights.add("Good delivery quality: acceptance rate is " + (int)(acceptanceRate * 100) + "%");
        }

        return PoDecisionAnalyticsDto.builder()
                .totalDecisions(total)
                .acceptanceRate(acceptanceRate)
                .rejectionRate(rejectionRate)
                .decisionBreakdown(breakdown)
                .topRejectionReasons(topReasons)
                .insights(insights)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Helpers: text / similarity
    // ══════════════════════════════════════════════════════════════════════════

    private static final Set<String> STOP_WORDS = Set.of(
            "the","and","for","with","pour","avec","cette","cela",
            "dans","mais","aussi","être","sont","tres","très",
            "plus","moins","this","that","there","here","which","dont"
    );

    private List<String> toLines(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("\\r?\\n"))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** Treat the version's changeSummary (+ deliverable text) as the snapshot to diff. */
    private String snapshotText(DeliverableVersion v) {
        Deliverable d = v.getDeliverable();
        StringBuilder sb = new StringBuilder();
        if (d != null) {
            if (d.getTitle() != null)       sb.append(d.getTitle()).append('\n');
            if (d.getDescription() != null) sb.append(d.getDescription()).append('\n');
        }
        if (v.getChangeSummary() != null)   sb.append(v.getChangeSummary()).append('\n');
        return sb.toString();
    }

    /** Simple TF (bag-of-words) cosine similarity — no external ML required. */
    static double cosineSimilarity(String a, String b) {
        if (a == null || b == null) return 0.0;
        Map<String, Integer> va = vectorize(a);
        Map<String, Integer> vb = vectorize(b);
        if (va.isEmpty() || vb.isEmpty()) return 0.0;

        long dot = 0;
        for (var e : va.entrySet()) {
            Integer other = vb.get(e.getKey());
            if (other != null) dot += (long) e.getValue() * other;
        }
        double na = Math.sqrt(va.values().stream().mapToLong(v -> (long) v * v).sum());
        double nb = Math.sqrt(vb.values().stream().mapToLong(v -> (long) v * v).sum());
        if (na == 0 || nb == 0) return 0.0;
        return dot / (na * nb);
    }

    private static Map<String, Integer> vectorize(String text) {
        Map<String, Integer> map = new HashMap<>();
        for (String tok : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (tok.length() < 2 || STOP_WORDS.contains(tok)) continue;
            map.merge(tok, 1, (x, y) -> x + y);
        }
        return map;
    }

    private static double round2(double d) { return Math.round(d * 100.0) / 100.0; }
}
