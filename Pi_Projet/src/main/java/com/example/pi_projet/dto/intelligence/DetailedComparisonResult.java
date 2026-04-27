package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Full structured comparison result — JSON-serialisable for storage and reporting.
 *
 * Stored in {@code student_deliverables.comparison_result} as a JSON blob so
 * the PDF report can be regenerated without re-running the comparison.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetailedComparisonResult {

    // ── identifiers ───────────────────────────────────────────────────────────
    private Long leftDeliverableId;
    private Long rightDeliverableId;
    private String leftTitle;
    private String rightTitle;
    private String leftStudentName;
    private String rightStudentName;

    // ── aggregate stats ───────────────────────────────────────────────────────
    private int totalAdded;
    private int totalRemoved;
    private int totalModified;
    private int totalUnchanged;

    /** 0.0–1.0 cosine similarity between the two texts. */
    private double similarityScore;

    /** Percentage string e.g. "73.4%" */
    private String similarityPct;

    /** MINOR | MEDIUM | MAJOR */
    private String impactLevel;

    /** Whether similarity ≥ 80% (possible plagiarism). */
    private boolean possiblePlagiarism;

    /**
     * Suggested score 0–100 calculated from similarity and diff stats.
     * Tutor can accept or override this value.
     */
    private int suggestedScore;

    // ── detailed sections ────────────────────────────────────────────────────
    private List<DiffSection> sections;

    /** Total number of sections (used for pagination). */
    private int totalSections;
}
