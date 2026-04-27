package com.example.pi_projet.service;

import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.MessageReactionDTO;
import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.MessageReaction;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.MessageReactionRepository;
import com.example.pi_projet.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MessageReactionService {

    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;
    private final MessageService messageService; // reuses access-check logic
    private final SimpMessagingTemplate messagingTemplate;

    /** Build the current full MessageDTO (with reactions) for a message. */
    private MessageDTO buildMessageDTO(Message message) {
        List<MessageReactionDTO> reactions = reactionRepository.findByMessage(message)
                .stream()
                .map(MessageReactionDTO::from)
                .toList();
        return MessageDTO.from(message, reactions);
    }

    public MessageDTO toggleReaction(Long roomId, Long messageId, String emoji, User currentUser) {
        // 1. Access check (throws 403 / 404)
        messageService.getAccessibleRoom(roomId, currentUser);

        // 2. Fetch the message
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));

        // 3. Verify message belongs to the room
        if (!message.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found in this room.");
        }

        // 4. Toggle logic
        Optional<MessageReaction> existing = reactionRepository.findByMessageAndUser(message, currentUser);

        if (existing.isPresent()) {
            MessageReaction reaction = existing.get();
            if (reaction.getEmoji().equals(emoji)) {
                // Same emoji → remove (toggle off)
                reactionRepository.deleteByMessageAndUser(message, currentUser);
            } else {
                // Different emoji → replace
                reaction.setEmoji(emoji);
                reactionRepository.save(reaction);
            }
        } else {
            // No previous reaction → create
            reactionRepository.save(MessageReaction.builder()
                    .message(message)
                    .user(currentUser)
                    .emoji(emoji)
                    .build());
        }

        // 5. Broadcast updated message (with fresh reactions) to the room topic
        MessageDTO updated = buildMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, updated);
        return updated;
    }

    public List<MessageReactionDTO> getReactions(Long roomId, Long messageId, User currentUser) {
        messageService.getAccessibleRoom(roomId, currentUser);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));

        if (!message.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found in this room.");
        }

        return reactionRepository.findByMessage(message)
                .stream()
                .map(MessageReactionDTO::from)
                .toList();
    }
}
