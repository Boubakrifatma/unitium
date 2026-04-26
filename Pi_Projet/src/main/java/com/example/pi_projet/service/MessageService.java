package com.example.pi_projet.service;

import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.MessageReactionDTO;
import com.example.pi_projet.dto.MessageRequest;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ContentType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import com.example.pi_projet.repository.UserMuteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageReactionRepository reactionRepository;
    private final UserMuteRepository userMuteRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;

    // ── package-visible so MessageReactionService can reuse it ─────────────────
    ChatRoom getAccessibleRoom(Long roomId, User user) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat room not found."));

        boolean isOwner = room.getCreatedBy().getId().equals(user.getId());
        boolean isMember = roomMemberRepository.existsByRoomAndUser(room, user);
        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this room.");
        }
        return room;
    }

    // ── Helper: build full MessageDTO with current reactions ───────────────────
    private MessageDTO buildDTO(Message saved) {
        List<MessageReactionDTO> reactions = reactionRepository.findByMessage(saved)
                .stream()
                .map(MessageReactionDTO::from)
                .toList();
        return MessageDTO.from(saved, reactions);
    }

    // ── Mention notifications ──────────────────────────────────────────────────
    private void processMentions(Message message, ChatRoom room, User sender) {
        String content = message.getContentText();
        if (content == null) return;

        List<User> toNotify = new ArrayList<>();

        if (content.contains("@everyone")) {
            roomMemberRepository.findByRoom(room).stream()
                    .map(com.example.pi_projet.entity.RoomMember::getUser)
                    .forEach(toNotify::add);
            toNotify.add(room.getCreatedBy());
        } else {
            Pattern pattern = Pattern.compile("@([\\w]+(?:\\s+[\\w]+)?)");
            Matcher matcher = pattern.matcher(content);
            while (matcher.find()) {
                String mentionedName = matcher.group(1).toLowerCase();
                roomMemberRepository.findByRoom(room).stream()
                        .map(com.example.pi_projet.entity.RoomMember::getUser)
                        .filter(u -> u.getFullName().toLowerCase().contains(mentionedName))
                        .forEach(toNotify::add);
                if (room.getCreatedBy().getFullName().toLowerCase().contains(mentionedName)) {
                    toNotify.add(room.getCreatedBy());
                }
            }
        }

        boolean isEveryone = content.contains("@everyone");
        String preview = content.length() > 60 ? content.substring(0, 60) : content;

        toNotify.stream()
                .filter(u -> !u.getId().equals(sender.getId()))
                .distinct()
                .forEach(user -> {
                    Map<String, Object> notification = new HashMap<>();
                    notification.put("type", "MENTION");
                    notification.put("roomId", room.getId());
                    notification.put("roomName", room.getName());
                    notification.put("senderName", sender.getFullName());
                    notification.put("messagePreview", preview);
                    notification.put("isEveryone", isEveryone);
                    notification.put("sentAt", LocalDateTime.now().toString());
                    messagingTemplate.convertAndSend("/topic/notifications/" + user.getId(), (Object) notification);
                });
    }

    // ── WebSocket text-only send (existing — unchanged) ────────────────────────
    public MessageDTO sendMessage(Long roomId, String content, User sender) {
        ChatRoom room = getAccessibleRoom(roomId, sender);
        checkNotMuted(sender, room);

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .contentText(content)
                .contentType(ContentType.text)
                .build();

        Message saved = messageRepository.save(message);
        MessageDTO dto = MessageDTO.from(saved);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, dto);
        processMentions(saved, room, sender);
        return dto;
    }

    // ── WebSocket send with agenda support ─────────────────────────────────────
    public MessageDTO sendMessage(Long roomId, MessageRequest request, User sender) {
        ChatRoom room = getAccessibleRoom(roomId, sender);
        checkNotMuted(sender, room);

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .contentText(request.content())
                .contentType(ContentType.text)
                .isSystemMessage(false) // agenda items are never system messages
                .isAgendaItem(request.isAgendaItem())
                .agendaOrder(request.agendaOrder())
                .agendaDuration(request.agendaDuration())
                .build();

        Message saved = messageRepository.save(message);
        MessageDTO dto = buildDTO(saved);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, (Object) dto);
        processMentions(saved, room, sender);
        return dto;
    }

    // ── Multipart upload: optional text + optional file ────────────────────────
    public MessageDTO sendMessageWithFile(Long roomId, String content,
                                          MultipartFile file, User sender) {
        ChatRoom room = getAccessibleRoom(roomId, sender);
        checkNotMuted(sender, room);

        Message.MessageBuilder builder = Message.builder()
                .room(room)
                .sender(sender)
                .contentText(content);

        if (file != null && !file.isEmpty()) {
            String storedName = fileStorageService.store(file);
            builder.fileName(file.getOriginalFilename())
                   .fileUrl("/api/chat/files/" + storedName)
                   .fileType(file.getContentType())
                   .fileSize(file.getSize())
                   .fileSizeKb(file.getSize() / 1024.0)
                   .contentType(ContentType.file);
        } else {
            builder.contentType(ContentType.text);
        }

        Message saved = messageRepository.save(builder.build());
        MessageDTO dto = buildDTO(saved);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, dto);
        processMentions(saved, room, sender);
        return dto;
    }

    // ── REST history (existing — unchanged) ────────────────────────────────────
    public List<MessageDTO> getHistory(Long roomId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        return messageRepository.findByRoomOrderByCreatedAtAsc(room)
                .stream()
                .map(this::buildDTO)
                .toList();
    }

    // ── Pin / Unpin ─────────────────────────────────────────────────────────────
    public MessageDTO pinMessage(Long roomId, Long messageId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message does not belong to this room.");
        }

        message.setPinned(true);
        message.setPinnedAt(java.time.LocalDateTime.now());
        message.setPinnedBy(currentUser);

        MessageDTO dto = buildDTO(messageRepository.save(message));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/pinned", dto);
        return dto;
    }

    public MessageDTO unpinMessage(Long roomId, Long messageId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message does not belong to this room.");
        }

        message.setPinned(false);
        message.setPinnedAt(null);
        message.setPinnedBy(null);

        MessageDTO dto = buildDTO(messageRepository.save(message));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/pinned", dto);
        return dto;
    }

    public List<MessageDTO> getPinnedMessages(Long roomId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        return messageRepository.findByRoomAndIsPinnedTrue(room)
                .stream()
                .map(this::buildDTO)
                .toList();
    }

    // ── Delete message ─────────────────────────────────────────────────────────
    @Transactional
    public void deleteMessage(Long roomId, Long messageId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message does not belong to this room.");
        }

        boolean isOwner = message.getSender().getId().equals(currentUser.getId());
        boolean isPrivileged = currentUser.getRole() == User.RoleName.MANAGER
                || currentUser.getRole() == User.RoleName.TUTOR;
        if (!isOwner && !isPrivileged) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to delete this message.");
        }

        reactionRepository.deleteByMessage(message);
        roomMemberRepository.clearLastReadMessageByMessageId(messageId);
        messageRepository.delete(message);

        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, MessageDTO.deleted(messageId, roomId));
    }

    // ── Edit message ───────────────────────────────────────────────────────────
    @Transactional
    public MessageDTO editMessage(Long roomId, Long messageId, String newContent, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message does not belong to this room.");
        }
        if (!message.getSender().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only edit your own messages.");
        }
        message.setContentText(newContent);
        message.setEdited(true);
        message.setEditedAt(java.time.LocalDateTime.now());
        MessageDTO dto = buildDTO(messageRepository.save(message));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, dto);
        return dto;
    }

    // ── Agenda: toggle done ────────────────────────────────────────────────────
    public MessageDTO toggleAgendaDone(Long roomId, Long messageId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (!message.getRoom().getId().equals(room.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message does not belong to this room.");
        }
        message.setAgendaDone(!message.isAgendaDone());
        MessageDTO dto = buildDTO(messageRepository.save(message));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, (Object) dto);
        return dto;
    }

    // ── Agenda: list all agenda items for a room ───────────────────────────────
    public List<MessageDTO> getAgenda(Long roomId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);
        return messageRepository.findAgendaItemsByRoom(room)
                .stream()
                .map(this::buildDTO)
                .toList();
    }

    // ── Mute check ─────────────────────────────────────────────────────────────
    private void checkNotMuted(User sender, ChatRoom room) {
        if (userMuteRepository.existsByMutedUserAndRoomAndExpiresAtAfter(sender, room, LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are muted in this room.");
        }
    }

    // ── Shared Media & Files ────────────────────────────────────────────────────
    private static final Pattern URL_PATTERN =
            Pattern.compile("https?://[^\\s]+", Pattern.CASE_INSENSITIVE);

    public List<MessageDTO> getSharedContent(Long roomId, User currentUser) {
        ChatRoom room = getAccessibleRoom(roomId, currentUser);

        List<MessageDTO> result = new ArrayList<>();

        for (Message m : messageRepository.findCandidateSharedContent(room)) {
            List<MessageReactionDTO> reactions = reactionRepository.findByMessage(m)
                    .stream().map(MessageReactionDTO::from).toList();

            if (m.getFileUrl() != null) {
                // File or Image — determined by MIME type
                String fileType = m.getFileType();
                String category = (fileType != null && fileType.startsWith("image/")) ? "IMAGE" : "FILE";
                result.add(MessageDTO.fromShared(m, reactions, category, null));
            } else if (m.getContentText() != null) {
                // Extract first URL from text — qualify as LINK
                Matcher matcher = URL_PATTERN.matcher(m.getContentText());
                if (matcher.find()) {
                    result.add(MessageDTO.fromShared(m, reactions, "LINK", matcher.group()));
                }
            }
        }

        return result;
    }
}
