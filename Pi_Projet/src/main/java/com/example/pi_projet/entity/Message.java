package com.example.pi_projet.entity;

import com.example.pi_projet.enums.ContentType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> ChatRoom
    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    // FK -> User (sender)
    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(columnDefinition = "TEXT")
    private String contentText;

    @Enumerated(EnumType.STRING)
    private ContentType contentType;

    private String fileName;    // original filename e.g. "report.pdf"
    private String fileUrl;     // download path  e.g. "/api/chat/files/uuid_report.pdf"
    private String fileType;    // MIME type      e.g. "application/pdf"
    private Long   fileSize;    // size in bytes
    private Double fileSizeKb;  // legacy field kept for compatibility

    @Builder.Default
    private boolean isPinned = false;

    private LocalDateTime pinnedAt;

    @ManyToOne
    @JoinColumn(name = "pinned_by")
    private User pinnedBy;

    private boolean isEdited;

    private LocalDateTime editedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;

    // Relation inverse
    @OneToMany(mappedBy = "message")
    private List<MessageReaction> reactions;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
