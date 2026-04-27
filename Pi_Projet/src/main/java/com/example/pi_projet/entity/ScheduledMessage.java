package com.example.pi_projet.entity;

import com.example.pi_projet.enums.RecurrenceType;
import com.example.pi_projet.enums.ScheduledMessageStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "scheduled_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduledMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Column(nullable = false)
    private LocalDateTime nextSendAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurrenceType recurrenceType;

    @ElementCollection
    @CollectionTable(name = "scheduled_message_days",
            joinColumns = @JoinColumn(name = "scheduled_message_id"))
    @Column(name = "day_of_week")
    private List<String> recurrenceDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScheduledMessageStatus status = ScheduledMessageStatus.PENDING;

    @Builder.Default
    @Column(nullable = false)
    private boolean reminderSent = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = ScheduledMessageStatus.PENDING;
        }
    }
}
