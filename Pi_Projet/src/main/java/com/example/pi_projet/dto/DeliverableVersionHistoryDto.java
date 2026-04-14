package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST: Create New Deliverable Version
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE: Deliverable Version
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE: Deliverable with All Versions
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE: Version History Item (for timeline view)
// ═══════════════════════════════════════════════════════════════════════════

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableVersionHistoryDto {
    private Integer versionNumber;
    private LocalDateTime submittedAt;
    private String changeSummary;
    private String virusScanStatus;
    private String employeeName;
    private String managerFeedback;  // From latest review of this version
    private Float managerScore;  // From latest review of this version
    private String managerDecision;  // From latest review of this version
}