package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.FileStorageService;
import com.example.pi_projet.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Tag(name = "Messages", description = "Chat message history, real-time messaging, and file attachments")
public class MessageController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    // ── REST: message history (unchanged) ──────────────────────────────────────

    @Authorized
    @Operation(summary = "Get message history for a room")
    @GetMapping("/api/chat/rooms/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<List<MessageDTO>> getHistory(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.getHistory(roomId, currentUser));
    }

    // ── REST: upload message with optional file attachment ─────────────────────

    @Authorized
    @Operation(summary = "Send a message with an optional file attachment (multipart/form-data)")
    @PostMapping(value = "/api/chat/rooms/{roomId}/messages/upload",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<MessageDTO> uploadMessage(
            @PathVariable Long roomId,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile file,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.status(201)
                .body(messageService.sendMessageWithFile(roomId, content, file, currentUser));
    }

    // ── REST: file download ────────────────────────────────────────────────────

    @Operation(summary = "Download a stored file by its stored filename")
    @GetMapping("/api/chat/files/{fileName:.+}")
    @ResponseBody
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String fileName,
            HttpServletRequest request) { // request kept for MIME-type detection
        Resource resource = fileStorageService.getFileAsResource(fileName);

        String contentType = "application/octet-stream";
        try {
            String detected = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
            if (detected != null) contentType = detected;
        } catch (Exception ignored) {}

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // ── REST: pin / unpin / list pinned ───────────────────────────────────────

    @Authorized
    @Operation(summary = "Pin a message")
    @PostMapping("/api/chat/rooms/{roomId}/messages/{messageId}/pin")
    @ResponseBody
    public ResponseEntity<MessageDTO> pinMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.pinMessage(roomId, messageId, currentUser));
    }

    @Authorized
    @Operation(summary = "Unpin a message")
    @DeleteMapping("/api/chat/rooms/{roomId}/messages/{messageId}/pin")
    @ResponseBody
    public ResponseEntity<MessageDTO> unpinMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.unpinMessage(roomId, messageId, currentUser));
    }

    @Authorized
    @Operation(summary = "Get all pinned messages in a room")
    @GetMapping("/api/chat/rooms/{roomId}/messages/pinned")
    @ResponseBody
    public ResponseEntity<List<MessageDTO>> getPinnedMessages(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.getPinnedMessages(roomId, currentUser));
    }

    // ── WebSocket: send text message (unchanged) ───────────────────────────────

    @MessageMapping("/rooms/{roomId}/send")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload Map<String, String> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        User sender = (User) headerAccessor.getSessionAttributes().get("currentUser");
        messageService.sendMessage(roomId, payload.get("content"), sender);
    }
}
