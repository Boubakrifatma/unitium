package com.example.pi_projet.dto;

import lombok.Data;

@Data
public class DeliverableCreateDto {

    private Long taskId;
    private String projectId;
    private Long submittedById;

    private String title;
    private String description;

    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;

    // Optional — defaults to "draft" if omitted
    private String status;
}