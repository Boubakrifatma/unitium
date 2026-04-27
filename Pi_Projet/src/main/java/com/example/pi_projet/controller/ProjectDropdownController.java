package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ProjectDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.ProjectRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Authorized
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project endpoints")
public class ProjectDropdownController {

    private final ProjectRepository projectRepository;

    @Operation(summary = "List projects the current user is a member of — used for chat room dropdowns")
    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getMyProjects(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        if (currentUser.getRole() != User.RoleName.MANAGER
                && currentUser.getRole() != User.RoleName.TUTOR
                && currentUser.getRole() != User.RoleName.PRODUCT_OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only MANAGER, TUTOR or PRODUCT_OWNER can access this endpoint.");
        }
        List<ProjectDTO> projects = projectRepository.findAllByMemberUserId(currentUser.getId())
                .stream()
                .map(ProjectDTO::from)
                .toList();
        return ResponseEntity.ok(projects);
    }
}
