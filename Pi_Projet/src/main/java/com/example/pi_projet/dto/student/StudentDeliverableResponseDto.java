package com.example.pi_projet.dto.student;

import com.example.pi_projet.entity.student.StudentDeliverable;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StudentDeliverableResponseDto {

    private Long id;
    private Integer versionNumber;
    private Long parentId;
    private String projectId;
    private String projectName;
    private String title;
    private String description;
    private String fileUrl;
    private String fileType;
    private Long fileSizeKb;

    private Long studentId;
    private String studentName;
    private String studentEmail;

    private Long tutorId;
    private String tutorName;

    private String status;
    private String tutorDecision;
    private Integer score;
    private String tutorFeedback;
    private String reportPath;
    private String virusScanStatus;
    private String virusName;

    private Long evaluatedById;
    private String evaluatedByName;
    private LocalDateTime evaluatedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;

    public static StudentDeliverableResponseDto from(StudentDeliverable d) {
        return StudentDeliverableResponseDto.builder()
                .id(d.getId())
                .versionNumber(d.getVersionNumber())
                .parentId(d.getParentId())
                .projectId(d.getProjectId())
                .projectName(d.getProjectName())
                .title(d.getTitle())
                .description(d.getDescription())
                .fileUrl(d.getFileUrl())
                .fileType(d.getFileType())
                .fileSizeKb(d.getFileSizeKb())
                .studentId(d.getSubmittedBy() != null ? d.getSubmittedBy().getId() : null)
                .studentName(d.getSubmittedBy() != null ? d.getSubmittedBy().getFullName() : null)
                .studentEmail(d.getSubmittedBy() != null ? d.getSubmittedBy().getEmail() : null)
                .tutorId(d.getTutor() != null ? d.getTutor().getId() : null)
                .tutorName(d.getTutor() != null ? d.getTutor().getFullName() : null)
                .status(d.getStatus() != null ? d.getStatus().name() : null)
                .tutorDecision(d.getTutorDecision() != null ? d.getTutorDecision().name() : null)
                .score(d.getScore())
                .tutorFeedback(d.getTutorFeedback())
                .reportPath(d.getReportPath())
                .virusScanStatus(d.getVirusScanStatus())
                .virusName(d.getVirusName())
                .evaluatedById(d.getEvaluatedBy() != null ? d.getEvaluatedBy().getId() : null)
                .evaluatedByName(d.getEvaluatedBy() != null ? d.getEvaluatedBy().getFullName() : null)
                .evaluatedAt(d.getEvaluatedAt())
                .submittedAt(d.getSubmittedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
