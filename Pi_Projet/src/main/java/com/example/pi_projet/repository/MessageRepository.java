package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByRoomOrderByCreatedAtAsc(ChatRoom room);

    List<Message> findByRoomAndIsPinnedTrue(ChatRoom room);

    /** All messages in the room that have a file attachment OR any text content (URL check done in service). */
    @Query("SELECT m FROM Message m WHERE m.room = :room AND (m.fileUrl IS NOT NULL OR m.contentText IS NOT NULL) ORDER BY m.createdAt DESC")
    List<Message> findCandidateSharedContent(@Param("room") ChatRoom room);

    /** All agenda items for a room, ordered by agendaOrder asc. */
    @Query("SELECT m FROM Message m WHERE m.room = :room AND m.isAgendaItem = true ORDER BY m.agendaOrder ASC NULLS LAST")
    List<Message> findAgendaItemsByRoom(@Param("room") ChatRoom room);

    @Modifying
    @Transactional
    @Query("DELETE FROM Message m WHERE m.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.room = :room AND m.createdAt BETWEEN :from AND :to AND (m.isSystemMessage = false OR m.isSystemMessage IS NULL) AND m.isAgendaItem = false")
    long countByRoomAndCreatedAtBetweenAndIsSystemMessageFalseAndIsAgendaItemFalse(
            @Param("room") ChatRoom room,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    List<Message> findByRoomInOrderByCreatedAtDesc(List<ChatRoom> rooms, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.room IN :rooms AND m.createdAt BETWEEN :from AND :to AND (m.isSystemMessage = false OR m.isSystemMessage IS NULL)")
    List<Message> findByRoomInAndCreatedAtBetweenAndIsSystemMessageFalse(
            @Param("rooms") List<ChatRoom> rooms,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
