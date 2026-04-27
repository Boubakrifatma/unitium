package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ScheduledMessageDTO;
import com.example.pi_projet.dto.ScheduledMessageRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.ScheduledMessageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ScheduledMessageController {

    private final ScheduledMessageService scheduledMessageService;

    // ── POST /api/chat/rooms/{roomId}/scheduled — create scheduled message ──────
    @Authorized
    @PostMapping("/api/chat/rooms/{roomId}/scheduled")
    public ResponseEntity<ScheduledMessageDTO> create(
            @PathVariable Long roomId,
            @RequestBody ScheduledMessageRequest body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scheduledMessageService.createScheduledMessage(roomId, body, currentUser));
    }

    // ── GET /api/chat/rooms/{roomId}/scheduled — list PENDING for room ──────────
    @Authorized
    @GetMapping("/api/chat/rooms/{roomId}/scheduled")
    public ResponseEntity<List<ScheduledMessageDTO>> list(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(scheduledMessageService.getScheduledMessages(roomId, currentUser));
    }

    // ── PUT /api/chat/rooms/{roomId}/scheduled/{id} — edit ─────────────────────
    @Authorized
    @PutMapping("/api/chat/rooms/{roomId}/scheduled/{id}")
    public ResponseEntity<ScheduledMessageDTO> edit(
            @PathVariable Long roomId,
            @PathVariable Long id,
            @RequestBody ScheduledMessageRequest body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(scheduledMessageService.editScheduledMessage(id, body, currentUser));
    }

    // ── DELETE /api/chat/rooms/{roomId}/scheduled/{id} — cancel ────────────────
    @Authorized
    @DeleteMapping("/api/chat/rooms/{roomId}/scheduled/{id}")
    public ResponseEntity<Void> cancel(
            @PathVariable Long roomId,
            @PathVariable Long id,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        scheduledMessageService.cancelScheduledMessage(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ── GET /api/chat/scheduled/mine — all PENDING for current user ─────────────
    @Authorized
    @GetMapping("/api/chat/scheduled/mine")
    public ResponseEntity<List<ScheduledMessageDTO>> mine(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(scheduledMessageService.getMyScheduledMessages(currentUser));
    }
}
