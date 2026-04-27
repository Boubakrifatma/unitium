package com.example.pi_projet.service;

import com.example.pi_projet.dto.intelligence.*;
import com.example.pi_projet.entity.student.StudentDeliverable;
import com.example.pi_projet.repository.StudentDeliverableRepository;
import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Chunk;
import com.github.difflib.patch.Patch;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Enhanced comparison service for the student–tutor workflow.
 *
 * Produces a fully structured {@link DetailedComparisonResult} with:
 *   - Line-by-line diffs carrying old/new line numbers
 *   - Change classification (ADDED / REMOVED / MODIFIED / UNCHANGED)
 *   - Context lines grouped into {@link DiffSection} hunks
 *   - Cosine-similarity score and plagiarism flag
 *   - Auto-suggested score for the tutor
 *   - Pagination support via {@link #paginate}
 *
 * This service does NOT modify the existing {@link DeliverableIntelligenceService}.
 */
@Service
@RequiredArgsConstructor
public class EnhancedComparisonService {

    private static final int CONTEXT_LINES    = 3;   // unchanged lines shown around a change
    private static final double PLAGIARISM_THRESHOLD = 0.80;

    private final FileTextExtractor fileTextExtractor;
    private final StudentDeliverableRepository studentDeliverableRepository;
    private final NlpClient nlpClient;

    // ══════════════════════════════════════════════════════════════════════════
    // Public API
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Compare two student deliverables by their file content.
     * The result is suitable for storage as JSON and for PDF report generation.
     */
    public DetailedComparisonResult compareStudentDeliverables(Long leftId, Long rightId) {
        StudentDeliverable left  = studentDeliverableRepository.findByIdWithDetails(leftId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + leftId));
        StudentDeliverable right = studentDeliverableRepository.findByIdWithDetails(rightId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + rightId));

        String leftText  = fileTextExtractor.extract(left.getFileUrl());
        String rightText = fileTextExtractor.extract(right.getFileUrl());

        return buildResult(leftText, rightText, left, right);
    }

    /**
     * Compare two raw text strings (used when file content is already known
     * or for a tutor's side-by-side text input).
     */
    public DetailedComparisonResult compareTexts(String leftText, String rightText,
                                                 Long leftId, Long rightId) {
        StudentDeliverable left  = leftId  != null ? studentDeliverableRepository.findByIdWithDetails(leftId).orElse(null)  : null;
        StudentDeliverable right = rightId != null ? studentDeliverableRepository.findByIdWithDetails(rightId).orElse(null) : null;
        return buildResult(leftText, rightText, left, right);
    }

    /**
     * Return a page of sections from a {@link DetailedComparisonResult}.
     *
     * @param result   the full result (from cache or re-computed)
     * @param page     0-based page index
     * @param pageSize sections per page
     */
    public PaginatedDiffResult paginate(DetailedComparisonResult result, int page, int pageSize) {
        List<DiffSection> all = result.getSections() == null ? List.of() : result.getSections();
        int total = all.size();
        int totalPages = pageSize == 0 ? 1 : (int) Math.ceil((double) total / pageSize);
        int from = Math.min(page * pageSize, total);
        int to   = Math.min(from + pageSize, total);

        return PaginatedDiffResult.builder()
                .page(page)
                .pageSize(pageSize)
                .totalSections(total)
                .totalPages(totalPages)
                .totalAdded(result.getTotalAdded())
                .totalRemoved(result.getTotalRemoved())
                .totalModified(result.getTotalModified())
                .similarityScore(result.getSimilarityScore())
                .similarityPct(result.getSimilarityPct())
                .impactLevel(result.getImpactLevel())
                .possiblePlagiarism(result.isPossiblePlagiarism())
                .suggestedScore(result.getSuggestedScore())
                .leftDeliverableId(result.getLeftDeliverableId())
                .rightDeliverableId(result.getRightDeliverableId())
                .leftTitle(result.getLeftTitle())
                .rightTitle(result.getRightTitle())
                .leftStudentName(result.getLeftStudentName())
                .rightStudentName(result.getRightStudentName())
                .sections(all.subList(from, to))
                .build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Core diff engine
    // ══════════════════════════════════════════════════════════════════════════

    private DetailedComparisonResult buildResult(String leftText, String rightText,
                                                 StudentDeliverable left, StudentDeliverable right) {
        List<String> oldLines = splitLines(leftText);
        List<String> newLines = splitLines(rightText);

        Patch<String> patch = DiffUtils.diff(oldLines, newLines);

        // Build a position map: for each delta, note which old/new line indices are changed
        // We walk through both sequences in parallel to assign line numbers correctly.
        List<DiffSection> sections = buildSections(oldLines, newLines, patch);

        int totalAdded    = sections.stream().mapToInt(DiffSection::getAddedInSection).sum();
        int totalRemoved  = sections.stream().mapToInt(DiffSection::getRemovedInSection).sum();
        int totalModified = sections.stream().mapToInt(DiffSection::getModifiedInSection).sum();
        int totalUnchanged = Math.max(0, oldLines.size() - totalRemoved - totalModified);

        double similarity = nlpClient.similarity(leftText, rightText)
                .orElseGet(() -> DeliverableIntelligenceService.cosineSimilarity(leftText, rightText));
        similarity = Math.round(similarity * 10000.0) / 10000.0;

        String impactLevel = classifyImpact(totalAdded, totalRemoved, totalModified, oldLines.size(), similarity);
        boolean plagiarism = similarity >= PLAGIARISM_THRESHOLD;
        int suggestedScore = computeSuggestedScore(similarity, totalAdded, totalRemoved, totalModified, oldLines.size(), impactLevel);

        return DetailedComparisonResult.builder()
                .leftDeliverableId(left  != null ? left.getId()  : null)
                .rightDeliverableId(right != null ? right.getId() : null)
                .leftTitle(left  != null ? left.getTitle()  : "Left")
                .rightTitle(right != null ? right.getTitle() : "Right")
                .leftStudentName(left  != null && left.getSubmittedBy()  != null ? left.getSubmittedBy().getFullName()  : null)
                .rightStudentName(right != null && right.getSubmittedBy() != null ? right.getSubmittedBy().getFullName() : null)
                .totalAdded(totalAdded)
                .totalRemoved(totalRemoved)
                .totalModified(totalModified)
                .totalUnchanged(totalUnchanged)
                .similarityScore(similarity)
                .similarityPct(String.format("%.1f%%", similarity * 100))
                .impactLevel(impactLevel)
                .possiblePlagiarism(plagiarism)
                .suggestedScore(suggestedScore)
                .sections(sections)
                .totalSections(sections.size())
                .build();
    }

    /**
     * Convert the patch into DiffSection hunks, each carrying context lines
     * of UNCHANGED text around each set of changes.
     */
    private List<DiffSection> buildSections(List<String> oldLines, List<String> newLines,
                                            Patch<String> patch) {
        if (patch.getDeltas().isEmpty()) return List.of();

        // Collect changed old-line ranges (end index = position + number of lines in chunk)
        record Range(int oldFrom, int oldTo, int newFrom, int newTo) {}
        List<Range> rawRanges = patch.getDeltas().stream().map(d -> new Range(
                d.getSource().getPosition(),
                d.getSource().getPosition() + d.getSource().getLines().size(),
                d.getTarget().getPosition(),
                d.getTarget().getPosition() + d.getTarget().getLines().size()
        )).toList();

        // Merge overlapping/adjacent ranges, expanding each by CONTEXT_LINES
        List<Range> merged = new ArrayList<>();
        for (Range r : rawRanges) {
            int co = Math.max(0, r.oldFrom() - CONTEXT_LINES);
            int cn = Math.max(0, r.newFrom() - CONTEXT_LINES);
            int ce = Math.min(oldLines.size(), r.oldTo() + CONTEXT_LINES);
            int cf = Math.min(newLines.size(), r.newTo() + CONTEXT_LINES);
            if (!merged.isEmpty()) {
                Range last = merged.get(merged.size() - 1);
                if (co <= last.oldTo()) {
                    // Overlaps with previous hunk — extend its end
                    merged.set(merged.size() - 1,
                            new Range(last.oldFrom(), Math.max(last.oldTo(), ce),
                                      last.newFrom(), Math.max(last.newTo(), cf)));
                    continue;
                }
            }
            merged.add(new Range(co, ce, cn, cf));
        }

        // Build a lookup: old-line position → delta
        Map<Integer, AbstractDelta<String>> deltaByOldPos = new LinkedHashMap<>();
        for (AbstractDelta<String> delta : patch.getDeltas()) {
            deltaByOldPos.put(delta.getSource().getPosition(), delta);
        }

        List<DiffSection> sections = new ArrayList<>();
        int sectionIdx = 0;

        for (Range hunk : merged) {
            List<DetailedDiffLine> lines = new ArrayList<>();
            int addedCount = 0, removedCount = 0, modifiedCount = 0;

            int oi = hunk.oldFrom();
            int ni = hunk.newFrom();

            while (oi < hunk.oldTo() || ni < hunk.newTo()) {
                AbstractDelta<String> delta = deltaByOldPos.get(oi);
                if (delta != null) {
                    Chunk<String> src = delta.getSource();
                    Chunk<String> tgt = delta.getTarget();

                    switch (delta.getType()) {
                        case INSERT -> {
                            for (String line : tgt.getLines()) {
                                lines.add(DetailedDiffLine.builder()
                                        .oldLineNumber(null).newLineNumber(ni + 1)
                                        .type(DetailedDiffLine.LineType.ADDED).content(line).build());
                                ni++; addedCount++;
                            }
                            // INSERT does not consume old lines — oi stays the same.
                            // Remove delta so we don't re-enter it.
                            deltaByOldPos.remove(oi);
                        }
                        case DELETE -> {
                            for (String line : src.getLines()) {
                                lines.add(DetailedDiffLine.builder()
                                        .oldLineNumber(oi + 1).newLineNumber(null)
                                        .type(DetailedDiffLine.LineType.REMOVED).content(line).build());
                                oi++; removedCount++;
                            }
                            deltaByOldPos.remove(src.getPosition());
                        }
                        case CHANGE -> {
                            int n = Math.max(src.getLines().size(), tgt.getLines().size());
                            for (int i = 0; i < n; i++) {
                                boolean hasSrc = i < src.getLines().size();
                                boolean hasTgt = i < tgt.getLines().size();
                                if (hasSrc && hasTgt) {
                                    lines.add(DetailedDiffLine.builder()
                                            .oldLineNumber(oi + 1).newLineNumber(ni + 1)
                                            .type(DetailedDiffLine.LineType.MODIFIED)
                                            .oldContent(src.getLines().get(i))
                                            .content(tgt.getLines().get(i)).build());
                                    oi++; ni++; modifiedCount++;
                                } else if (hasSrc) {
                                    lines.add(DetailedDiffLine.builder()
                                            .oldLineNumber(oi + 1).newLineNumber(null)
                                            .type(DetailedDiffLine.LineType.REMOVED)
                                            .content(src.getLines().get(i)).build());
                                    oi++; removedCount++;
                                } else {
                                    lines.add(DetailedDiffLine.builder()
                                            .oldLineNumber(null).newLineNumber(ni + 1)
                                            .type(DetailedDiffLine.LineType.ADDED)
                                            .content(tgt.getLines().get(i)).build());
                                    ni++; addedCount++;
                                }
                            }
                            deltaByOldPos.remove(src.getPosition());
                        }
                        default -> {}
                    }
                } else if (oi < oldLines.size() && oi < hunk.oldTo()) {
                    // Unchanged context line
                    lines.add(DetailedDiffLine.builder()
                            .oldLineNumber(oi + 1).newLineNumber(ni + 1)
                            .type(DetailedDiffLine.LineType.UNCHANGED)
                            .content(oldLines.get(oi)).build());
                    oi++; ni++;
                } else {
                    break;
                }
            }

            if (!lines.isEmpty()) {
                sections.add(DiffSection.builder()
                        .sectionIndex(sectionIdx++)
                        .oldStartLine(hunk.oldFrom() + 1)
                        .newStartLine(hunk.newFrom() + 1)
                        .addedInSection(addedCount)
                        .removedInSection(removedCount)
                        .modifiedInSection(modifiedCount)
                        .lines(lines)
                        .build());
            }
        }

        return sections;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Scoring & classification
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Suggested score algorithm:
     *   Base score = (1 - similarity) * 100  →  originality bonus
     *   Penalty for large diffs (indicates heavy borrowing that is still different)
     *   Penalty for MAJOR impact
     *   Clamped [0, 100].
     *
     * The tutor can always override this value.
     */
    private int computeSuggestedScore(double similarity, int added, int removed, int modified,
                                      int oldSize, String impact) {
        // High similarity = low originality score
        double originality = (1.0 - similarity) * 100.0;

        // Penalty: if many lines changed relative to document size
        double changeRatio = oldSize == 0 ? 0.0 : (double)(added + removed + modified) / oldSize;
        double changePenalty = Math.min(20.0, changeRatio * 20.0);

        // Extra penalty for MAJOR-impact docs (keyword removal, big restructuring)
        double impactPenalty = "MAJOR".equals(impact) ? 10.0 : ("MEDIUM".equals(impact) ? 5.0 : 0.0);

        double raw = originality - changePenalty - impactPenalty;
        return (int) Math.max(0, Math.min(100, Math.round(raw)));
    }

    private String classifyImpact(int added, int removed, int modified, int oldSize, double similarity) {
        if (similarity >= PLAGIARISM_THRESHOLD) return "MAJOR";
        int total = added + removed + modified;
        if (oldSize == 0) return total == 0 ? "MINOR" : "MAJOR";
        double ratio = (double) total / oldSize;
        if (ratio >= 0.50) return "MAJOR";
        if (ratio >= 0.15 || total >= 10) return "MEDIUM";
        return "MINOR";
    }

    private List<String> splitLines(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("\\r?\\n"))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
