package com.example.pi_projet.service;

import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.ChatRoomRequest;
import com.example.pi_projet.dto.MessageDTO;
import org.springframework.dao.DataIntegrityViolationException;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ScheduledMessage;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ContentType;
import com.example.pi_projet.enums.RecurrenceType;
import com.example.pi_projet.enums.RoomType;
import com.example.pi_projet.enums.ScheduledMessageStatus;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.ReportRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.repository.ScheduledMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ProjectRepository projectRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final ReportRepository reportRepository;
    private final ScheduledMessageRepository scheduledMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private void checkRole(User user) {
        if (user.getRole() != User.RoleName.MANAGER && user.getRole() != User.RoleName.TUTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only MANAGER or TUTOR can manage chat rooms.");
        }
    }

    private ChatRoom getOwnedRoom(Long id, User user) {
        ChatRoom room = chatRoomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));
        if (!room.getCreatedBy().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this chat room.");
        }
        return room;
    }

    public ChatRoomDTO createRoom(ChatRoomRequest body, User currentUser) {
        checkRole(currentUser);
        if (body.projectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId is required.");
        }
        Project project = projectRepository.findById(body.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."));

        ChatRoom room = ChatRoom.builder()
                .project(project)
                .name(body.name())
                .description(body.description())
                .roomType(body.roomType())
                .createdBy(currentUser)
                .build();

        // ── Meeting fields ──────────────────────────────────────────────────────
        if (body.startTime() != null) room.setStartTime(LocalDateTime.parse(body.startTime()));
        if (body.endTime()   != null) room.setEndTime(LocalDateTime.parse(body.endTime()));
        if (body.meetingLink() != null) room.setMeetingLink(body.meetingLink());

        ChatRoom saved;
        try {
            saved = chatRoomRepository.save(room);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A chatroom with the same project, name, and type already exists");
        }

        // ── Auto-create meeting reminders & system message ──────────────────────
        if (saved.getRoomType() == RoomType.meeting && saved.getStartTime() != null) {
            createMeetingReminders(saved, currentUser);
            broadcastMeetingScheduled(saved);
        }

        return ChatRoomDTO.from(saved);
    }

    public List<ChatRoomDTO> getRooms(User currentUser) {
        checkRole(currentUser);
        return chatRoomRepository.findByCreatedBy(currentUser)
                .stream()
                .map(ChatRoomDTO::from)
                .toList();
    }

    public ChatRoomDTO getRoom(Long id, User currentUser) {
        checkRole(currentUser);
        return ChatRoomDTO.from(getOwnedRoom(id, currentUser));
    }

    public ChatRoomDTO updateRoom(Long id, ChatRoomRequest body, User currentUser) {
        checkRole(currentUser);
        ChatRoom room = getOwnedRoom(id, currentUser);
        if (body.name() != null)        room.setName(body.name());
        if (body.description() != null) room.setDescription(body.description());
        if (body.roomType() != null)    room.setRoomType(body.roomType());
        if (body.meetingLink() != null) room.setMeetingLink(body.meetingLink());
        if (body.endTime()   != null)   room.setEndTime(LocalDateTime.parse(body.endTime()));

        // ── Reschedule reminders if startTime changed ───────────────────────────
        if (body.startTime() != null) {
            LocalDateTime newStart = LocalDateTime.parse(body.startTime());
            LocalDateTime oldStart = room.getStartTime();
            if (!newStart.equals(oldStart)) {
                // Cancel existing PENDING meeting reminders for this room
                scheduledMessageRepository
                        .findMeetingRemindersByRoomAndStatus(room, ScheduledMessageStatus.PENDING)
                        .forEach(sm -> {
                            sm.setStatus(ScheduledMessageStatus.CANCELLED);
                            scheduledMessageRepository.save(sm);
                        });
                room.setStartTime(newStart);
                ChatRoom saved;
                try {
                    saved = chatRoomRepository.save(room);
                } catch (DataIntegrityViolationException e) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "A chatroom with the same project, name, and type already exists");
                }
                createMeetingReminders(saved, currentUser);
                return ChatRoomDTO.from(saved);
            }
        }

        try {
            return ChatRoomDTO.from(chatRoomRepository.save(room));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A chatroom with the same project, name, and type already exists");
        }
    }

    //delete avec l'ordre

    //@Transactional = si une étape échoue, tout est annulé . L'ordre de suppression est important pour respecter les contraintes de clés étrangères
    @Transactional
    public void deleteRoom(Long id, User currentUser) {
        checkRole(currentUser);
        getOwnedRoom(id, currentUser);
        scheduledMessageRepository.deleteByRoomId(id);
        messageReactionRepository.deleteByRoomId(id);
        reportRepository.deleteByRoomId(id);
        roomMemberRepository.clearLastReadMessageByRoomId(id);
        roomMemberRepository.deleteByRoomId(id);
        messageRepository.deleteByRoomId(id);
        chatRoomRepository.deleteById(id);
    }

    // ── Meeting helpers ─────────────────────────────────────────────────────────

    private void createMeetingReminders(ChatRoom room, User owner) {
        LocalDateTime startTime = room.getStartTime();
        String roomName = room.getName();

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        String timeStr = startTime.format(timeFmt);

        ScheduledMessage reminder24h = ScheduledMessage.builder()
                .room(room)
                .sender(owner)
                .content("⏰ Reminder: meeting " + roomName + " is tomorrow at " + timeStr)
                .scheduledAt(startTime.minusHours(24))
                .nextSendAt(startTime.minusHours(24))
                .recurrenceType(RecurrenceType.ONCE)
                .recurrenceDays(List.of())
                .status(ScheduledMessageStatus.PENDING)
                .reminderSent(false)
                .build();

        ScheduledMessage reminder1h = ScheduledMessage.builder()
                .room(room)
                .sender(owner)
                .content("⏰ Meeting " + roomName + " starts in 1 hour")
                .scheduledAt(startTime.minusHours(1))
                .nextSendAt(startTime.minusHours(1))
                .recurrenceType(RecurrenceType.ONCE)
                .recurrenceDays(List.of())
                .status(ScheduledMessageStatus.PENDING)
                .reminderSent(false)
                .build();

        ScheduledMessage reminder15m = ScheduledMessage.builder()
                .room(room)
                .sender(owner)
                .content("🔴 Meeting " + roomName + " starts in 15 minutes — get ready")
                .scheduledAt(startTime.minusMinutes(15))
                .nextSendAt(startTime.minusMinutes(15))
                .recurrenceType(RecurrenceType.ONCE)
                .recurrenceDays(List.of())
                .status(ScheduledMessageStatus.PENDING)
                .reminderSent(false)
                .build();

        scheduledMessageRepository.save(reminder24h);
        scheduledMessageRepository.save(reminder1h);
        scheduledMessageRepository.save(reminder15m);
    }

    private void broadcastMeetingScheduled(ChatRoom room) {
        LocalDateTime startTime = room.getStartTime();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("MMMM d, yyyy");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        String content = "📅 Meeting " + room.getName()
                + " has been scheduled for " + startTime.format(dateFmt)
                + " at " + startTime.format(timeFmt);

        Message sysMsg = Message.builder()
                .room(room)
                .sender(room.getCreatedBy())
                .contentText(content)
                .contentType(ContentType.text)
                .isSystemMessage(true)
                .build();

        Message saved = messageRepository.save(sysMsg);
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getId(), (Object) MessageDTO.from(saved));
    }
}
