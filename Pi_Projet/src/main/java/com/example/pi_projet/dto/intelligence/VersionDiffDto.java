package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of comparing two DeliverableVersion snapshots.
 *
 * Example JSON:
 * {
 *   "fromVersion": 1, "toVersion": 2,
 *   "added":   ["- ajoute module paiement"],
 *   "removed": ["- suppression du check SSL"],
 *   "changed": [{ "before": "login simple", "after": "login MFA" }],
 *   "impactLevel": "MAJOR",
 *   "regressionDetected": true,
 *   "importantKeywords": ["security", "payment", "login"],
 *   "addedCount": 1, "removedCount": 1, "changedCount": 1
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionDiffDto {

    private Integer fromVersion;
    private Integer toVersion;

    /** Lines present only in the new version. */
    private List<String> added;

    /** Lines present only in the old version. */
    private List<String> removed;

    /** Lines edited between versions. */
    private List<ChangedLine> changed;

    /** MINOR | MEDIUM | MAJOR */
    private String impactLevel;

    /** True when sensitive keywords were removed or too much content disappeared. */
    private boolean regressionDetected;

    /** Sensitive keywords touched by this diff (security, payment, login …). */
    private List<String> importantKeywords;

    /**
     * Smart per-keyword change report.
     * e.g. [{ keyword: "security", type: REMOVED, riskLevel: HIGH }]
     */
    private List<KeywordChangeDto> keywordChanges;

    /**
     * Lines worth displaying after filtering out trivial edits.
     * Each entry has a color (RED/GREEN/YELLOW) and a critical flag.
     */
    private List<HighlightedLineDto> highlightedLines;

    /**
     * True when the highlighted list contains at least one line touching
     * a critical keyword — signals "something important happened here".
     */
    private boolean criticalChangesOnly;

    /** Human-readable explanation of why a regression was flagged (nullable). */
    private String regressionReason;

    private int addedCount;
    private int removedCount;
    private int changedCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChangedLine {
        private String before;
        private String after;
    }
}
