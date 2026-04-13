package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.MessageReaction;
import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    List<MessageReaction> findByMessage(Message message);

    Optional<MessageReaction> findByMessageAndUser(Message message, User user);

    @Transactional
    void deleteByMessageAndUser(Message message, User user);

    @Transactional
    void deleteByMessage(Message message);

    @Modifying
    @Transactional
    @Query("DELETE FROM MessageReaction mr WHERE mr.message.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT COUNT(mr) FROM MessageReaction mr WHERE mr.user = :user AND mr.message.room IN :rooms")
    long countByUserAndMessageRoomIn(@Param("user") User user, @Param("rooms") List<ChatRoom> rooms);
}
