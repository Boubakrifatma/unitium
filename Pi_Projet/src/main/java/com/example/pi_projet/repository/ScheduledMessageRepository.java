package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.ScheduledMessage;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ScheduledMessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduledMessageRepository extends JpaRepository<ScheduledMessage, Long> {

    List<ScheduledMessage> findByRoomAndStatus(ChatRoom room, ScheduledMessageStatus status);

    List<ScheduledMessage> findByRoomAndStatusOrderByNextSendAtAsc(ChatRoom room, ScheduledMessageStatus status);

    List<ScheduledMessage> findByStatusAndNextSendAtLessThanEqual(ScheduledMessageStatus status, LocalDateTime now);

    List<ScheduledMessage> findBySenderAndStatus(User sender, ScheduledMessageStatus status);

    List<ScheduledMessage> findByStatusAndNextSendAtBetweenAndReminderSentFalse(
            ScheduledMessageStatus status, LocalDateTime from, LocalDateTime to);
}
