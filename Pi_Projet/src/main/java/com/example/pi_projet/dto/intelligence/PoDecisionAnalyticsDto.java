package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Dashboard-ready analytics of historical PO decisions.
 *
 * Example:
 * {
 *   "totalDecisions": 120,
 *   "acceptanceRate": 0.65,
 *   "rejectionRate": 0.12,
 *   "decisionBreakdown": { "validated": 78, "minor_changes": 20, "major_rework": 8, "rejected": 14 },
 *   "topRejectionReasons": [
 *      { "reason": "manque de détails", "count": 9 },
 *      { "reason": "UI non conforme", "count": 5 }
 *   ],
 *   "insights": [
 *      "Most rejections are due to 'manque de détails'",
 *      "High rejection rate for UI tasks"
 *   ]
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoDecisionAnalyticsDto {

    private long totalDecisions;
    private double acceptanceRate;  // validated / total
    private double rejectionRate;   // rejected / total

    private Map<String, Long> decisionBreakdown;
    private List<RejectionReasonCount> topRejectionReasons;
    private List<String> insights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RejectionReasonCount {
        private String reason;
        private long count;
    }
}
