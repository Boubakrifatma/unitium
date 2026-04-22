package com.example.pi_projet.service;

import com.example.pi_projet.dto.ScheduledMessageDTO;
import com.example.pi_projet.dto.ScheduledMessageRequest;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.ScheduledMessage;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.RecurrenceType;
import com.example.pi_projet.enums.ScheduledMessageStatus;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.repository.ScheduledMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ScheduledMessageService {

    private final ScheduledMessageRepository scheduledMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Role guard ──────────────────────────────────────────────────────────────
    private void checkRole(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only MANAGER or TUTOR can manage scheduled messages.");
        }
    }

    // ── Room access guard ───────────────────────────────────────────────────────
    private ChatRoom getAccessibleRoom(Long roomId, User user) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));
        boolean isOwner = room.getCreatedBy().getId().equals(user.getId());
        boolean isMember = roomMemberRepository.existsByRoomAndUser(room, user);
        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this room.");
        }
        return room;
    }

    // ── Create ──────────────────────────────────────────────────────────────────
    public ScheduledMessageDTO createScheduledMessage(Long roomId, ScheduledMessageRequest body, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getAccessibleRoom(roomId, currentUser);

        if (!body.scheduledAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scheduled time must be in the future.");
        }

        RecurrenceType recurrenceType = parseRecurrenceType(body.recurrenceType());

        List<String> recurrenceDays = body.recurrenceDays() != null ? body.recurrenceDays() : List.of();
        if (recurrenceType == RecurrenceType.CUSTOM && recurrenceDays.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select at least one day.");
        }

        ScheduledMessage msg = ScheduledMessage.builder()
                .room(room)
                .sender(currentUser)
                .content(body.content())
                .scheduledAt(body.scheduledAt())
                .nextSendAt(body.scheduledAt())
                .recurrenceType(recurrenceType)
                .recurrenceDays(recurrenceDays)
                .status(ScheduledMessageStatus.PENDING)
                .reminderSent(false)
                .build();

        return ScheduledMessageDTO.from(scheduledMessageRepository.save(msg));
    }

    // ── List PENDING for a room ─────────────────────────────────────────────────
    public List<ScheduledMessageDTO> getScheduledMessages(Long roomId, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        return scheduledMessageRepository
                .findByRoomAndStatusOrderByNextSendAtAsc(room, ScheduledMessageStatus.PENDING)
                .stream()
                .map(ScheduledMessageDTO::from)
                .toList();
    }

    // ── List PENDING across all rooms for the current user ─────────────────────
    public List<ScheduledMessageDTO> getMyScheduledMessages(User currentUser) {
        checkRole(currentUser);
        return scheduledMessageRepository
                .findBySenderAndStatus(currentUser, ScheduledMessageStatus.PENDING)
                .stream()
                .map(ScheduledMessageDTO::from)
                .toList();
    }

    // ── Edit ────────────────────────────────────────────────────────────────────
    public ScheduledMessageDTO editScheduledMessage(Long id, ScheduledMessageRequest body, User currentUser) {
        checkRole(currentUser);
        ScheduledMessage msg = scheduledMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled message not found."));
        if (!msg.getSender().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only edit your own scheduled messages.");
        }
        if (msg.getStatus() != ScheduledMessageStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot edit a message that has already been sent or cancelled.");
        }

        RecurrenceType recurrenceType = parseRecurrenceType(body.recurrenceType());
        List<String> recurrenceDays = body.recurrenceDays() != null ? body.recurrenceDays() : List.of();

        msg.setContent(body.content());
        msg.setScheduledAt(body.scheduledAt());
        msg.setNextSendAt(body.scheduledAt());
        msg.setRecurrenceType(recurrenceType);
        msg.setRecurrenceDays(recurrenceDays);

        return ScheduledMessageDTO.from(scheduledMessageRepository.save(msg));
    }

    // ── Cancel ──────────────────────────────────────────────────────────────────
    public void cancelScheduledMessage(Long id, User currentUser) {
        checkRole(currentUser);
        ScheduledMessage msg = scheduledMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled message not found."));
        if (!msg.getSender().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only cancel your own scheduled messages.");
        }
        if (msg.getStatus() != ScheduledMessageStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot cancel a message that has already been sent or cancelled.");
        }

        msg.setStatus(ScheduledMessageStatus.CANCELLED);
        scheduledMessageRepository.save(msg);

        broadcast("/topic/rooms/" + msg.getRoom().getId() + "/scheduled",
                Map.of("type", "CANCELLED", "scheduledMessageId", id));
    }

    // ── Background job: send due messages ──────────────────────────────────────
    @Transactional
    public void processScheduledMessages() {
        List<ScheduledMessage> due = scheduledMessageRepository
                .findByStatusAndNextSendAtLessThanEqual(ScheduledMessageStatus.PENDING, LocalDateTime.now());

        for (ScheduledMessage msg : due) {
            String preview = preview(msg.getContent());
            try {
                messageService.sendMessage(msg.getRoom().getId(), msg.getContent(), msg.getSender());

                LocalDateTime nextSendAt = computeNextSendAt(msg);
                if (nextSendAt == null) {
                    msg.setStatus(ScheduledMessageStatus.SENT);
                } else {
                    msg.setNextSendAt(nextSendAt);
                    msg.setReminderSent(false);
                }
                scheduledMessageRepository.save(msg);

                boolean isMeetingReminder = msg.getContent().contains("Reminder")
                        || msg.getContent().contains("starts in");
                java.util.Map<String, Object> sentPayload = new java.util.HashMap<>();
                sentPayload.put("type", "SCHEDULED_SENT");
                sentPayload.put("roomId", msg.getRoom().getId());
                sentPayload.put("roomName", msg.getRoom().getName());
                sentPayload.put("messagePreview", preview);
                sentPayload.put("sentAt", LocalDateTime.now().toString());
                if (isMeetingReminder) {
                    sentPayload.put("meetingReminderType", "MEETING_REMINDER");
                    sentPayload.put("meetingLink", msg.getRoom().getMeetingLink());
                }
                broadcast("/topic/notifications/" + msg.getSender().getId(), sentPayload);
            } catch (Exception e) {
                msg.setStatus(ScheduledMessageStatus.FAILED);
                scheduledMessageRepository.save(msg);

                broadcast("/topic/notifications/" + msg.getSender().getId(),
                        Map.of(
                                "type", "SCHEDULED_FAILED",
                                "roomId", msg.getRoom().getId(),
                                "roomName", msg.getRoom().getName(),
                                "messagePreview", preview
                        ));
            }
        }
    }

    // ── Background job: 15-minute reminders ────────────────────────────────────
    public void process15MinReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusMinutes(15);

        List<ScheduledMessage> upcoming = scheduledMessageRepository
                .findByStatusAndNextSendAtBetweenAndReminderSentFalse(ScheduledMessageStatus.PENDING, now, soon);

        for (ScheduledMessage msg : upcoming) {
            broadcast("/topic/notifications/" + msg.getSender().getId(),
                    Map.of(
                            "type", "SCHEDULED_REMINDER",
                            "roomId", msg.getRoom().getId(),
                            "roomName", msg.getRoom().getName(),
                            "messagePreview", preview(msg.getContent()),
                            "nextSendAt", msg.getNextSendAt().toString()
                    ));
            msg.setReminderSent(true);
            scheduledMessageRepository.save(msg);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** Resolves the ambiguous convertAndSend(D,Object) vs convertAndSend(Object,Map) overloads. */
    private void broadcast(String destination, Map<String, Object> payload) {
        messagingTemplate.convertAndSend(destination, (Object) payload);
    }

    private String preview(String content) {
        return content.length() > 60 ? content.substring(0, 60) : content;
    }

    private RecurrenceType parseRecurrenceType(String raw) {
        try {
            return RecurrenceType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid recurrenceType: " + raw + ". Must be one of ONCE, DAILY, WEEKDAYS, WEEKLY, CUSTOM.");
        }
    }

    private LocalDateTime computeNextSendAt(ScheduledMessage msg) {
        LocalDateTime current = msg.getNextSendAt();
        return switch (msg.getRecurrenceType()) {
            case ONCE -> null;
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case WEEKDAYS -> {
                LocalDateTime next = current.plusDays(1);
                while (next.getDayOfWeek() == DayOfWeek.SATURDAY
                        || next.getDayOfWeek() == DayOfWeek.SUNDAY) {
                    next = next.plusDays(1);
                }
                yield next;
            }
            case CUSTOM -> {
                List<DayOfWeek> days = msg.getRecurrenceDays().stream()
                        .map(d -> DayOfWeek.valueOf(d.toUpperCase()))
                        .sorted(Comparator.comparingInt(DayOfWeek::getValue))
                        .toList();
                LocalDateTime next = current.plusDays(1);
                for (int i = 0; i < 7; i++) {
                    if (days.contains(next.getDayOfWeek())) {
                        yield next;
                    }
                    next = next.plusDays(1);
                }
                yield null; // no matching day found — mark as SENT
            }
        };
    }
}
