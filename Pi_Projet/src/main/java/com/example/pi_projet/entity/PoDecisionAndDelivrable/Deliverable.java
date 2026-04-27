package com.example.pi_projet.entity.PoDecisionAndDelivrable;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliverables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deliverable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size_kb")
    private Long fileSizeKb;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliverableStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "po_decision_field")
    private PoDecisionField poDecisionField;

    /**
     * The shared PO-Manager chatroom linked to this deliverable.
     * Set automatically when the PO accepts the deliverable (status = validated).
     * Null until then.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = DeliverableStatus.draft;
        if (currentVersion == null) currentVersion = 1;
        if (poDecisionField == null) poDecisionField = PoDecisionField.pending;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum DeliverableStatus {
        draft, submitted, under_review, revision_required,
        accepted_by_manager, po_review, validated, rejected_final
    }

    public enum PoDecisionField {
        validated, minor_changes, major_rework, rejected, pending
    }
}