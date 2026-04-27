package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DeliverableNotificationRepository extends JpaRepository<DeliverableNotification, Long> {

    List<DeliverableNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<DeliverableNotification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndIsReadFalse(Long recipientId);

    @Transactional
    @Modifying
    @Query("UPDATE DeliverableNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :id")
    void markAsRead(@Param("id") Long id);

    @Transactional
    @Modifying
    @Query("UPDATE DeliverableNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.recipient.id = :userId")
    void markAllAsReadForUser(@Param("userId") Long userId);
}
