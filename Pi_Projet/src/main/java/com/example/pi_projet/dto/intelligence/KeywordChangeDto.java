package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One entry of the "smart keyword change" detection.
 *
 * Example:
 *   { "keyword": "security", "type": "REMOVED", "riskLevel": "HIGH" }
 *
 * Semantics:
 *   ADDED   → new critical keyword appeared  → risk = FEATURE_UPDATE
 *   REMOVED → critical keyword disappeared   → risk = HIGH
 *   MODIFIED → keyword only moved/reworded   → risk = MEDIUM
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeywordChangeDto {

    public enum ChangeType { ADDED, REMOVED, MODIFIED }

    public enum RiskLevel  { HIGH, MEDIUM, FEATURE_UPDATE, LOW }

    /** Canonical keyword (e.g. "authentication"). Synonyms are resolved to their canonical form. */
    private String keyword;

    private ChangeType type;

    private RiskLevel riskLevel;
}
