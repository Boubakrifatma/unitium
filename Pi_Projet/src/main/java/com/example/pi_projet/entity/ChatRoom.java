package com.example.pi_projet.entity;

import com.example.pi_projet.enums.RoomType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;



//contrainte unique "on ne peut pas avoir 2 same chatrooms"
@Entity
@Table(name = "chat_rooms", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"project_id", "name", "room_type"})
})



@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> Project (required)
    @ManyToOne(optional = false)
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


    //automatique
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Relation inverse
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Message> messages;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomMember> members;



    //hooks JPA qui s'exécutent automatiquement avant l'INSERT ou l'UPDATE
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
