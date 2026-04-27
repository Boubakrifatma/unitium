package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableVersionDto {
    private Long id;
    private Long deliverableId;
    private Integer versionNumber;
    private String fileUrl;
    private Long fileSizeKb;
    private String changeSummary;
    private Long submittedById;
    private String submittedByName;
    private LocalDateTime submittedAt;
    private String virusScanStatus;  // "pending" | "clean" | "infected"
}
