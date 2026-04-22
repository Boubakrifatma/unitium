package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Report returned by the duplicate detection endpoint.
 *
 * Example:
 * {
 *   "deliverableId": 42,
 *   "duplicateWarning": true,
 *   "threshold": 0.8,
 *   "matches": [
 *      { "deliverableId": 7, "title": "Login module", "similarity": 0.91 },
 *      { "deliverableId": 3, "title": "Auth service",  "similarity": 0.82 }
 *   ]
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuplicateReportDto {

    private Long deliverableId;
    private boolean duplicateWarning;
    private Double threshold;
    private List<DuplicateMatch> matches;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DuplicateMatch {
        private Long deliverableId;
        private String title;
        private String submittedByName;
        private Double similarity;
    }
}
