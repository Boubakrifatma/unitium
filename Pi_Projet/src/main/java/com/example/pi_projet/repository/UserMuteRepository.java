package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.UserMute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface UserMuteRepository extends JpaRepository<UserMute, Long> {

    List<UserMute> findByMutedUserAndRoomAndExpiresAtAfter(User user, ChatRoom room, LocalDateTime now);

    boolean existsByMutedUserAndRoomAndExpiresAtAfter(User user, ChatRoom room, LocalDateTime now);
}
