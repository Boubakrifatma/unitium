package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.MessageDTO;
import com.example.pi_projet.dto.MessageRequest;
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

    @Operation(summary = "Download / stream a stored file by its stored filename")
    @GetMapping("/api/chat/files/{fileName:.+}")
    @ResponseBody
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String fileName,
            HttpServletRequest request) {
        Resource resource = fileStorageService.getFileAsResource(fileName);

        // 1. Try servlet-context detection first
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (Exception ignored) {}

        // 2. Fall back to Files.probeContentType (JDK NIO)
        if (contentType == null || contentType.isBlank()) {
            try {
                contentType = java.nio.file.Files.probeContentType(resource.getFile().toPath());
            } catch (Exception ignored) {}
        }

        // 3. Manual map for audio types that JDK / servlet containers often miss
        if (contentType == null || contentType.isBlank() || contentType.equals("application/octet-stream")) {
            String lower = fileName.toLowerCase();
            // video
            if (lower.endsWith(".webm"))      contentType = "video/webm";
            else if (lower.endsWith(".mp4"))  contentType = "video/mp4";
            else if (lower.endsWith(".mov"))  contentType = "video/quicktime";
            else if (lower.endsWith(".ogv"))  contentType = "video/ogg";
            else if (lower.endsWith(".avi"))  contentType = "video/x-msvideo";
            else if (lower.endsWith(".mkv"))  contentType = "video/x-matroska";
            // audio
            else if (lower.endsWith(".ogg"))  contentType = "audio/ogg";
            else if (lower.endsWith(".opus")) contentType = "audio/ogg; codecs=opus";
            else if (lower.endsWith(".mp3"))  contentType = "audio/mpeg";
            else if (lower.endsWith(".m4a"))  contentType = "audio/mp4";
            else if (lower.endsWith(".wav"))  contentType = "audio/wav";
            else if (lower.endsWith(".aac"))  contentType = "audio/aac";
            else                              contentType = "application/octet-stream";
        }

        // Use inline disposition so browsers can stream audio/video without forcing a download
        boolean isInline = contentType.startsWith("audio/") || contentType.startsWith("video/")
                || contentType.startsWith("image/") || contentType.equals("application/pdf");
        String disposition = (isInline ? "inline" : "attachment")
                + "; filename=\"" + resource.getFilename() + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .body(resource);
    }

    // ── REST: shared media & files ────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Get all shared files, images and links in a room")
    @GetMapping("/api/chat/rooms/{roomId}/shared")
    @ResponseBody
    public ResponseEntity<List<MessageDTO>> getSharedContent(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.getSharedContent(roomId, currentUser));
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

    // ── REST: edit a message ──────────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Edit a message (only the sender can edit their own message)")
    @PutMapping("/api/chat/rooms/{roomId}/messages/{messageId}")
    @ResponseBody
    public ResponseEntity<MessageDTO> editMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.editMessage(roomId, messageId, body.get("content"), currentUser));
    }

    // ── REST: delete a message ────────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Delete a message (own message, or any message if MANAGER/TUTOR)")
    @DeleteMapping("/api/chat/rooms/{roomId}/messages/{messageId}")
    @ResponseBody
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        messageService.deleteMessage(roomId, messageId, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ── REST: toggle agenda item done ─────────────────────────────────────────

    @Authorized
    @Operation(summary = "Toggle the agendaDone flag on an agenda message")
    @PatchMapping("/api/chat/rooms/{roomId}/messages/{messageId}/agenda-done")
    @ResponseBody
    public ResponseEntity<MessageDTO> toggleAgendaDone(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.toggleAgendaDone(roomId, messageId, currentUser));
    }

    // ── REST: get agenda items for a room ─────────────────────────────────────

    @Authorized
    @Operation(summary = "Get all agenda items for a room ordered by agendaOrder")
    @GetMapping("/api/chat/rooms/{roomId}/agenda")
    @ResponseBody
    public ResponseEntity<List<MessageDTO>> getAgenda(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(messageService.getAgenda(roomId, currentUser));
    }

    // ── WebSocket: send text message ──────────────────────────────────────────

    @MessageMapping("/rooms/{roomId}/send")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload Map<String, String> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        User sender = (User) headerAccessor.getSessionAttributes().get("currentUser");
        boolean isAgendaItem = Boolean.parseBoolean(payload.getOrDefault("isAgendaItem", "false"));
        Integer agendaOrder   = payload.containsKey("agendaOrder")   ? Integer.parseInt(payload.get("agendaOrder"))   : null;
        Integer agendaDuration= payload.containsKey("agendaDuration") ? Integer.parseInt(payload.get("agendaDuration")): null;
        if (isAgendaItem || agendaOrder != null || agendaDuration != null) {
            MessageRequest req = new MessageRequest(payload.get("content"), isAgendaItem, agendaOrder, agendaDuration);
            messageService.sendMessage(roomId, req, sender);
        } else {
            messageService.sendMessage(roomId, payload.get("content"), sender);
        }
    }
}
