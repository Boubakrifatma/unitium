package com.example.pi_projet.service;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.OrganizationMember;
import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.repository.OrganizationMemberRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.ProjectTemplateRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class M2DevSeedService {

    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectTemplateRepository projectTemplateRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final M2OrganizationProvisioningService organizationProvisioningService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Map<String, Object> seed() {
        Map<String, Object> out = new LinkedHashMap<>();

        User enterpriseManager = findUser(101L, "manager@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user 101/manager@test.com"));
        User tutor = findUser(201L, "tutor@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user 201/tutor@test.com"));
        User student = findUser(202L, "student@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user 202/student@test.com"));
        User employee = findUser(302L, "employee@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user 302/employee@test.com"));
        User viewer = findUser(301L, "viewer@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user 301/viewer@test.com"));

        User developer1 = findUserByEmail("developer1@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user developer1@test.com"));
        User developer2 = findUserByEmail("developer2@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user developer2@test.com"));
        User analyst = findUserByEmail("analyst@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user analyst@test.com"));

        User student1 = findUserByEmail("student1@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user student1@test.com"));
        User student2 = findUserByEmail("student2@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user student2@test.com"));
        User ta = findUserByEmail("ta@test.com")
            .orElseThrow(() -> new IllegalStateException("Missing user ta@test.com"));

        M2OrganizationProvisioningService.ProvisionedOrganization enterpriseProvisioned = organizationProvisioningService.ensureScenarioOrganization(
            "techcorp",
            "TechCorp",
            Organization.OrgType.ENTERPRISE,
            enterpriseManager,
            OrganizationMember.OrganizationRole.ADMIN
        );
        M2OrganizationProvisioningService.ProvisionedOrganization academicProvisioned = organizationProvisioningService.ensureScenarioOrganization(
            "engineering-faculty",
            "Engineering Faculty",
            Organization.OrgType.ACADEMIC,
            tutor,
            OrganizationMember.OrganizationRole.MEMBER
        );

        Organization enterpriseOrg = enterpriseProvisioned.organization();
        Organization academicOrg = academicProvisioned.organization();

        ensureOrganizationMember(enterpriseOrg, enterpriseManager, OrganizationMember.OrganizationRole.ADMIN, enterpriseManager);
        ensureOrganizationMember(enterpriseOrg, employee, OrganizationMember.OrganizationRole.MEMBER, enterpriseManager);
        ensureOrganizationMember(enterpriseOrg, developer1, OrganizationMember.OrganizationRole.MEMBER, enterpriseManager);
        ensureOrganizationMember(enterpriseOrg, developer2, OrganizationMember.OrganizationRole.MEMBER, enterpriseManager);
        ensureOrganizationMember(enterpriseOrg, analyst, OrganizationMember.OrganizationRole.MEMBER, enterpriseManager);

        ensureOrganizationMember(academicOrg, tutor, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrganizationMember(academicOrg, student, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrganizationMember(academicOrg, viewer, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrganizationMember(academicOrg, student1, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrganizationMember(academicOrg, student2, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrganizationMember(academicOrg, ta, OrganizationMember.OrganizationRole.MEMBER, tutor);

        Workspace enterpriseDefault = enterpriseProvisioned.defaultWorkspace();
        Workspace academicDefault = academicProvisioned.defaultWorkspace();

        ensureWorkspaceMember(enterpriseDefault, enterpriseManager.getId(), WorkspaceMember.WorkspaceRole.OWNER, null, "owner");
        ensureWorkspaceMember(enterpriseDefault, employee.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE, enterpriseManager, "employee");
        ensureWorkspaceMember(enterpriseDefault, developer1.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE, enterpriseManager, "employee");
        ensureWorkspaceMember(enterpriseDefault, developer2.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE, enterpriseManager, "employee");
        ensureWorkspaceMember(enterpriseDefault, analyst.getId(), WorkspaceMember.WorkspaceRole.VIEWER, enterpriseManager, "viewer");

        ensureWorkspaceMember(academicDefault, tutor.getId(), WorkspaceMember.WorkspaceRole.OWNER, null, "professor");
        ensureWorkspaceMember(academicDefault, student.getId(), WorkspaceMember.WorkspaceRole.MEMBER, tutor, "student");
        ensureWorkspaceMember(academicDefault, viewer.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor, "student");
        ensureWorkspaceMember(academicDefault, student1.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor, "student");
        ensureWorkspaceMember(academicDefault, student2.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor, "student");
        ensureWorkspaceMember(academicDefault, ta.getId(), WorkspaceMember.WorkspaceRole.TA, tutor, "ta");

        ProjectTemplate enterpriseTemplate = ensureTemplate(
            enterpriseOrg,
            enterpriseManager.getId(),
            "Enterprise Scrum Template",
            ProjectTemplate.TemplateType.SCRUM,
            "{\"framework\":\"scrum\"}"
        );

        ProjectTemplate academicTemplate = ensureTemplate(
            academicOrg,
            tutor.getId(),
            "Academic Assignment Template",
            ProjectTemplate.TemplateType.CUSTOM,
            "{\"framework\":\"assignment\"}"
        );

        Project enterpriseProject = ensureProject(enterpriseDefault, enterpriseManager.getId(), "TechCorp Kickoff");
        Project academicProject = ensureProject(academicDefault, tutor.getId(), "Course Assignment 1");

        ensureProjectMember(enterpriseProject, enterpriseManager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjectMember(academicProject, tutor.getId(), ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjectMember(academicProject, student.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);

        out.put("enterpriseOrgId", enterpriseOrg.getId());
        out.put("academicOrgId", academicOrg.getId());
        out.put("enterpriseWorkspaceId", enterpriseDefault.getId());
        out.put("academicWorkspaceId", academicDefault.getId());
        out.put("enterpriseTemplateId", enterpriseTemplate.getId());
        out.put("academicTemplateId", academicTemplate.getId());
        out.put("enterpriseProjectId", enterpriseProject.getId());
        out.put("academicProjectId", academicProject.getId());
        out.put("enterpriseInviteCandidate", employee.getEmail());
        out.put("academicInviteCandidate", viewer.getEmail());
        out.put("enterpriseSeedUsers", java.util.List.of(
            employee.getEmail(),
            developer1.getEmail(),
            developer2.getEmail(),
            analyst.getEmail()
        ));
        out.put("academicSeedUsers", java.util.List.of(
            student.getEmail(),
            student1.getEmail(),
            student2.getEmail(),
            ta.getEmail(),
            viewer.getEmail()
        ));
        out.put("message", "Module 2 dev seed completed");

        return out;
    }

    private Optional<User> findUser(Long id, String email) {
        Optional<User> byId = userRepository.findById(id);
        if (byId.isPresent()) {
            return byId;
        }
        return userRepository.findByEmail(email);
    }

    private Optional<User> findUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    private void ensureOrganizationMember(Organization organization,
                                          User user,
                                          OrganizationMember.OrganizationRole role,
                                          User inviter) {
        var memberships = organizationMemberRepository.findAllByUserIdAndDeletedAtIsNull(user.getId());
        if (memberships.isEmpty()) {
            organizationMemberRepository.save(OrganizationMember.builder()
                .organization(organization)
                .userId(user.getId())
                .role(role)
                .invitedByUser(inviter)
                .build());
            return;
        }

        OrganizationMember membership = memberships.get(0);
        boolean changed = false;
        if (membership.getOrganization() == null || !organization.getId().equals(membership.getOrganization().getId())) {
            membership.setOrganization(organization);
            changed = true;
        }
        if (membership.getRole() != role) {
            membership.setRole(role);
            changed = true;
        }
        if (membership.getInvitedByUser() == null && inviter != null) {
            membership.setInvitedByUser(inviter);
            changed = true;
        }
        if (changed) {
            organizationMemberRepository.save(membership);
        }
    }

    private void ensureWorkspaceMember(Workspace workspace,
                                       Long userId,
                                       WorkspaceMember.WorkspaceRole role,
                                       User inviter,
                                       String roleNameCandidate) {
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), userId)) {
            return;
        }

        Long inviterId = inviter != null ? inviter.getId() : null;

        if (workspaceMemberRepository.restoreSoftDeletedMember(
            workspace.getId(),
            userId,
            role.name(),
            inviterId
        ) > 0) {
            return;
        }

        WorkspaceMember member = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .role(role)
            .invitedByUser(inviter)
            .joinedAt(Instant.now())
            .build();

        try {
            workspaceMemberRepository.save(member);
        } catch (DataIntegrityViolationException ex) {
            if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), userId)) {
                return;
            }
            if (workspaceMemberRepository.restoreSoftDeletedMember(
                workspace.getId(),
                userId,
                role.name(),
                inviterId
            ) > 0) {
                return;
            }
            throw ex;
        }
    }

    private ProjectTemplate ensureTemplate(Organization org,
                                           Long creatorId,
                                           String name,
                                           ProjectTemplate.TemplateType type,
                                           String defaultConfigJson) {
        return projectTemplateRepository.findAll().stream()
            .filter(t -> t.getOrganization() != null
                && org.getId().equals(t.getOrganization().getId())
                && name.equalsIgnoreCase(t.getName()))
            .findFirst()
            .orElseGet(() -> projectTemplateRepository.save(
                ProjectTemplate.builder()
                    .organization(org)
                    .name(name)
                    .templateType(type)
                    .defaultProjectConfigJson(defaultConfigJson)
                    .defaultPhasesJson("[]")
                    .defaultRolesJson("[]")
                    .defaultVisibility(ProjectTemplate.DefaultVisibility.PRIVATE)
                    .isPublic(true)
                    .status(ProjectTemplate.TemplateStatus.APPROVED)
                    .createdBy(creatorId)
                    .build()
            ));
    }

    private Project ensureProject(Workspace workspace, Long creatorId, String name) {
        return projectRepository.findAllByWorkspaceId(workspace.getId(), org.springframework.data.domain.Pageable.unpaged())
            .stream()
            .filter(p -> name.equalsIgnoreCase(p.getName()))
            .findFirst()
            .orElseGet(() -> projectRepository.save(Project.builder()
                .workspace(workspace)
                .createdBy(creatorId)
                .name(name)
                .status(Project.ProjectStatus.ACTIVE)
                .visibility(Project.Visibility.PRIVATE)
                .build()));
    }

    private void ensureProjectMember(Project project, Long userId, ProjectMember.ProjectRole role, User assigner) {
        if (projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            return;
        }

        projectMemberRepository.save(ProjectMember.builder()
            .project(project)
            .userId(userId)
            .role(role)
            .assignedByUser(assigner)
            .build());
    }

}
