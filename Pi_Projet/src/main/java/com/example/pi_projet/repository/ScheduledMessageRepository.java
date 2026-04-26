package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.ScheduledMessage;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ScheduledMessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduledMessageRepository extends JpaRepository<ScheduledMessage, Long> {

    List<ScheduledMessage> findByRoomAndStatus(ChatRoom room, ScheduledMessageStatus status);

    List<ScheduledMessage> findByRoomAndStatusOrderByNextSendAtAsc(ChatRoom room, ScheduledMessageStatus status);

    List<ScheduledMessage> findByStatusAndNextSendAtLessThanEqual(ScheduledMessageStatus status, LocalDateTime now);

    @Query("SELECT s.id FROM ScheduledMessage s WHERE s.status = :status AND s.nextSendAt <= :now")
    List<Long> findIdsByStatusAndNextSendAtLessThanEqual(
            @Param("status") ScheduledMessageStatus status, @Param("now") LocalDateTime now);

    List<ScheduledMessage> findBySenderAndStatus(User sender, ScheduledMessageStatus status);

    List<ScheduledMessage> findByStatusAndNextSendAtBetweenAndReminderSentFalse(
            ScheduledMessageStatus status, LocalDateTime from, LocalDateTime to);

    @Modifying
    @Query("DELETE FROM ScheduledMessage s WHERE s.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") Long roomId);

    /** Meeting reminders: PENDING messages for a room whose content contains reminder keywords. */
    @Query("SELECT s FROM ScheduledMessage s WHERE s.room = :room AND s.status = :status " +
           "AND (s.content LIKE '%Reminder%' OR s.content LIKE '%starts in%')")
    List<ScheduledMessage> findMeetingRemindersByRoomAndStatus(
            @Param("room") ChatRoom room, @Param("status") ScheduledMessageStatus status);
}
