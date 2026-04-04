package com.example.pi_projet.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_members")
public class RoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> ChatRoom
    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    // FK -> User
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // FK -> Message (last read)
    @ManyToOne
    @JoinColumn(name = "last_read_message_id")
    private Message lastReadMessage;


    private LocalDateTime joinedAt;
}



