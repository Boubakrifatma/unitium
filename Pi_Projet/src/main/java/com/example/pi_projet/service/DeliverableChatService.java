package com.example.pi_projet.service;

import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.RoomMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ContentType;
import com.example.pi_projet.enums.RoomType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliverableChatService {

    private final ChatRoomRepository      chatRoomRepository;
    private final RoomMemberRepository    roomMemberRepository;
    private final MessageRepository       messageRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final SimpMessagingTemplate   messagingTemplate;

    @Transactional
    public ChatRoom ensurePoManagerRoom(Deliverable deliverable, User po) {

        UUID projectId = deliverable.getProject().getId();

        User manager = resolveManager(projectId);
        if (manager == null) {
            log.warn("No manager found for deliverable {}; skipping chatroom creation.", deliverable.getId());
            return null;
        }

        ChatRoom room = chatRoomRepository
                .findPoManagerRoom(projectId, RoomType.po_manager, po.getId(), manager.getId())
                .orElseGet(() -> createRoom(deliverable, po, manager));

        addMemberIfAbsent(room, po);
        addMemberIfAbsent(room, manager);

        postAcceptanceNotification(room, deliverable, po, manager);

        return room;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User resolveManager(UUID projectId) {
        List<User> managers = projectMemberRepository
                .findUsersByProjectIdAndRole(projectId, ProjectMember.ProjectRole.PROJECT_MANAGER);
        if (!managers.isEmpty()) {
            return managers.get(0);
        }
        log.warn("No PROJECT_MANAGER found in project {}.", projectId);
        return null;
    }

    private ChatRoom createRoom(Deliverable deliverable, User po, User manager) {
        String projectName = deliverable.getProject().getName();
        String roomName    = "PO & Manager - " + projectName;
        String description = "Shared space for " + po.getFullName()
                + " and " + manager.getFullName()
                + " on project " + projectName;

        ChatRoom room = ChatRoom.builder()
                .project(deliverable.getProject())
                .createdBy(manager)
                .productOwnerId(po.getId())
                .name(roomName)
                .description(description)
                .roomType(RoomType.po_manager)
                .build();

        ChatRoom saved = chatRoomRepository.save(room);
        log.info("Created po_manager room {} for project {}, PO={}, manager={}",
                saved.getId(), deliverable.getProject().getId(), po.getId(), manager.getId());
        return saved;
    }

    private void addMemberIfAbsent(ChatRoom room, User user) {
        if (!roomMemberRepository.existsByRoomAndUser(room, user)) {
            roomMemberRepository.save(
                    RoomMember.builder()
                            .room(room)
                            .user(user)
                            .build());
        }
    }

    private void postAcceptanceNotification(ChatRoom room, Deliverable deliverable,
                                             User po, User manager) {
        String text = "Deliverable \"" + deliverable.getTitle() + "\" has been accepted by "
                + po.getFullName() + ". This chatroom is available for communication between "
                + po.getFullName() + " and " + manager.getFullName() + ".";

        Message msg = Message.builder()
                .room(room)
                .sender(po)
                .contentText(text)
                .contentType(ContentType.text)
                .isSystemMessage(true)
                .build();

        Message saved = messageRepository.save(msg);

        com.example.pi_projet.dto.MessageDTO dto = com.example.pi_projet.dto.MessageDTO.from(saved);
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getId(), (Object) dto);

        sendRoomNotification(po.getId(),      room, deliverable.getTitle());
        sendRoomNotification(manager.getId(), room, deliverable.getTitle());
    }

    private void sendRoomNotification(Long userId, ChatRoom room, String deliverableTitle) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type",             "DELIVERABLE_ROOM_READY");
        payload.put("roomId",           room.getId());
        payload.put("roomName",         room.getName());
        payload.put("deliverableTitle", deliverableTitle);
        payload.put("sentAt",           LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, (Object) payload);
    }
}
