package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// Spring Data JPA génère automatiquement le SQL à partir du nom des méthodes
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    List<ChatRoom> findByCreatedBy(User createdBy);
    boolean existsByIdAndCreatedBy(Long id, User createdBy);
}
