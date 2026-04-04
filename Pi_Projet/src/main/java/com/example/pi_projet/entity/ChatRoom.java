package com.example.pi_projet.entity;

import com.example.pi_projet.enums.RoomType;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "chat_rooms")
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> Project
    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    // FK -> User (creator)
    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    private String name;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    private String description;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Relation inverse
    @OneToMany(mappedBy = "room")
    private List<Message> messages;

    @OneToMany(mappedBy = "room")
    private List<RoomMember> members;
}














