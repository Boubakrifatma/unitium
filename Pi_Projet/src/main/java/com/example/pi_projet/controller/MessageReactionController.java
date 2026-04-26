package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.MessageReactionDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.MessageReactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Authorized
@RestController
@RequestMapping("/api/chat/rooms/{roomId}/messages/{messageId}/reactions")
@RequiredArgsConstructor
@Tag(name = "Message Reactions", description = "Emoji reactions on chat messages")
public class MessageReactionController {

    private final MessageReactionService reactionService;

    @Operation(summary = "Toggle an emoji reaction on a message (add / replace / remove)")
    @PostMapping
    public ResponseEntity<MessageDTO> toggleReaction(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(
                reactionService.toggleReaction(roomId, messageId, body.get("emoji"), currentUser));
    }

    @Operation(summary = "List all reactions on a message")
    @GetMapping
    public ResponseEntity<List<MessageReactionDTO>> getReactions(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(
                reactionService.getReactions(roomId, messageId, currentUser));
    }
}
