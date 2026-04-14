package com.example.pi_projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadResponse {
    /** Relative URL to use as fileUrl in deliverable/version creation, e.g. /api/files/deliverables/uuid.pdf */
    private String fileUrl;
    private String originalName;
    private String fileType;
    private Long fileSizeKb;
}
