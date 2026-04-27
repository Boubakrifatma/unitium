package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "message_reactions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Stored as the actual unicode emoji character, e.g. '👍'
    @Column(name = "emoji_code", length = 32, nullable = false)
    private String emoji;

    @Column(name = "created_at")
    private LocalDateTime reactedAt;

    @PrePersist
    protected void onCreate() {
        reactedAt = LocalDateTime.now();
    }
}
