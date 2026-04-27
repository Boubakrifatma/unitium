package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ChatRoomDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.RoomMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Authorized
@RestController
@RequestMapping("/api/chat/members")
@RequiredArgsConstructor
@Tag(name = "My Rooms", description = "Rooms the current EMPLOYEE or STUDENT has been added to")
public class MyRoomsController {

    private final RoomMemberService roomMemberService;

    @Operation(summary = "List rooms the current user is a member of (EMPLOYEE or STUDENT only)")
    @GetMapping("/my-rooms")
    public ResponseEntity<List<ChatRoomDTO>> getMyRooms(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(roomMemberService.getMyRooms(currentUser));
    }
}
