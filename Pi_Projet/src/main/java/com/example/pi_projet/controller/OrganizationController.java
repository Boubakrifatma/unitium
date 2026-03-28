package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.*;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.OrganizationMemberService;
import com.example.pi_projet.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Authorized
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Tag(name = "Organizations", description = "Organization CRUD + member management (Module 1)")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final OrganizationMemberService memberService;

    // ── My Organization ────────────────────────────────────────────────────────

    @Operation(summary = "Get the organization owned by the current user (ADMIN)")
    @GetMapping("/my")
    public ResponseEntity<OrganizationDTO> getMyOrganization(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(organizationService.getByOwnerId(currentUser.getId()));
    }

    // ── Organization CRUD ──────────────────────────────────────────────────────

    @Operation(summary = "Create a new organization")
    @PostMapping
    public ResponseEntity<OrganizationDTO> create(@RequestBody CreateOrganizationRequest body) {
        return ResponseEntity.status(201).body(organizationService.create(body));
    }

    @Operation(summary = "List all organizations")
    @GetMapping
    public ResponseEntity<List<OrganizationDTO>> getAll() {
        return ResponseEntity.ok(organizationService.getAll());
    }

    @Operation(summary = "Get an organization by ID")
    @GetMapping("/{id}")
    public ResponseEntity<OrganizationDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getById(id));
    }

    @Operation(summary = "Update an organization")
    @PutMapping("/{id}")
    public ResponseEntity<OrganizationDTO> update(@PathVariable UUID id, @RequestBody UpdateOrganizationRequest body) {
        return ResponseEntity.ok(organizationService.update(id, body));
    }

    @Operation(summary = "Delete an organization (soft delete)")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        organizationService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Organization deleted successfully."));
    }

    // ── Member Management ──────────────────────────────────────────────────────

    @Operation(summary = "List all members of an organization")
    @GetMapping("/{id}/members")
    public ResponseEntity<List<OrgMemberDTO>> getMembers(@PathVariable UUID id) {
        return ResponseEntity.ok(memberService.getMembers(id));
    }

    @Operation(summary = "Add a member to an organization")
    @PostMapping("/{id}/members")
    public ResponseEntity<OrgMemberDTO> addMember(@PathVariable UUID id, @RequestBody AddOrgMemberRequest body) {
        return ResponseEntity.status(201).body(memberService.addMember(id, body));
    }

    @Operation(summary = "Invite a new user to an organization (creates account + sends email)")
    @PostMapping("/{id}/members/invite")
    public ResponseEntity<OrgMemberDTO> inviteMember(
            @PathVariable UUID id,
            @RequestBody InviteMemberRequest body,
            HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return ResponseEntity.status(201).body(memberService.inviteMember(id, body, currentUser.getId()));
    }

    @Operation(summary = "Change a member's role")
    @PatchMapping("/{id}/members/{memberId}/role")
    public ResponseEntity<OrgMemberDTO> changeRole(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(memberService.changeRole(id, memberId, body.get("role")));
    }

    @Operation(summary = "Remove a member from an organization")
    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<?> removeMember(@PathVariable UUID id, @PathVariable UUID memberId) {
        memberService.removeMember(id, memberId);
        return ResponseEntity.ok(Map.of("message", "Member removed successfully."));
    }
}
