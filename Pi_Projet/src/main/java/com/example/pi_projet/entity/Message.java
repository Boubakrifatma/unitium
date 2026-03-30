package com.example.pi_projet.entity;

import com.example.pi_projet.enums.ContentType;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.List;
@Entity
@Table(name = "messages")
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

    private String fileUrl;
    private Double fileSizeKb;

    private boolean isPinned;
    private boolean isEdited;

    private LocalDateTime editedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;

    // Relation inverse
    @OneToMany(mappedBy = "message")
    private List<MessageReaction> reactions;
}



