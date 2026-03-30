package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.dto.ChatRoomRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.ChatRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Authorized //verifier que user est connecté avant d'acceder a n importe route
@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
@Tag(name = "Chat Rooms", description = "Chat room management — MANAGER and TUTOR only")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @Operation(summary = "Create a new chat room")
    @PostMapping
    public ResponseEntity<ChatRoomDTO> createRoom(@RequestBody ChatRoomRequest body, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser"); //recupere user connecté
        return ResponseEntity.status(201).body(chatRoomService.createRoom(body, currentUser));
    }

    @Operation(summary = "List chat rooms created by the current user")
    @GetMapping
    public ResponseEntity<List<ChatRoomDTO>> getRooms(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.getRooms(currentUser));
    }

    @Operation(summary = "Get a chat room by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ChatRoomDTO> getRoom(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.getRoom(id, currentUser));
    }

    @Operation(summary = "Update a chat room")
    @PutMapping("/{id}")
    public ResponseEntity<ChatRoomDTO> updateRoom(@PathVariable Long id,
                                                   @RequestBody ChatRoomRequest body,
                                                   HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(chatRoomService.updateRoom(id, body, currentUser));
    }

    @Operation(summary = "Delete a chat room")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        chatRoomService.deleteRoom(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
