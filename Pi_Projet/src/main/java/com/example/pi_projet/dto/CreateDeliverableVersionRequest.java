package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDeliverableVersionRequest {
    private Long deliverableId;  // Required
    private String fileUrl;  // Required
    private Long fileSizeKb;  // Optional
    private String changeSummary;  // Optional - what changed in this version

    // Antivirus result (set by upload controller after scan; null for legacy JSON path)
    private String virusScanStatus; // clean | unverified | infected | pending
    private String virusName;       // populated only when infected
}
