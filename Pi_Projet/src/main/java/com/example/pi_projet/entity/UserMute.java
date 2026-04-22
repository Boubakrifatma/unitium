package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_mutes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User mutedUser;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    @ManyToOne
    @JoinColumn(name = "muted_by", nullable = false)
    private User mutedBy;

    private LocalDateTime mutedAt;
    private LocalDateTime expiresAt; // null = permanent

    @PrePersist
    protected void onCreate() {
        mutedAt = LocalDateTime.now();
    }
}
