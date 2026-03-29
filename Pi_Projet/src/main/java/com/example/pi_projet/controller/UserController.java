package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.CreateUserRequest;
import com.example.pi_projet.dto.UpdateUserRequest;
import com.example.pi_projet.dto.UserDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.OrganizationMemberService;
import com.example.pi_projet.service.OrganizationService;
import com.example.pi_projet.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Authorized
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management endpoints (admin)")
public class UserController {

    private final UserService userService;
    private final OrganizationService organizationService;
    private final OrganizationMemberService memberService;

    @Operation(summary = "Create a new user")
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@RequestBody CreateUserRequest body) {
        return ResponseEntity.status(201).body(userService.createUser(body));
    }

    @Operation(summary = "List users — SUPER_ADMIN sees all, ADMIN sees only their org members")
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser.getRole() == User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.ok(userService.getAllUsers());
        }
        // ADMIN: only members of their organization
        try {
            var org = organizationService.getByOwnerId(currentUser.getId());
            return ResponseEntity.ok(memberService.getMemberUsers(org.id()));
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @Operation(summary = "Get a user by ID")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "Update user name, email or avatar")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest body) {
        return ResponseEntity.ok(userService.updateUser(id, body));
    }

    @Operation(summary = "Delete a user")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully."));
    }

    @Operation(summary = "Search users by name or email")
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam String q) {
        return ResponseEntity.ok(userService.searchUsers(q));
    }

    @Operation(summary = "Change user role (ADMIN, MANAGER, EMPLOYEE...)")
    @PatchMapping("/{id}/role")
    public ResponseEntity<UserDTO> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.changeRole(id, body.get("role")));
    }

    @Operation(summary = "Activate or deactivate a user")
    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDTO> changeStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(userService.changeStatus(id, body.get("isActive")));
    }

    /**
     * PATCH /api/users/{id}/password
     * Allows an org admin to change their default password after first login.
     * Body: { "oldPassword": "...", "newPassword": "..." }
     */
    @Operation(summary = "Change user password (self-service — used after first login)")
    @PatchMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        userService.changePassword(id, body.get("oldPassword"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    @Operation(summary = "Upload avatar photo for a user")
    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDTO> uploadAvatar(@PathVariable Long id,
                                                @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(id, file));
    }
}
