package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A diff line that is worth showing to the user.
 *
 * Intelligent highlighting keeps only the lines that matter:
 *   - lines touching a critical keyword   → critical = true
 *   - big modifications (long, structural) → critical = false but still shown
 *   - trivial punctuation / whitespace fixes are dropped entirely.
 *
 * Color maps directly to a frontend CSS class:
 *   RED    → removed
 *   GREEN  → added
 *   YELLOW → modified
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HighlightedLineDto {

    public enum Kind  { ADDED, REMOVED, CHANGED }

    public enum Color { RED, GREEN, YELLOW }

    /** The line to display (for CHANGED, "before → after"). */
    private String text;

    private Kind kind;

    private Color color;

    /** True if the line touches a keyword from the critical dictionary. */
    private boolean critical;

    /** Canonical keywords detected in this line (may be empty). */
    private List<String> matchedKeywords;
}
