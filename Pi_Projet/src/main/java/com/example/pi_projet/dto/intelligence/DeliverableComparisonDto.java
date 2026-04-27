package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response payload for the tutor "compare two students' deliverables" feature.
 *
 *  - meta about each deliverable (who submitted, file name, length)
 *  - a similarity score (0..1) between the two file contents
 *  - the rich VersionDiffDto already used by the version-compare UI
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliverableComparisonDto {

    private Side left;
    private Side right;
    private double similarity;
    private boolean possiblePlagiarism;
    private VersionDiffDto diff;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Side {
        private Long deliverableId;
        private String title;
        private Long submittedById;
        private String submittedByName;
        private String fileUrl;
        private String fileType;
        private int textLength;
        private boolean extracted; // false if file missing or unsupported
    }
}
