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

    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long   fileSize;    // size in bytes
    private Double fileSizeKb;  // legacy field kept for compatibility

    @Builder.Default
    private boolean isPinned = false;

    private LocalDateTime pinnedAt;

    @ManyToOne
    @JoinColumn(name = "pinned_by")
    private User pinnedBy;

    // ── Agenda fields ───────────────────────────────────────────────────────────
    @Column(name = "is_agenda_item")
    @Builder.Default
    private boolean isAgendaItem = false;

    @Column(name = "agenda_order")
    private Integer agendaOrder;

    @Column(name = "agenda_duration")
    private Integer agendaDuration; // minutes

    @Column(name = "agenda_done")
    @Builder.Default
    private boolean agendaDone = false;

    @Column(name = "is_edited")
    private boolean isEdited;

    @Column(name = "is_system_message")
    @Builder.Default
    private Boolean isSystemMessage = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;

    // Relation inverse
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MessageReaction> reactions;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
