package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single line in an enhanced diff, with line numbers,
 * change type classification, and old/new content for modified lines.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetailedDiffLine {

    public enum LineType { ADDED, REMOVED, MODIFIED, UNCHANGED }

    /** Line number in the old (original) document. Null for ADDED lines. */
    private Integer oldLineNumber;

    /** Line number in the new (revised) document. Null for REMOVED lines. */
    private Integer newLineNumber;

    private LineType type;

    /** Content of the new version (or the only content for ADDED/UNCHANGED). */
    private String content;

    /** Content of the old version — only populated for MODIFIED lines. */
    private String oldContent;
}
