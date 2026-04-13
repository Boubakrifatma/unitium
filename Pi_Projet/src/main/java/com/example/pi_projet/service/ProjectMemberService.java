package com.example.pi_projet.service;

import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectMember.ProjectRole;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectMemberService {

    private final ProjectMemberRepository memberRepo;
    private final ProjectRepository projectRepo;
    private final WorkspaceService workspaceService;
    private final ProjectService projectService;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectAuthorizationService projectAuthorizationService;
    private final ProjectRoleMapper projectRoleMapper;

    public List<ProjectMember> getAll(UUID projectId, Long requesterId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found"));
        var requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        if (!projectAuthorizationService.canViewProjectMembers(requester, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to view project members");
        }

        return memberRepo.findAllByProjectId(projectId);
    }

    @Transactional
    public ProjectMember add(UUID projectId, Long userId, String roleRaw, Long requesterId) {
        ProjectRole requestedRole = parseRoleNullable(roleRaw);
        // delegate to ProjectService which enforces permissions, workspace membership and auditing
        projectService.assignMemberToProject(projectId, userId, requestedRole, requesterId);
        return memberRepo.findByProjectIdAndUserId(projectId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Member not found after assignment"));
    }

    @Transactional
    public ProjectMember add(UUID projectId, Long userId, ProjectRole role, Long requesterId) {
        return add(projectId, userId, role == null ? null : role.name(), requesterId);
    }

    @Transactional
    public ProjectMember updateRole(UUID projectId, Long userId, String roleRaw, Long requesterId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found"));
        var requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        if (!projectAuthorizationService.canManageProjectMembers(requester, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to update project member role");
        }

        ProjectRole requestedRole = parseRoleRequired(roleRaw);
        String orgType = resolveWorkspaceOrgType(project.getWorkspace());
        ProjectRole normalizedRole = projectRoleMapper.normalizeLegacy(requestedRole, orgType);
        if (!projectRoleMapper.isAssignableForOrgType(normalizedRole, orgType)) {
            throw new Module2Exception(VALIDATION, "Invalid role for this organization type");
        }

        ProjectMember m = memberRepo.findByProjectIdAndUserId(projectId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Member not found"));
        m.setRole(normalizedRole);
        return memberRepo.save(m);
    }

    @Transactional
    public ProjectMember updateRole(UUID projectId, Long userId, ProjectRole newRole, Long requesterId) {
        return updateRole(projectId, userId, newRole == null ? null : newRole.name(), requesterId);
    }

    @Transactional
    public void remove(UUID projectId, Long userId, Long requesterId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found"));
        var requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        if (!projectAuthorizationService.canManageProjectMembers(requester, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to remove project member");
        }

        ProjectMember m = memberRepo.findByProjectIdAndUserId(projectId, userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Member not found"));
        memberRepo.delete(m);
    }

    public List<Map<String, Object>> getAvailableWorkspaceMembers(UUID workspaceId, UUID projectId, Long requesterId) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found"));

        if (!project.getWorkspace().getId().equals(workspaceId)) {
            throw new Module2Exception(BAD_REQUEST, "Project does not belong to this workspace");
        }

        var requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProjectMembers(requester, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to list available members");
        }

        Set<Long> assignedUserIds = memberRepo.findAllByProjectId(projectId)
            .stream()
            .map(ProjectMember::getUserId)
            .collect(Collectors.toSet());

        List<WorkspaceMember> workspaceMembers = workspaceMemberRepository.findAllByWorkspaceId(workspaceId)
            .stream()
            .filter(member -> member.getUserId() != null && !assignedUserIds.contains(member.getUserId()))
            .toList();

        if (workspaceMembers.isEmpty()) {
            return List.of();
        }

        Map<Long, User> usersById = userRepo.findAllById(
                workspaceMembers.stream().map(WorkspaceMember::getUserId).distinct().toList()
            )
            .stream()
            .collect(Collectors.toMap(User::getId, user -> user));

        return workspaceMembers.stream()
            .filter(member -> usersById.containsKey(member.getUserId()))
            .map(member -> {
                User user = usersById.get(member.getUserId());
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("userId", user.getId());
                row.put("fullName", user.getFullName());
                row.put("email", user.getEmail());
                row.put("avatarUrl", user.getAvatarUrl());
                row.put("workspaceRole", member.getRole() != null ? member.getRole().name() : null);
                return row;
            })
            .sorted(Comparator.comparing(
                row -> String.valueOf(row.getOrDefault("fullName", "")),
                String.CASE_INSENSITIVE_ORDER
            ))
            .toList();
    }

    private ProjectRole parseRoleRequired(String raw) {
        try {
            ProjectRole parsed = projectRoleMapper.parseNullable(raw);
            if (parsed == null) {
                throw new Module2Exception(VALIDATION, "role is required");
            }
            return parsed;
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION, "Invalid role");
        }
    }

    private ProjectRole parseRoleNullable(String raw) {
        try {
            return projectRoleMapper.parseNullable(raw);
        } catch (IllegalArgumentException ex) {
            throw new Module2Exception(VALIDATION, "Invalid role");
        }
    }

    private String resolveWorkspaceOrgType(com.example.pi_projet.entity.Workspace workspace) {
        if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
            return workspace.getOrgType().trim().toLowerCase();
        }
        if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            return workspace.getOrganization().getOrgType().name().toLowerCase();
        }
        return "enterprise";
    }
}
