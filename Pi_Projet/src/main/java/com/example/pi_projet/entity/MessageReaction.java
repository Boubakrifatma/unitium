package com.example.pi_projet.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_reactions")
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> Message
    @ManyToOne
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    // FK -> User
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 8)
    private String emojiCode;

    private LocalDateTime createdAt;
}


