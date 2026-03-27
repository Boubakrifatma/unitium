package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.RoomMemberDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.RoomMemberService;
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
@RequestMapping("/api/chat/rooms/{roomId}/members")
@RequiredArgsConstructor
@Tag(name = "Room Members", description = "Room member management — MANAGER (EMPLOYEE) and TUTOR (STUDENT) only")
public class RoomMemberController {

    private final RoomMemberService roomMemberService;

    @Operation(summary = "Add a member to a chat room")
    @PostMapping
    public ResponseEntity<RoomMemberDTO> addMember(
            @PathVariable Long roomId,
            @RequestBody Map<String, Long> body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.status(201).body(
                roomMemberService.addMember(roomId, body.get("userId"), currentUser));
    }

    @Operation(summary = "Remove a member from a chat room")
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        roomMemberService.removeMember(roomId, userId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List members of a chat room")
    @GetMapping
    public ResponseEntity<List<RoomMemberDTO>> getMembers(
            @PathVariable Long roomId,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(roomMemberService.getMembers(roomId, currentUser));
    }
}
