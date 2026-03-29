package com.example.pi_projet.service;

import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.MessageReactionDTO;
import com.example.pi_projet.entity.ChatRoom;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.enums.ContentType;
import com.example.pi_projet.repository.ChatRoomRepository;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import com.example.pi_projet.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageReactionRepository reactionRepository;
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

    // ── WebSocket text-only send (existing — unchanged) ────────────────────────
    public MessageDTO sendMessage(Long roomId, String content, User sender) {
        ChatRoom room = getAccessibleRoom(roomId, sender);

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .contentText(content)
                .contentType(ContentType.text)
                .build();

        MessageDTO dto = MessageDTO.from(messageRepository.save(message));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, dto);
        return dto;
    }

    // ── Multipart upload: optional text + optional file ────────────────────────
    public MessageDTO sendMessageWithFile(Long roomId, String content,
                                          MultipartFile file, User sender) {
        ChatRoom room = getAccessibleRoom(roomId, sender);

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

        MessageDTO dto = buildDTO(messageRepository.save(builder.build()));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, dto);
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
