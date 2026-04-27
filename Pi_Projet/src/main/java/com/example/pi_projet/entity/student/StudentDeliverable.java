package com.example.pi_projet.entity.student;

import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_deliverables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudentDeliverable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** 1 for the original submission; incremented for each subsequent version. */
    @Builder.Default
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber = 1;

    /** Null for the original; points to the original deliverable id for all later versions. */
    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "project_id", length = 36)
    private String projectId;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size_kb")
    private Long fileSizeKb;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutor_id")
    private User tutor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StudentDeliverableStatus status;

    /** Tutor's final decision. Null until tutor evaluates. */
    @Enumerated(EnumType.STRING)
    @Column(name = "tutor_decision")
    private TutorDecision tutorDecision;

    /** Score 0–100. Null until tutor evaluates (suggested or manual). */
    @Column
    private Integer score;

    @Column(name = "tutor_feedback", columnDefinition = "TEXT")
    private String tutorFeedback;

    /** Virus scan outcome: clean | unverified | infected | pending */
    @Column(name = "virus_scan_status", length = 20)
    private String virusScanStatus;

    /** Virus/malware name when infected; null otherwise. */
    @Column(name = "virus_name")
    private String virusName;

    /** JSON blob of the detailed comparison result (stored for reporting). */
    @Column(name = "comparison_result", columnDefinition = "LONGTEXT")
    private String comparisonResult;

    /** Path to the generated PDF report on disk. */
    @Column(name = "report_path")
    private String reportPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluated_by")
    private User evaluatedBy;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
        updatedAt   = LocalDateTime.now();
        if (status == null) status = StudentDeliverableStatus.SUBMITTED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum StudentDeliverableStatus {
        SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED
    }

    public enum TutorDecision {
        ACCEPTED, REJECTED
    }
}
