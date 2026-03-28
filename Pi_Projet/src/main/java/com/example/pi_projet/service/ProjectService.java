package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.Project.ProjectStatus;
import com.example.pi_projet.entity.Project.Visibility;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectMember.ProjectRole;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.service.ProjectTemplateService;
import com.example.pi_projet.service.ProjectMemberService;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {
    private Project findOrThrow(UUID id) {
        return projectRepo.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Project not found: " + id));
    }

    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository projectMemberRepo;
    private final WorkspaceService workspaceService;
    private final ProjectTemplateService templateService;
    private final com.example.pi_projet.repository.UserRepository userRepo;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final WorkspaceQuotaHelper quotaHelper;
    private final ProjectAuthorizationService projectAuthorizationService;
    private final ProjectRoleMapper projectRoleMapper;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final M2AuditLogService auditLogService;

    public Page<Project> getVisible(UUID workspaceId, Long userId, Pageable pageable) {
        if (!userRepo.existsById(userId)) {
            throw new Module2Exception(NOT_FOUND, "Requester user not found");
        }

        User requester = userRepo.findById(userId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        workspaceService.getById(workspaceId);
        if (!isGlobalAdminRole(requester.getRole()) && !workspaceService.isMember(workspaceId, userId)) {
            throw new Module2Exception(FORBIDDEN, "Requester is not a workspace member");
        }

        return projectRepo.findVisibleToUser(workspaceId, userId, pageable);
    }

    public Project getById(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));

        if (!projectMemberRepo.existsByProjectIdAndUserId(projectId, requesterId)
            && !projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Requester is not a project member");
        }
        return p;
    }

    @Transactional
    public Project create(UUID workspaceId, String name, String description,
                          Visibility visibility, LocalDate startDate, LocalDate endDate,
                          Long requesterId) {
        if (!userRepo.existsById(requesterId)) throw new Module2Exception(NOT_FOUND, "Creator user not found");
        Workspace ws = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Creator user not found"));

        if (!projectAuthorizationService.canCreateProject(requester, ws)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can create projects.");
        }

        // Quota check at org level
        java.util.UUID orgId = ws.getOrganization().getId();
        long current = quotaHelper.countActiveProjectsByOrg(orgId);
        int maxAllowed = quotaHelper.getMaxProjectsStub(orgId);
        if (current >= maxAllowed) {
            throw new Module2Exception(PAYMENT_REQUIRED, String.format("Project quota exceeded: %d/%d", current, maxAllowed));
        }

        Project p = Project.builder()
            .workspace(ws)
            .createdBy(requesterId)
            .name(name)
            .description(description)
            .visibility(visibility != null ? visibility : Visibility.PRIVATE)
            .startDate(startDate)
            .endDate(endDate)
            .build();
        p = projectRepo.save(p);
        String orgType = resolveWorkspaceOrgType(ws);
        ProjectRole assigned = orgType.equals("academic") ? ProjectRole.PROFESSOR : ProjectRole.PROJECT_MANAGER;
        projectMemberRepo.save(ProjectMember.builder()
            .project(p).userId(requesterId).role(assigned).build());

        // audit log (via adapter)
        try {
            auditLogService.writeAudit(requesterId, orgId, "CREATE_PROJECT", "project", p.getId().toString(), null);
        } catch (Exception ignored) {}
        return p;
    }

    @Transactional
    public Project createProjectFromTemplate(UUID workspaceId, UUID templateId, String nameOverride, LocalDate startDate, LocalDate endDate, Long requesterId) {
        ProjectTemplate template = templateService.getById(templateId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        boolean isOwner = template.getCreatedBy() != null && template.getCreatedBy().equals(requesterId);
        if (template.getStatus() != ProjectTemplate.TemplateStatus.APPROVED && !isOwner) {
            throw new Module2Exception(FORBIDDEN, "Template must be APPROVED before use");
        }
        if (!userRepo.existsById(requesterId)) throw new Module2Exception(NOT_FOUND, "Creator user not found");
        Workspace ws = workspaceService.getById(workspaceId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Creator user not found"));
        if (!projectAuthorizationService.canCreateProject(requester, ws)) {
            throw new Module2Exception(FORBIDDEN, "Only org owner/admin, manager, or tutor can create projects.");
        }
        Project p = Project.builder()
            .workspace(ws)
            .templateId(template.getId())
            .createdBy(requesterId)
            .name(nameOverride != null ? nameOverride : template.getName())
            .description(template.getUseCaseDescription())
            .visibility(template.getDefaultVisibility() == ProjectTemplate.DefaultVisibility.PUBLIC ? Visibility.PUBLIC : Visibility.PRIVATE)
            .startDate(startDate)
            .endDate(endDate)
            .phasesJson(template.getDefaultPhasesJson())
            .build();
        p = projectRepo.save(p);
        String orgType = resolveWorkspaceOrgType(ws);
        projectMemberRepo.save(ProjectMember.builder()
            .project(p).userId(requesterId).role(orgType.equals("academic") ? ProjectRole.PROFESSOR : ProjectRole.PROJECT_MANAGER).build());
        // atomic usage increment — avoids race condition under concurrent requests
        templateService.incrementUsageCount(templateId);
        return p;
    }

    @Transactional
    public Project assignMemberToProject(UUID projectId, Long userId, ProjectRole role, Long assignedBy) {
        Project project = findOrThrow(projectId);
        // member must exist in workspace
        if (!userRepo.existsById(userId)) throw new Module2Exception(NOT_FOUND, "User to assign not found");
        if (!workspaceService.isMember(project.getWorkspace().getId(), userId)) {
            throw new Module2Exception(BAD_REQUEST, "User is not a member of the project's workspace");
        }
        if (projectMemberRepo.existsByProjectIdAndUserId(projectId, userId)) {
            throw new Module2Exception(CONFLICT, "User already assigned to project");
        }
        var assigner = userRepo.findById(assignedBy).orElseThrow(() -> new Module2Exception(NOT_FOUND, "Assigner user not found"));
        if (!projectAuthorizationService.canManageProjectMembers(assigner, project)) {
            throw new Module2Exception(FORBIDDEN, "Requester lacks permission to add project members");
        }

        WorkspaceMember workspaceMember = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(project.getWorkspace().getId(), userId)
            .orElseThrow(() -> new Module2Exception(BAD_REQUEST, "User is not a member of the project's workspace"));

        String orgType = resolveWorkspaceOrgType(project.getWorkspace());
        ProjectRole finalRole = projectRoleMapper.resolveAssignmentRole(role, workspaceMember.getRole(), orgType);

        // If a soft-deleted record exists for this (project, user) pair, restore it instead of
        // inserting a new row — otherwise the DB UNIQUE constraint on (project_id, user_id) would
        // raise a 500 when re-inviting a previously removed member.
        if (projectMemberRepo.countSoftDeleted(projectId, userId) > 0) {
            projectMemberRepo.restoreSoftDeleted(projectId, userId, finalRole.name());
            return project;
        }

        ProjectMember pm = ProjectMember.builder()
            .project(project).userId(userId).role(finalRole).assignedByUser(assigner).build();
        pm = projectMemberRepo.save(pm);
        return project;
    }

    @Transactional
    public Project update(UUID projectId, String name, String description,
                          Visibility visibility, LocalDate startDate, LocalDate endDate,
                          Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to update project");
        }

        if (name != null)        p.setName(name);
        if (description != null) p.setDescription(description);
        if (visibility != null)  p.setVisibility(visibility);
        if (startDate != null)   p.setStartDate(startDate);
        if (endDate != null)     p.setEndDate(endDate);
        return projectRepo.save(p);
    }

    private void validateJson(String json, String fieldName) {
        if (json == null || json.isBlank()) return;
        try {
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
        } catch (Exception e) {
            throw new Module2Exception(VALIDATION, fieldName + " contains invalid JSON");
        }
    }

    /**
     * Valid project status transitions following software project lifecycle best practices:
     * - Any active state can be CANCELLED
     * - CANCELLED can be re-opened to PLANNING
     * - COMPLETED → ARCHIVED for archival (soft-delete equivalent)
     */
    private static final java.util.Map<ProjectStatus, java.util.List<ProjectStatus>> VALID_TRANSITIONS;
    static {
        VALID_TRANSITIONS = new java.util.HashMap<>();
        VALID_TRANSITIONS.put(ProjectStatus.PLANNING,   java.util.List.of(ProjectStatus.ACTIVE, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.ACTIVE,     java.util.List.of(ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.ON_HOLD,    java.util.List.of(ProjectStatus.ACTIVE, ProjectStatus.CANCELLED));
        VALID_TRANSITIONS.put(ProjectStatus.COMPLETED,  java.util.List.of(ProjectStatus.ARCHIVED));
        VALID_TRANSITIONS.put(ProjectStatus.CANCELLED,  java.util.List.of(ProjectStatus.PLANNING));
        VALID_TRANSITIONS.put(ProjectStatus.ARCHIVED,   java.util.List.of());
    }

    @Transactional
    public Project changeStatus(UUID projectId, ProjectStatus status, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to change project status");
        }

        var allowedTo = VALID_TRANSITIONS.getOrDefault(p.getStatus(), java.util.List.of());
        if (!allowedTo.contains(status)) {
            throw new Module2Exception(BAD_REQUEST, String.format(
                "Cannot move project from %s to %s. Allowed transitions: %s.",
                p.getStatus(), status, allowedTo));
        }

        p.setStatus(status);
        return projectRepo.save(p);
    }

    @Transactional
    public List<Project> bulkChangeStatus(UUID workspaceId, List<UUID> projectIds,
                                           ProjectStatus newStatus, Long requesterId) {
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        List<Project> updated = new ArrayList<>();
        for (UUID pid : projectIds) {
            try {
                Project p = findOrThrow(pid);
                if (!p.getWorkspace().getId().equals(workspaceId)) continue;
                if (!projectAuthorizationService.canManageProject(requester, p)) continue;
                var allowedTo = VALID_TRANSITIONS.getOrDefault(p.getStatus(), java.util.List.of());
                if (!allowedTo.contains(newStatus)) continue;
                p.setStatus(newStatus);
                updated.add(projectRepo.save(p));
            } catch (Exception ignored) {}
        }
        return updated;
    }

    @Transactional
    public void delete(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to delete/archive project");
        }
        p.setStatus(ProjectStatus.ARCHIVED);
        projectRepo.save(p);
    }

    @Transactional
    public void hardDelete(UUID projectId, Long requesterId) {
        Project p = findOrThrow(projectId);
        User requester = userRepo.findById(requesterId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Requester user not found"));
        if (!projectAuthorizationService.canManageProject(requester, p)) {
            throw new Module2Exception(FORBIDDEN, "Not allowed to permanently delete project");
        }
        // Hard-delete members first (bypasses soft-delete filter), then the project row itself
        projectMemberRepo.hardDeleteAllByProjectId(projectId);
        projectRepo.hardDeleteById(projectId);
    }

    // No access checks for static demo
    private void checkAccess(Project p, Long userId) {
        // No-op
    }

    public void requireProjectRole(UUID projectId, Long userId, ProjectRole... allowed) {
        // No-op for static demo
    }

    private boolean isGlobalAdminRole(User.RoleName role) {
        return role == User.RoleName.SUPER_ADMIN
            || role == User.RoleName.ADMIN;
    }

    private String resolveWorkspaceOrgType(Workspace workspace) {
        if (workspace.getOrgType() != null && !workspace.getOrgType().isBlank()) {
            return workspace.getOrgType().trim().toLowerCase();
        }
        if (workspace.getOrganization() != null && workspace.getOrganization().getOrgType() != null) {
            return workspace.getOrganization().getOrgType().name().toLowerCase();
        }
        return "enterprise";
    }
}
