package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "deliverable_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliverableVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverable_id", nullable = false)
    private Deliverable deliverable;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_size_kb")
    private Long fileSizeKb;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "virus_scan_status")
    @Enumerated(EnumType.STRING)
    private VirusScanStatus virusScanStatus;  // pending | clean | infected

    @PrePersist
    protected void onCreate() {
        if (virusScanStatus == null) {
            virusScanStatus = VirusScanStatus.pending;
        }
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }

    public enum VirusScanStatus {
        pending, clean, infected
    }
}