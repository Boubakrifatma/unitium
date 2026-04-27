package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Paginated view over a {@link DetailedComparisonResult}.
 * The header fields (similarity, stats) are always present;
 * only the sections slice changes per page.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedDiffResult {

    // ── pagination metadata ───────────────────────────────────────────────────
    private int page;
    private int pageSize;
    private int totalSections;
    private int totalPages;

    // ── aggregate stats (repeated on every page for stateless rendering) ─────
    private int totalAdded;
    private int totalRemoved;
    private int totalModified;
    private double similarityScore;
    private String similarityPct;
    private String impactLevel;
    private boolean possiblePlagiarism;
    private int suggestedScore;

    private Long leftDeliverableId;
    private Long rightDeliverableId;
    private String leftTitle;
    private String rightTitle;
    private String leftStudentName;
    private String rightStudentName;

    // ── current page sections ─────────────────────────────────────────────────
    private List<DiffSection> sections;
}
