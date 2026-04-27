package com.example.pi_projet.dto.student;

import lombok.Data;

@Data
public class StudentDeliverableCreateDto {
    private Long studentId;
    private Long tutorId;
    private String title;
    private String description;
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;
    private String virusScanStatus;
    private String virusName;
    private String projectId;
    private String projectName;
}
