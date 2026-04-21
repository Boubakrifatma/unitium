package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Short human-readable summary of what changed between two versions. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoSummaryDto {
    private String summary;       // ex: "3 lines added, 1 removed"
    private String nlpSummary;    // optional: filled if Python NLP is reachable
    private String impactLevel;
}
