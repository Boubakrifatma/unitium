package com.example.pi_projet.service;

import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.entity.ProjectTemplate.*;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Seeder for Module 2 showcase data.
 *
 * 4 organizations with distinct quota scenarios:
 *   NexusCorp   — ENTERPRISE, generous plan (10 ws / 50 members)
 *   StartupX    — ENTERPRISE, maxed plan   (1 ws  / 3 members) ← quota limit demo
 *   OpenEDU     — ACADEMIC,   generous plan (20 ws / 100 members)
 *   MiniCampus  — ACADEMIC,   maxed plan   (1 ws  / 3 members) ← quota limit demo
 *
 * Runs at startup via Module2OrganizationInitializer. Fully idempotent.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class M2DevSeedService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Seeded historic created_at used for workspaces and projects so snapshots exist
    private static final Instant SEEDED_CREATED_AT = Instant.parse("2024-01-01T00:00:00Z");
    private static final String ACADEMIC_SOURCE_TASK_MARKER = "[seed:academic-source]";

    @Value("${m2.seed.export-pib-artifacts:true}")
    private boolean exportPibArtifactsOnSeed;

    private record SeedPhaseSpec(String key, String name, int durationDays, boolean enabled) {}

    private record SeedTemplateStructure(String phasesJson, String milestonesJson, String tasksJson) {}

    private record SeedProjectTimelineSpec(Project project, User owner, ProjectTemplate template) {}

    // ── Repositories ────────────────────────────────────────────────────────
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectTemplateRepository projectTemplateRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final TemplateFavoriteRepository templateFavoriteRepository;
    private final TemplateRatingRepository templateRatingRepository;

    // ── Services ─────────────────────────────────────────────────────────────
    private final M2OrganizationProvisioningService organizationProvisioningService;
    private final ProjectTemplateService projectTemplateService;
    private final TemplateStructureService templateStructureService;
    private final M2PublicIntegrationService publicIntegrationService;

    // ─────────────────────────────────────────────────────────────────────────
    //  ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> seed() {
        log.info("[M2DevSeedService] Starting rich seed...");

        // ── 1. Load all required users (from UnitiumSeedService + AcademicSeedService) ─
        User admin     = requireUser("admin@academy.edu");
        User manager   = requireUser("james.morgan@unitium.io");
        User manager2  = requireUser("manager2@unitium.io");
        User tutor     = requireUser("tutor1@academy.edu");
        User tutor2    = requireUser("tutor2@academy.edu");
        User dev1      = requireUser("alice.dupont@unitium.io");
        User dev2      = requireUser("marc.leroy@unitium.io");
        User dev3      = requireUser("analyst@unitium.io");
        User analyst   = requireUser("analyst@unitium.io");
        User employee  = requireUser("employee@unitium.io");
        User viewer    = requireUser("viewer@unitium.io");
        User student   = requireUser("student1@academy.edu");
        User student1  = requireUser("student2@academy.edu");
        User student2  = requireUser("student3@academy.edu");
        User student3  = requireUser("student4@academy.edu");
        User ta        = requireUser("tutor1@academy.edu");
        User po        = requireUser("pooja.sharma@unitium.io");

        // ── 2. Plans ─────────────────────────────────────────────────────────
        Plan enterprisePro  = planRepository.findByName("pro")
                .orElseThrow(() -> new IllegalStateException("Plan 'pro' not found — ensure DataInitializer runs first"));
        Plan startupFree    = planRepository.findByName("starter")
                .orElseThrow(() -> new IllegalStateException("Plan 'starter' not found — ensure DataInitializer runs first"));
        Plan academicFull   = planRepository.findByName("academic-institution")
                .orElseThrow(() -> new IllegalStateException("Plan 'academic-institution' not found — ensure DataInitializer runs first"));
        Plan academicBasic  = planRepository.findByName("academic-starter")
                .orElseThrow(() -> new IllegalStateException("Plan 'academic-starter' not found — ensure DataInitializer runs first"));

        // ── 3. Organizations ─────────────────────────────────────────────────
        Organization nexusCorp  = ensureOrg("nexus-corp",  "NexusCorp",  Organization.OrgType.ENTERPRISE, manager,  enterprisePro);
        Organization startupX   = ensureOrg("startup-x",   "StartupX",   Organization.OrgType.ENTERPRISE, manager2, startupFree);
        Organization openEdu    = ensureOrg("open-edu",    "OpenEDU",    Organization.OrgType.ACADEMIC,   tutor,    academicFull);
        Organization miniCampus = ensureOrg("mini-campus", "MiniCampus", Organization.OrgType.ACADEMIC,   tutor2,   academicBasic);

        // ── 4. Organization members (one org per user — enforced by uk_org_member_single_org_per_user) ─
        // NexusCorp: manager + dev team + analyst  (5 users)
        ensureOrgMember(nexusCorp, manager,  OrganizationMember.OrganizationRole.ADMIN,  manager);
        ensureOrgMember(nexusCorp, dev1,     OrganizationMember.OrganizationRole.MEMBER, manager);
        ensureOrgMember(nexusCorp, dev2,     OrganizationMember.OrganizationRole.MEMBER, manager);
        ensureOrgMember(nexusCorp, dev3,     OrganizationMember.OrganizationRole.MEMBER, manager);
        ensureOrgMember(nexusCorp, analyst,  OrganizationMember.OrganizationRole.MEMBER, manager);

        // StartupX: manager2 + employee + viewer  (3 users = workspace will be MAXED)
        ensureOrgMember(startupX, manager2, OrganizationMember.OrganizationRole.ADMIN,  manager2);
        ensureOrgMember(startupX, employee, OrganizationMember.OrganizationRole.MEMBER, manager2);
        ensureOrgMember(startupX, viewer,   OrganizationMember.OrganizationRole.MEMBER, manager2);

        // OpenEDU: tutor + ta + students 1-3  (5 users)
        ensureOrgMember(openEdu, tutor,    OrganizationMember.OrganizationRole.ADMIN,  tutor);
        ensureOrgMember(openEdu, ta,       OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrgMember(openEdu, student,  OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrgMember(openEdu, student1, OrganizationMember.OrganizationRole.MEMBER, tutor);
        ensureOrgMember(openEdu, student2, OrganizationMember.OrganizationRole.MEMBER, tutor);

        // MiniCampus: tutor2 + student3 + po  (3 users = workspace will be MAXED)
        ensureOrgMember(miniCampus, tutor2,   OrganizationMember.OrganizationRole.ADMIN,  tutor2);
        ensureOrgMember(miniCampus, student3, OrganizationMember.OrganizationRole.MEMBER, tutor2);
        ensureOrgMember(miniCampus, po,       OrganizationMember.OrganizationRole.MEMBER, tutor2);

        // ── 5. Workspaces ────────────────────────────────────────────────────
        Workspace engHQ     = ensureWorkspace(nexusCorp,  "Engineering HQ",        "engineering-hq",  manager.getId());
        Workspace mktHub    = ensureWorkspace(nexusCorp,  "Marketing Hub",          "marketing-hub",   manager.getId());
        Workspace prodLab   = ensureWorkspace(nexusCorp,  "Product Lab",            "product-lab",     manager.getId());
        Workspace chronosOps = ensureWorkspace(nexusCorp,  "Chronos Ops",            "chronos-ops",     manager.getId());
        Workspace startMain = ensureWorkspace(startupX,   "StartupX Main",          "startup-main",    manager2.getId());
        Workspace csDept    = ensureWorkspace(openEdu,    "Computer Science Dept",  "cs-dept",         tutor.getId());
        Workspace dsLab     = ensureWorkspace(openEdu,    "Data Science Lab",       "ds-lab",          tutor.getId());
        Workspace resCtr    = ensureWorkspace(openEdu,    "Research Center",        "research-center", tutor.getId());
        Workspace miniWs    = ensureWorkspace(miniCampus, "MiniCampus Workspace",   "mini-ws",         tutor2.getId());

        // Retire the provisioning-service "default" workspaces if they still exist
        retireDefaultWorkspace(nexusCorp);
        retireDefaultWorkspace(startupX);
        retireDefaultWorkspace(openEdu);
        retireDefaultWorkspace(miniCampus);

        // ── 6. Workspace members (all members must be org members of the same org) ─
        // Engineering HQ  (5 members — plan allows 50)
        ensureWsMember(engHQ, manager.getId(), WorkspaceMember.WorkspaceRole.OWNER,    null);
        ensureWsMember(engHQ, dev1.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(engHQ, dev2.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(engHQ, dev3.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(engHQ, analyst.getId(), WorkspaceMember.WorkspaceRole.VIEWER,   manager);

        // Marketing Hub  (3 members — NexusCorp users only)
        ensureWsMember(mktHub, manager.getId(), WorkspaceMember.WorkspaceRole.OWNER,    null);
        ensureWsMember(mktHub, dev1.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(mktHub, analyst.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(mktHub, dev2.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(mktHub, dev3.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);

        // Product Lab  (4 members — NexusCorp users only)
        ensureWsMember(prodLab, manager.getId(),  WorkspaceMember.WorkspaceRole.OWNER,    null);
        ensureWsMember(prodLab, dev2.getId(),     WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(prodLab, dev3.getId(),     WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(prodLab, analyst.getId(),  WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(prodLab, dev1.getId(),     WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);

        // Chronos Ops (time machine demo workspace)
        ensureWsMember(chronosOps, manager.getId(), WorkspaceMember.WorkspaceRole.OWNER,    null);
        ensureWsMember(chronosOps, dev1.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(chronosOps, dev2.getId(),    WorkspaceMember.WorkspaceRole.EMPLOYEE, manager);
        ensureWsMember(chronosOps, analyst.getId(), WorkspaceMember.WorkspaceRole.VIEWER,   manager);

        // StartupX Main  (3 members — MAXED, plan limit = 3)
        ensureWsMember(startMain, manager2.getId(), WorkspaceMember.WorkspaceRole.OWNER,    null);
        ensureWsMember(startMain, employee.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE, manager2);
        ensureWsMember(startMain, viewer.getId(),   WorkspaceMember.WorkspaceRole.VIEWER,   manager2);

        // Computer Science Dept  (5 members — OpenEDU users only)
        ensureWsMember(csDept, tutor.getId(),    WorkspaceMember.WorkspaceRole.OWNER,   null);
        ensureWsMember(csDept, student.getId(),  WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(csDept, student1.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(csDept, student2.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(csDept, ta.getId(),       WorkspaceMember.WorkspaceRole.TA,      tutor);

        // Data Science Lab  (3 members — OpenEDU users only)
        ensureWsMember(dsLab, tutor.getId(),    WorkspaceMember.WorkspaceRole.OWNER,   null);
        ensureWsMember(dsLab, student.getId(),  WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(dsLab, student2.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(dsLab, student1.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(dsLab, ta.getId(),       WorkspaceMember.WorkspaceRole.TA,      tutor);

        // Research Center  (3 members — OpenEDU users only)
        ensureWsMember(resCtr, tutor.getId(),    WorkspaceMember.WorkspaceRole.OWNER,   null);
        ensureWsMember(resCtr, student1.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(resCtr, ta.getId(),       WorkspaceMember.WorkspaceRole.TA,      tutor);
        ensureWsMember(resCtr, student.getId(),  WorkspaceMember.WorkspaceRole.STUDENT, tutor);
        ensureWsMember(resCtr, student2.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor);

        // MiniCampus Workspace  (3 members — MAXED, plan limit = 3)
        ensureWsMember(miniWs, tutor2.getId(),   WorkspaceMember.WorkspaceRole.OWNER,   null);
        ensureWsMember(miniWs, student3.getId(), WorkspaceMember.WorkspaceRole.STUDENT, tutor2);
        ensureWsMember(miniWs, po.getId(),       WorkspaceMember.WorkspaceRole.STUDENT, tutor2);

        // Populate Stage 4 ML profile columns directly on real workspace members.
        applyWorkspaceMemberMlProfiles(List.of(engHQ, mktHub, prodLab, chronosOps, startMain, csDept, dsLab, resCtr, miniWs));

        // ── 7. Project Templates ─────────────────────────────────────────────
        ProjectTemplate tplAgile = ensureTemplate(nexusCorp, manager.getId(),
            "Agile Sprint Board", TemplateType.SCRUM, DifficultyLevel.BEGINNER, EstimatedEffort.LOW,
            TemplateStatus.APPROVED, true, true, true, false,
            "[{\"name\":\"Backlog\",\"durationDays\":0},{\"name\":\"Sprint Planning\",\"durationDays\":2}," +
            "{\"name\":\"Sprint 1\",\"durationDays\":14},{\"name\":\"Sprint 2\",\"durationDays\":14}," +
            "{\"name\":\"Sprint 3\",\"durationDays\":14},{\"name\":\"Review & Retro\",\"durationDays\":3}]",
            "agile,scrum,sprint,team", 47, 24, 4.5, 12,
            "A lean 3-sprint Scrum board for agile teams building software incrementally.");

        ProjectTemplate tplKanban = ensureTemplate(nexusCorp, manager.getId(),
            "Enterprise Kanban Flow", TemplateType.KANBAN, DifficultyLevel.INTERMEDIATE, EstimatedEffort.MEDIUM,
            TemplateStatus.APPROVED, true, false, true, false,
            "[{\"name\":\"Backlog\",\"durationDays\":0},{\"name\":\"To Do\",\"durationDays\":0}," +
            "{\"name\":\"In Progress\",\"durationDays\":0},{\"name\":\"Code Review\",\"durationDays\":3}," +
            "{\"name\":\"Done\",\"durationDays\":0}]",
            "kanban,flow,enterprise,continuous-delivery", 18, 18, 4.2, 8,
            "Continuous-flow Kanban board for enterprise delivery teams focused on WIP limits and throughput.");

        ProjectTemplate tplWaterfall = ensureTemplate(nexusCorp, manager.getId(),
            "Product Launch Blueprint", TemplateType.WATERFALL, DifficultyLevel.ADVANCED, EstimatedEffort.HIGH,
            TemplateStatus.APPROVED, true, false, false, true,
            "[{\"name\":\"Discovery\",\"durationDays\":14},{\"name\":\"Requirements\",\"durationDays\":10}," +
            "{\"name\":\"Design\",\"durationDays\":21},{\"name\":\"Build\",\"durationDays\":60}," +
            "{\"name\":\"QA\",\"durationDays\":21},{\"name\":\"UAT\",\"durationDays\":14}," +
            "{\"name\":\"Launch\",\"durationDays\":7},{\"name\":\"Post-Launch\",\"durationDays\":30}]",
            "product,launch,waterfall,strategy,go-to-market", 177, 9, 4.7, 6,
            "End-to-end waterfall blueprint for structured product launches from discovery to post-launch review.");

        ProjectTemplate tplSdlc = ensureTemplate(nexusCorp, manager.getId(),
            "SDLC Enterprise", TemplateType.WATERFALL, DifficultyLevel.INTERMEDIATE, EstimatedEffort.HIGH,
            TemplateStatus.APPROVED, false, false, false, false,
            "[{\"name\":\"Requirements\",\"durationDays\":14},{\"name\":\"Architecture\",\"durationDays\":10}," +
            "{\"name\":\"Implementation\",\"durationDays\":60},{\"name\":\"Testing\",\"durationDays\":21}," +
            "{\"name\":\"Deployment\",\"durationDays\":7},{\"name\":\"Maintenance\",\"durationDays\":0}]",
            "sdlc,software,enterprise,lifecycle,best-practices", 112, 5, 0.0, 0,
            "Full software development lifecycle template covering all phases from requirements to production maintenance.");

        ProjectTemplate tplResearch = ensureTemplate(openEdu, tutor.getId(),
            "Academic Research Project", TemplateType.CUSTOM, DifficultyLevel.BEGINNER, EstimatedEffort.MEDIUM,
            TemplateStatus.APPROVED, true, true, true, true,
            "[{\"name\":\"Literature Review\",\"durationDays\":21},{\"name\":\"Research Proposal\",\"durationDays\":14}," +
            "{\"name\":\"Data Collection\",\"durationDays\":30},{\"name\":\"Data Analysis\",\"durationDays\":21}," +
            "{\"name\":\"Write-Up\",\"durationDays\":21},{\"name\":\"Defense\",\"durationDays\":7}]",
            "research,academic,thesis,methodology,analysis", 114, 31, 4.8, 15,
            "Structured academic research template guiding students from literature review through thesis defense.");

        ProjectTemplate tplCourse = ensureTemplate(openEdu, tutor.getId(),
            "Course Assignment Tracker", TemplateType.CUSTOM, DifficultyLevel.BEGINNER, EstimatedEffort.LOW,
            TemplateStatus.APPROVED, true, false, false, true,
            "[{\"name\":\"Requirements Analysis\",\"durationDays\":3},{\"name\":\"Implementation\",\"durationDays\":14}," +
            "{\"name\":\"Testing & Debugging\",\"durationDays\":5},{\"name\":\"Documentation\",\"durationDays\":3}," +
            "{\"name\":\"Submission\",\"durationDays\":1}]",
            "course,assignment,student,education,deadline", 26, 45, 4.3, 22,
            "Lightweight assignment tracker for students managing coursework with clear submission deadlines.");

        ProjectTemplate tplMl = ensureTemplate(openEdu, tutor.getId(),
            "ML Pipeline Starter", TemplateType.CUSTOM, DifficultyLevel.ADVANCED, EstimatedEffort.HIGH,
            TemplateStatus.APPROVED, true, false, true, false,
            "[{\"name\":\"Problem Definition\",\"durationDays\":7},{\"name\":\"Data Collection & Cleaning\",\"durationDays\":21}," +
            "{\"name\":\"Feature Engineering\",\"durationDays\":14},{\"name\":\"Model Training\",\"durationDays\":21}," +
            "{\"name\":\"Evaluation & Tuning\",\"durationDays\":14},{\"name\":\"Deployment\",\"durationDays\":7}]",
            "machine-learning,data-science,pipeline,advanced,ai,mlops", 84, 12, 4.6, 7,
            "Production-grade ML pipeline template covering data prep, training, evaluation, and model deployment.");

        ProjectTemplate tplCapstone = ensureTemplate(openEdu, tutor.getId(),
            "Capstone Team Project", TemplateType.CUSTOM, DifficultyLevel.ADVANCED, EstimatedEffort.HIGH,
            TemplateStatus.APPROVED, true, true, false, false,
            "[{\"name\":\"Team Formation\",\"durationDays\":7},{\"name\":\"Project Planning\",\"durationDays\":7}," +
            "{\"name\":\"Sprint 1\",\"durationDays\":21},{\"name\":\"Sprint 2\",\"durationDays\":21}," +
            "{\"name\":\"Sprint 3\",\"durationDays\":21},{\"name\":\"Integration\",\"durationDays\":7}," +
            "{\"name\":\"Demo Day\",\"durationDays\":1},{\"name\":\"Final Report\",\"durationDays\":7}]",
            "capstone,team,graduation,advanced,portfolio,agile", 92, 19, 4.4, 11,
            "Comprehensive capstone template for final-year team projects with agile sprints and public demo day.");

        ProjectTemplate tplStartup = ensureTemplate(startupX, manager2.getId(),
            "Startup MVP Sprint", TemplateType.SCRUM, DifficultyLevel.INTERMEDIATE, EstimatedEffort.MEDIUM,
            TemplateStatus.PENDING_APPROVAL, true, false, false, false,
            "[{\"name\":\"Ideation & Scoping\",\"durationDays\":7},{\"name\":\"MVP Build Sprint 1\",\"durationDays\":21}," +
            "{\"name\":\"MVP Build Sprint 2\",\"durationDays\":21},{\"name\":\"Beta Testing\",\"durationDays\":14}," +
            "{\"name\":\"Launch\",\"durationDays\":3}]",
            "startup,mvp,lean,sprint,product,validation", 66, 3, 0.0, 0,
            "Fast-paced MVP template for lean startups shipping from ideation to beta launch in under 10 weeks.");

        ProjectTemplate tplBugTrack = ensureTemplate(nexusCorp, dev1.getId(),
            "Bug Tracking Flow", TemplateType.KANBAN, DifficultyLevel.BEGINNER, EstimatedEffort.LOW,
            TemplateStatus.DRAFT, false, false, false, false,
            "[{\"name\":\"Reported\",\"durationDays\":0},{\"name\":\"Triaged\",\"durationDays\":1}," +
            "{\"name\":\"In Fix\",\"durationDays\":0},{\"name\":\"In Review\",\"durationDays\":2}," +
            "{\"name\":\"Resolved\",\"durationDays\":0},{\"name\":\"Closed\",\"durationDays\":0}]",
            "bugs,qa,tracking,kanban,engineering", 3, 0, 0.0, 0,
            "Simple Kanban board for tracking bug lifecycle from report through triage to closure.");

        // ── 7.5. Template Forks (genealogy examples for DNA viewer) ───────────
        // Create fork variants AFTER base templates exist and BEFORE projects use them
        ProjectTemplate forkAgile1 = ensureTemplateFork(
            tplAgile, manager.getId(), "Agile Sprint Board (Manager Fork - Q1 Planning)");
        ProjectTemplate forkAgile2 = ensureTemplateFork(
            tplAgile, manager.getId(), "Agile Sprint Board (Custom Sprint 2-Week)");
        
        ProjectTemplate forkKanban1 = ensureTemplateFork(
            tplKanban, manager.getId(), "Enterprise Kanban Flow (Manager WIP Variant)");
        
        ProjectTemplate forkWaterfall1 = ensureTemplateFork(
            tplWaterfall, manager.getId(), "Product Launch Blueprint (Simplified Path)");
        
        // Create a second-generation fork (fork of a fork) to showcase multi-level genealogy
        ProjectTemplate forkAgile3 = ensureTemplateFork(
            forkAgile1, manager.getId(), "Agile Sprint Board (Q1 Planning - Team Specific)");

        // ── 7.6. PIB-aligned Templates (global, not org-specific) ────────────
        // Keep Spring-seeded templates aligned with Python PIB training artifacts (ID + name + status/public).
        // These are attempted after base templates and forks to avoid conflicts.
        ensurePibAlignedTemplates(manager, tutor);

        ProjectTemplate tplPibDelivery = projectTemplateRepository
            .findById(UUID.fromString("fba6784c-2f42-5ab2-93ff-b5b9a150298f"))
            .orElse(tplAgile);
        ProjectTemplate tplPibKanban = projectTemplateRepository
            .findById(UUID.fromString("5bb54131-eed8-53eb-8cdd-02667e3b58f4"))
            .orElse(tplKanban);
        ProjectTemplate tplPibAcademic = projectTemplateRepository
            .findById(UUID.fromString("1553b2f4-3aea-533d-b198-fcff8e7ba5d6"))
            .orElse(tplResearch);

        tplAgile = applyTemplateReferenceConfig(
            tplAgile,
            List.of(
                "https://github.com/spring-projects/spring-boot",
                "https://github.com/kubernetes/kubernetes"
            ),
            null
        );
        tplKanban = applyTemplateReferenceConfig(
            tplKanban,
            List.of(
                "https://github.com/grafana/grafana",
                "https://github.com/hashicorp/terraform"
            ),
            null
        );
        tplResearch = applyTemplateReferenceConfig(
            tplResearch,
            List.of("https://github.com/scikit-learn/scikit-learn"),
            "machine learning reproducibility"
        );
        tplMl = applyTemplateReferenceConfig(
            tplMl,
            List.of(
                "https://github.com/pytorch/pytorch",
                "https://github.com/huggingface/transformers"
            ),
            "machine learning pipeline evaluation"
        );
        tplPibDelivery = applyTemplateReferenceConfig(
            tplPibDelivery,
            List.of("https://github.com/spring-projects/spring-boot"),
            null
        );
        tplPibKanban = applyTemplateReferenceConfig(
            tplPibKanban,
            List.of("https://github.com/envoyproxy/envoy"),
            null
        );
        tplPibAcademic = applyTemplateReferenceConfig(
            tplPibAcademic,
            List.of("https://github.com/jupyter/notebook"),
            "project based learning software engineering"
        );

        // ── 8. Projects ──────────────────────────────────────────────────────
        // Engineering HQ
        Project pPlatform = ensureProject(engHQ, manager.getId(),
            "Platform Modernization", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 1, 15), LocalDate.of(2025, 12, 31), tplSdlc);
        Project pApiGw = ensureProject(engHQ, manager.getId(),
            "API Gateway v2", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2025, 3, 1), LocalDate.of(2025, 9, 30), tplAgile);
        Project pSecAudit = ensureProject(engHQ, manager.getId(),
            "Security Audit 2025", Project.ProjectStatus.ON_HOLD, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 2, 1), LocalDate.of(2025, 7, 30), null);
        Project pDevOps = ensureProject(engHQ, manager.getId(),
            "DevOps Automation", Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            null, null, tplKanban);
        Project pLegacy = ensureProject(engHQ, manager.getId(),
            "Legacy System Migration", Project.ProjectStatus.COMPLETED, Project.Visibility.PRIVATE,
            LocalDate.of(2024, 6, 1), LocalDate.of(2024, 12, 31), null);

        // Marketing Hub
        Project pQ4 = ensureProject(mktHub, manager.getId(),
            "Q4 Campaign 2025", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 9, 1), LocalDate.of(2025, 11, 30), null);
        Project pBrand = ensureProject(mktHub, manager.getId(),
            "Brand Refresh Initiative", Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            null, null, tplWaterfall);

        // Product Lab
        Project pMobile = ensureProject(prodLab, manager.getId(),
            "Mobile App v3", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2025, 4, 1), LocalDate.of(2025, 10, 31), tplAgile);
        Project pAi = ensureProject(prodLab, manager.getId(),
            "AI Feature Integration", Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            null, null, tplMl);
        Project pPython = ensureProject(prodLab, manager.getId(),
            "Python", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            null, null, null);

        // Chronos Ops (time machine demo)
        Project pChronosCore = ensureProject(chronosOps, manager.getId(),
            "Chronos Core Rollout", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2024, 3, 15), LocalDate.of(2026, 6, 30), tplAgile);
        Project pLegacySunset = ensureProject(chronosOps, manager.getId(),
            "Legacy Sunset Program", Project.ProjectStatus.COMPLETED, Project.Visibility.PRIVATE,
            LocalDate.of(2024, 9, 1), LocalDate.of(2025, 6, 20), tplWaterfall);
        Project pPortalReboot = ensureProject(chronosOps, manager.getId(),
            "Client Portal Reboot", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2025, 9, 5), LocalDate.of(2026, 9, 30), tplKanban);
        Project pGrowthAnalytics = ensureProject(chronosOps, manager.getId(),
            "Growth Analytics Revamp", Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            LocalDate.of(2026, 2, 20), LocalDate.of(2026, 12, 15), tplMl);
        Project pManagerDelivery = ensureProject(chronosOps, manager.getId(),
            "Morgan M2 Delivery Command", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2026, 3, 1), LocalDate.of(2026, 11, 30), tplPibDelivery);
        Project pManagerAcademicBridge = ensureProject(chronosOps, manager.getId(),
            "Morgan Academic Collaboration Hub", Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            LocalDate.of(2026, 3, 20), LocalDate.of(2026, 12, 20), tplPibAcademic);

        // StartupX Main
        Project pMvp = ensureProject(startMain, manager2.getId(),
            "Startup MVP Launch", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 6, 1), LocalDate.of(2025, 12, 31), tplStartup);

        // CS Dept
        Project pWebDev = ensureProject(csDept, tutor.getId(),
            "Web Dev Course 2025", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2025, 9, 1), LocalDate.of(2026, 1, 31), tplCourse);
        Project pAlgo = ensureProject(csDept, tutor.getId(),
            "Advanced Algorithms Research", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 3, 1), LocalDate.of(2025, 8, 31), tplResearch);
        Project pOs = ensureProject(csDept, tutor.getId(),
            "Operating Systems Project", Project.ProjectStatus.ON_HOLD, Project.Visibility.PRIVATE,
            null, null, null);

        // Data Science Lab
        Project pMlFund = ensureProject(dsLab, tutor.getId(),
            "ML Fundamentals 2025", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            LocalDate.of(2025, 9, 1), LocalDate.of(2026, 1, 31), tplMl);
        Project pCapstone = ensureProject(dsLab, tutor.getId(),
            "Data Viz Capstone", Project.ProjectStatus.PLANNING, Project.Visibility.PUBLIC,
            null, null, tplCapstone);

        // Research Center
        Project pNlp = ensureProject(resCtr, tutor.getId(),
            "NLP Research Initiative", Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            LocalDate.of(2025, 5, 1), LocalDate.of(2025, 12, 31), tplResearch);
        Project pBlockchain = ensureProject(resCtr, tutor.getId(),
            "Blockchain in Education Study", Project.ProjectStatus.CANCELLED, Project.Visibility.PRIVATE,
            null, null, null);

        // MiniCampus
        Project pIntro = ensureProject(miniWs, tutor2.getId(),
            "Intro to Programming 101", Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            null, null, tplCourse);

        // ── 9. Project members ───────────────────────────────────────────────
        // Engineering HQ projects
        ensureProjMember(pPlatform, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pPlatform, dev1.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pPlatform, dev2.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pPlatform, dev3.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pPlatform, analyst.getId(),  ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pApiGw, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pApiGw, dev2.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pApiGw, dev3.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);

        ensureProjMember(pSecAudit, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pSecAudit, analyst.getId(),  ProjectMember.ProjectRole.OBSERVER, manager);

        ensureProjMember(pDevOps, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pDevOps, dev1.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pDevOps, dev3.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);

        ensureProjMember(pLegacy, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pLegacy, dev1.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pLegacy, dev2.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pLegacy, analyst.getId(),  ProjectMember.ProjectRole.REVIEWER,  manager);

        // Marketing Hub projects  (NexusCorp users only)
        ensureProjMember(pQ4, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pQ4, dev1.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pQ4, analyst.getId(),  ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pBrand, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pBrand, dev1.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pBrand, analyst.getId(),  ProjectMember.ProjectRole.OBSERVER,  manager);

        // Product Lab projects  (NexusCorp users only)
        ensureProjMember(pMobile, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pMobile, dev2.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pMobile, analyst.getId(),  ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pAi, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pAi, dev3.getId(),     ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pAi, analyst.getId(),  ProjectMember.ProjectRole.REVIEWER,  manager);
        ensureProjMember(pPython, manager.getId(),  ProjectMember.ProjectRole.PROJECT_MANAGER, null);

        // Chronos Ops projects
        ensureProjMember(pChronosCore, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pChronosCore, dev1.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);

        ensureProjMember(pLegacySunset, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pLegacySunset, dev2.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);

        ensureProjMember(pPortalReboot, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pPortalReboot, dev1.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pPortalReboot, analyst.getId(), ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pGrowthAnalytics, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pGrowthAnalytics, analyst.getId(), ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pManagerDelivery, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pManagerDelivery, dev1.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pManagerDelivery, dev2.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pManagerDelivery, analyst.getId(), ProjectMember.ProjectRole.REVIEWER,  manager);

        ensureProjMember(pManagerAcademicBridge, manager.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pManagerAcademicBridge, dev3.getId(),    ProjectMember.ProjectRole.DEVELOPER, manager);
        ensureProjMember(pManagerAcademicBridge, analyst.getId(), ProjectMember.ProjectRole.REVIEWER,  manager);

        // StartupX  (StartupX users only)
        ensureProjMember(pMvp, manager2.getId(), ProjectMember.ProjectRole.PROJECT_MANAGER, null);
        ensureProjMember(pMvp, employee.getId(), ProjectMember.ProjectRole.DEVELOPER, manager2);
        ensureProjMember(pMvp, viewer.getId(),   ProjectMember.ProjectRole.OBSERVER,  manager2);

        // CS Dept projects
        ensureProjMember(pWebDev, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR,  null);
        ensureProjMember(pWebDev, student.getId(),  ProjectMember.ProjectRole.DEVELOPER,  tutor);
        ensureProjMember(pWebDev, student1.getId(), ProjectMember.ProjectRole.DEVELOPER,  tutor);
        ensureProjMember(pWebDev, student2.getId(), ProjectMember.ProjectRole.DEVELOPER,  tutor);
        ensureProjMember(pWebDev, ta.getId(),       ProjectMember.ProjectRole.REVIEWER,   tutor);

        ensureProjMember(pAlgo, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pAlgo, student1.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);
        ensureProjMember(pAlgo, ta.getId(),       ProjectMember.ProjectRole.REVIEWER,  tutor);

        ensureProjMember(pOs, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pOs, student2.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);

        // Data Science Lab projects  (OpenEDU users only)
        ensureProjMember(pMlFund, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pMlFund, student.getId(),  ProjectMember.ProjectRole.DEVELOPER, tutor);
        ensureProjMember(pMlFund, student2.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);

        ensureProjMember(pCapstone, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pCapstone, student1.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);
        ensureProjMember(pCapstone, student2.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);

        // Research Center projects  (OpenEDU users only)
        ensureProjMember(pNlp, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pNlp, student1.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);
        ensureProjMember(pNlp, ta.getId(),       ProjectMember.ProjectRole.REVIEWER,  tutor);

        ensureProjMember(pBlockchain, tutor.getId(),    ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pBlockchain, student2.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor);

        // MiniCampus  (MiniCampus users only)
        ensureProjMember(pIntro, tutor2.getId(),   ProjectMember.ProjectRole.PROFESSOR, null);
        ensureProjMember(pIntro, student3.getId(), ProjectMember.ProjectRole.DEVELOPER, tutor2);
        ensureProjMember(pIntro, po.getId(),       ProjectMember.ProjectRole.DEVELOPER, tutor2);

        // ── 9.25. Realistic metadata (GitHub + ML descriptors) ─────────────
        pPlatform = applyProjectMetadata(
            pPlatform,
            "Modernize the enterprise platform runtime, resilience posture, and service ownership model.",
            "https://github.com/kubernetes/kubernetes",
            "enterprise",
            List.of("platform", "cloud", "reliability"),
            List.of("zero-downtime rollout", "audit readiness")
        );
        pApiGw = applyProjectMetadata(
            pApiGw,
            "Deliver an observable API gateway baseline with secure traffic policies and versioned rollout.",
            "https://github.com/envoyproxy/envoy",
            "enterprise",
            List.of("gateway", "security", "api"),
            List.of("latency under 100ms", "oauth2 policies")
        );
        pDevOps = applyProjectMetadata(
            pDevOps,
            "Automate infrastructure provisioning and release workflows across staging and production.",
            "https://github.com/hashicorp/terraform",
            "enterprise",
            List.of("devops", "iac", "automation"),
            List.of("policy as code", "cost guardrails")
        );
        pMobile = applyProjectMetadata(
            pMobile,
            "Ship mobile v3 with stronger telemetry, accessibility, and performance budgets.",
            "https://github.com/flutter/flutter",
            "enterprise",
            List.of("mobile", "ux", "performance"),
            List.of("offline support", "app startup under 2s")
        );
        pAi = applyProjectMetadata(
            pAi,
            "Integrate ML-assisted features with staged validation and ethical review checkpoints.",
            "https://github.com/huggingface/transformers",
            "enterprise",
            List.of("ai", "feature-engineering", "evaluation"),
            List.of("bias checks", "human approval path")
        );
        pChronosCore = applyProjectMetadata(
            pChronosCore,
            "Core program for legacy replacement, release governance, and cross-team delivery cadence.",
            "https://github.com/temporalio/temporal",
            "enterprise",
            List.of("migration", "workflow", "governance"),
            List.of("weekly release train", "cross-team dependency map")
        );
        pPortalReboot = applyProjectMetadata(
            pPortalReboot,
            "Public-facing portal modernization focused on observability, analytics, and conversion quality.",
            "https://github.com/grafana/grafana",
            "enterprise",
            List.of("portal", "observability", "analytics"),
            List.of("public uptime 99.9%", "accessibility conformance")
        );
        pManagerDelivery = applyProjectMetadata(
            pManagerDelivery,
            "Morgan Manager flagship template-driven portfolio project for M2 enterprise delivery simulation.",
            "https://github.com/spring-projects/spring-boot",
            "enterprise",
            List.of("m2", "portfolio", "template-driven"),
            List.of("manager-owned", "time-machine checkpoints")
        );
        pManagerAcademicBridge = applyProjectMetadata(
            pManagerAcademicBridge,
            "Manager-led collaboration project that imports academic sources and translates them into delivery tasks.",
            "https://github.com/jupyter/notebook",
            "academic",
            List.of("knowledge-transfer", "academic-sources", "delivery"),
            List.of("evidence-backed tasks", "weekly literature digest")
        );
        pWebDev = applyProjectMetadata(
            pWebDev,
            "Course project focused on modern web engineering practices and iterative team delivery.",
            "https://github.com/freeCodeCamp/freeCodeCamp",
            "academic",
            List.of("web", "course", "teamwork"),
            List.of("weekly demos", "peer review")
        );
        pAlgo = applyProjectMetadata(
            pAlgo,
            "Research-oriented algorithms project with benchmark replication and result reporting.",
            "https://github.com/cp-algorithms/cp-algorithms",
            "academic",
            List.of("algorithms", "research", "benchmarking"),
            List.of("report reproducibility", "complexity analysis")
        );
        pMlFund = applyProjectMetadata(
            pMlFund,
            "Academic ML fundamentals program grounded in reproducible experiments and open-source references.",
            "https://github.com/scikit-learn/scikit-learn",
            "academic",
            List.of("ml", "education", "reproducibility"),
            List.of("experiment tracking", "evaluation rubric")
        );
        pNlp = applyProjectMetadata(
            pNlp,
            "NLP research initiative for educational use cases with transparent model assessment.",
            "https://github.com/huggingface/transformers",
            "academic",
            List.of("nlp", "research", "education"),
            List.of("citation-backed claims", "ablation notes")
        );

        // ── 9.5. Project timeline seed (milestones + tasks for richer README output) ──
        ensureSeedProjectTimelines(List.of(
            new SeedProjectTimelineSpec(pPlatform, manager, tplSdlc),
            new SeedProjectTimelineSpec(pApiGw, manager, tplAgile),
            new SeedProjectTimelineSpec(pSecAudit, manager, null),
            new SeedProjectTimelineSpec(pDevOps, manager, tplKanban),
            new SeedProjectTimelineSpec(pLegacy, manager, null),
            new SeedProjectTimelineSpec(pQ4, manager, null),
            new SeedProjectTimelineSpec(pBrand, manager, tplWaterfall),
            new SeedProjectTimelineSpec(pMobile, manager, tplAgile),
            new SeedProjectTimelineSpec(pAi, manager, tplMl),
            new SeedProjectTimelineSpec(pPython, manager, null),
            new SeedProjectTimelineSpec(pChronosCore, manager, tplAgile),
            new SeedProjectTimelineSpec(pLegacySunset, manager, tplWaterfall),
            new SeedProjectTimelineSpec(pPortalReboot, manager, tplKanban),
            new SeedProjectTimelineSpec(pGrowthAnalytics, manager, tplMl),
            new SeedProjectTimelineSpec(pManagerDelivery, manager, tplPibDelivery),
            new SeedProjectTimelineSpec(pManagerAcademicBridge, manager, tplPibAcademic),
            new SeedProjectTimelineSpec(pMvp, manager2, tplStartup),
            new SeedProjectTimelineSpec(pWebDev, tutor, tplCourse),
            new SeedProjectTimelineSpec(pAlgo, tutor, tplResearch),
            new SeedProjectTimelineSpec(pOs, tutor, null),
            new SeedProjectTimelineSpec(pMlFund, tutor, tplMl),
            new SeedProjectTimelineSpec(pCapstone, tutor, tplCapstone),
            new SeedProjectTimelineSpec(pNlp, tutor, tplResearch),
            new SeedProjectTimelineSpec(pBlockchain, tutor, null),
            new SeedProjectTimelineSpec(pIntro, tutor2, tplCourse)
        ));

        ensureAcademicSourceTasks(
            pMlFund,
            tutor,
            "machine learning reproducibility and evaluation"
        );
        ensureAcademicSourceTasks(
            pAlgo,
            tutor,
            "algorithm analysis empirical study"
        );
        ensureAcademicSourceTasks(
            pManagerAcademicBridge,
            manager,
            "project based learning software engineering"
        );

        // ── 10. Template Favorites ───────────────────────────────────────────
        ensureFavorite(manager,  tplAgile);
        ensureFavorite(manager,  tplKanban);
        ensureFavorite(manager,  tplWaterfall);
        ensureFavorite(manager,  tplPibDelivery);
        ensureFavorite(manager,  tplPibAcademic);

        ensureFavorite(manager2, tplStartup);
        ensureFavorite(manager2, tplAgile);
        ensureFavorite(manager2, tplKanban);

        ensureFavorite(tutor,    tplResearch);
        ensureFavorite(tutor,    tplCourse);
        ensureFavorite(tutor,    tplMl);
        ensureFavorite(tutor,    tplCapstone);

        ensureFavorite(tutor2,   tplCapstone);
        ensureFavorite(tutor2,   tplMl);
        ensureFavorite(tutor2,   tplResearch);

        ensureFavorite(ta,       tplCourse);
        ensureFavorite(ta,       tplResearch);

        // ── 11. Template Ratings ─────────────────────────────────────────────
        ensureRating(manager,  tplAgile,     5);
        ensureRating(manager,  tplKanban,    4);
        ensureRating(manager,  tplWaterfall, 5);
        ensureRating(manager,  tplPibDelivery, 5);
        ensureRating(manager,  tplPibAcademic, 4);
        ensureRating(manager2, tplStartup,   4);
        ensureRating(manager2, tplAgile,     4);
        ensureRating(tutor,    tplResearch,  5);
        ensureRating(tutor,    tplCourse,    4);
        ensureRating(tutor,    tplMl,        5);
        ensureRating(tutor2,   tplCapstone,  4);
        ensureRating(tutor2,   tplMl,        5);
        ensureRating(tutor2,   tplResearch,  5);
        ensureRating(ta,       tplCourse,    4);
        ensureRating(ta,       tplResearch,  5);

        applyTimeMachineTimeline(
            chronosOps,
            manager,
            dev1,
            dev2,
            analyst,
            pChronosCore,
            pLegacySunset,
            pPortalReboot,
            pGrowthAnalytics,
            pManagerDelivery,
            pManagerAcademicBridge
        );

        boolean pibArtifactsExported = exportPibArtifactsFromSeed();

        log.info("[M2DevSeedService] Seed complete with realistic enterprise + academic portfolio data.");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nexusCorpId",  nexusCorp.getId());
        out.put("startupXId",   startupX.getId());
        out.put("openEduId",    openEdu.getId());
        out.put("miniCampusId", miniCampus.getId());
        out.put("timeMachineWorkspaceId", chronosOps.getId());
        out.put("timeMachineWorkspaceSlug", chronosOps.getSlug());
        out.put("timeMachineSuggestedDates", timeMachineSuggestedDates());
        out.put("pibArtifactsExported", pibArtifactsExported);
        out.put("message", "Module 2 rich seed completed with realistic enterprise + academic template-driven projects");
        return out;
    }

    private boolean exportPibArtifactsFromSeed() {
        if (!exportPibArtifactsOnSeed) {
            log.info("[M2DevSeedService] Skipping PIB artifact export (m2.seed.export-pib-artifacts=false).");
            return false;
        }

        Path scriptPath = resolvePibExportScriptPath();
        if (scriptPath == null) {
            log.warn("[M2DevSeedService] PIB artifact export script not found (expected m2_ml_service/scripts/export_pib_artifacts.py).");
            return false;
        }

        List<List<String>> commands = new ArrayList<>();
        commands.add(List.of("python", scriptPath.toString()));
        commands.add(List.of("py", "-3", scriptPath.toString()));

        String activeDb = null;
        try {
            activeDb = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        } catch (Exception ignored) {
        }

        for (List<String> command : commands) {
            try {
                ProcessBuilder builder = new ProcessBuilder(command);
                builder.redirectErrorStream(true);
                if (activeDb != null && !activeDb.isBlank()) {
                    builder.environment().put("DB_NAME", activeDb.trim());
                }

                Process process = builder.start();
                StringBuilder output = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line).append('\n');
                    }
                }

                boolean finished = process.waitFor(180, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    log.warn("[M2DevSeedService] PIB artifact export timed out for command {}", command);
                    continue;
                }

                int exitCode = process.exitValue();
                if (exitCode == 0) {
                    log.info("[M2DevSeedService] PIB artifacts exported via {}\n{}", String.join(" ", command), output.toString().trim());
                    return true;
                }

                log.warn("[M2DevSeedService] PIB artifact export failed via {} (exit={})\n{}",
                    String.join(" ", command),
                    exitCode,
                    output.toString().trim());
            } catch (IOException ex) {
                log.warn("[M2DevSeedService] PIB artifact export command unavailable: {} ({})", String.join(" ", command), ex.getMessage());
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("[M2DevSeedService] PIB artifact export interrupted.");
                return false;
            }
        }

        return false;
    }

    private Path resolvePibExportScriptPath() {
        String userDir = System.getProperty("user.dir", ".");
        Path current = Paths.get(userDir).toAbsolutePath().normalize();
        List<Path> roots = new ArrayList<>();
        while (current != null) {
            roots.add(current);
            current = current.getParent();
        }

        for (Path root : roots) {
            Path direct = root.resolve("m2_ml_service").resolve("scripts").resolve("export_pib_artifacts.py");
            if (Files.exists(direct)) {
                return direct;
            }

            Path nested = root.resolve("PiProjetByUnitum").resolve("m2_ml_service").resolve("scripts").resolve("export_pib_artifacts.py");
            if (Files.exists(nested)) {
                return nested;
            }
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PLAN
    // ─────────────────────────────────────────────────────────────────────────

    private Plan ensurePlan(String name, String displayName,
                            int maxWorkspaces, int maxMembersPerWs,
                            int priceMonthlyCents, int priceYearlyCents,
                            Plan.MlTier mlTier, Plan.SupportTier supportTier,
                            Plan.CustomIntegrations customIntegrations,
                            long storageMb,
                            boolean apiAccess, boolean lmsIntegration, boolean gradeExport) {
        return planRepository.findByName(name).orElseGet(() -> planRepository.save(
            Plan.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .displayName(displayName)
                .maxWorkspaces(maxWorkspaces)
                .maxMembersPerWs(maxMembersPerWs)
                .maxActiveProjects(maxWorkspaces * 5)
                .priceMonthlyCents(priceMonthlyCents)
                .priceYearlyCents(priceYearlyCents)
                .storageMb(storageMb)
                .mlTier(mlTier)
                .supportTier(supportTier)
                .customIntegrations(customIntegrations)
                .apiAccess(apiAccess)
                .ssoEnabled(apiAccess)
                .lmsIntegration(lmsIntegration)
                .gradeExport(gradeExport)
                .auditLogDays(apiAccess ? 365 : 30)
                .isActive(true)
                .build()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ORGANIZATION + SUBSCRIPTION
    // ─────────────────────────────────────────────────────────────────────────

    private Organization ensureOrg(String slug, String name,
                                   Organization.OrgType orgType, User owner, Plan plan) {
        M2OrganizationProvisioningService.ProvisionedOrganization prov =
            organizationProvisioningService.ensureScenarioOrganization(
                slug, name, orgType, owner, OrganizationMember.OrganizationRole.ADMIN);
        Organization org = prov.organization();

        // Upsert active subscription linking this org to its plan
        subscriptionRepository.findTopByOrganizationOrderByCreatedAtDesc(org)
            .orElseGet(() -> subscriptionRepository.save(
                Subscription.builder()
                    .id(UUID.randomUUID().toString())
                    .organization(org)
                    .plan(plan)
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .billingCycle(Subscription.BillingCycle.MONTHLY)
                    .currentPeriodStart(LocalDateTime.now())
                    .currentPeriodEnd(LocalDateTime.now().plusYears(1))
                    .build()));
        return org;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ORGANIZATION MEMBER  (bug-fixed: per-org check)
    // ─────────────────────────────────────────────────────────────────────────

    private void ensureOrgMember(Organization org, User user,
                                 OrganizationMember.OrganizationRole role, User inviter) {
        Optional<OrganizationMember> existing =
            organizationMemberRepository.findByOrganization_IdAndUserIdAndDeletedAtIsNull(org.getId(), user.getId());

        if (existing.isEmpty()) {
            // Hard-delete any stale membership in a different org (soft-delete leaves rows that
            // still violate the uk_org_member_single_org_per_user unique constraint on user_id).
            jdbcTemplate.update("DELETE FROM org_members WHERE user_id = ? AND organization_id != ?",
                user.getId(), org.getId().toString());

            organizationMemberRepository.save(OrganizationMember.builder()
                .organization(org)
                .userId(user.getId())
                .role(role)
                .invitedByUser(inviter)
                .build());
        } else if (existing.get().getRole() != role) {
            OrganizationMember m = existing.get();
            m.setRole(role);
            organizationMemberRepository.save(m);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  WORKSPACE
    // ─────────────────────────────────────────────────────────────────────────

    private Workspace ensureWorkspace(Organization org, String name, String slug, Long ownerId) {
        UUID wsId = UUID.nameUUIDFromBytes((org.getSlug() + ":" + slug).getBytes(StandardCharsets.UTF_8));

        // Check for any workspace row (including soft-deleted) and restore/update if needed.
        Optional<Workspace> any = workspaceRepository.findAnyByIdNative(wsId);
        if (any.isPresent()) {
            Workspace ws = any.get();
            boolean changed = false;

            // If soft-deleted, restore via native query
            if (ws.getDeletedAt() != null) {
                workspaceRepository.restoreSoftDeletedById(wsId);
                ws.setDeletedAt(null);
                changed = true;
            }

            String normalizedOrgType = org.getOrgType() != null ? org.getOrgType().name().toLowerCase() : null;
            if (!Objects.equals(ws.getName(), name)) { ws.setName(name); changed = true; }
            if (!Objects.equals(ws.getSlug(), slug)) { ws.setSlug(slug); changed = true; }
            if (!Objects.equals(ws.getOwnerId(), ownerId)) { ws.setOwnerId(ownerId); changed = true; }
            if (!Objects.equals(ws.getOrgType(), normalizedOrgType)) { ws.setOrgType(normalizedOrgType); changed = true; }

            // Ensure createdAt is at or before SEEDED_CREATED_AT
            if (ws.getCreatedAt() == null || ws.getCreatedAt().isAfter(SEEDED_CREATED_AT)) {
                jdbcTemplate.update("UPDATE workspaces SET created_at = ? WHERE id = ?", java.sql.Timestamp.from(SEEDED_CREATED_AT), wsId.toString());
                ws.setCreatedAt(SEEDED_CREATED_AT);
                changed = true;
            }

            if (changed) {
                workspaceRepository.save(ws);
            }
            return ws;
        }

        // Create new workspace with seeded createdAt
        Workspace created = Workspace.builder()
                .id(wsId)
                .organization(org)
                .name(name)
                .slug(slug)
                .orgType(org.getOrgType().name().toLowerCase())
                .ownerId(ownerId)
                .createdAt(SEEDED_CREATED_AT)
                .build();
        return workspaceRepository.save(created);
    }

    /** Soft-delete the provisioning-service "default" workspace(s) if they still exist.
     *  Uses raw JDBC to avoid JPA auto-flush which fails when pending WorkspaceMember
     *  entities in the session reference workspaces not yet flushed to DB.
     *  Replicates the @SQLDelete behaviour: sets deleted_at = NOW().
     */
    private void retireDefaultWorkspace(Organization org) {
        String orgIdStr = org.getId().toString();
        List<String> wsIds = jdbcTemplate.queryForList(
            "SELECT id FROM workspaces WHERE organization_id = ? AND deleted_at IS NULL" +
            " AND (slug IN ('default-team','default-course')" +
            "   OR name IN ('Default Team','Default Course'))",
            String.class, orgIdStr);
        for (String wsId : wsIds) {
            jdbcTemplate.update("UPDATE workspaces SET deleted_at = NOW() WHERE id = ?", wsId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  WORKSPACE MEMBER
    // ─────────────────────────────────────────────────────────────────────────

    private void ensureWsMember(Workspace ws, Long userId,
                                WorkspaceMember.WorkspaceRole role, User inviter) {
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(ws.getId(), userId)) return;

        Long inviterId = inviter != null ? inviter.getId() : null;
        if (workspaceMemberRepository.restoreSoftDeletedMember(ws.getId(), userId, role.name(), inviterId) > 0) return;

        try {
            Instant joinedAt = ws != null && ws.getCreatedAt() != null ? ws.getCreatedAt() : Instant.now();
            workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(ws)
                .userId(userId)
                .role(role)
                .invitedByUser(inviter)
                .joinedAt(joinedAt)
                .build());
        } catch (DataIntegrityViolationException ex) {
            // Concurrent insert — safe to ignore if row now exists
            if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(ws.getId(), userId)) throw ex;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROJECT TEMPLATE
    // ─────────────────────────────────────────────────────────────────────────

    private ProjectTemplate ensureTemplate(Organization org, Long creatorId,
                                           String name, TemplateType type,
                                           DifficultyLevel difficulty, EstimatedEffort effort,
                                           TemplateStatus status,
                                           boolean isPublic, boolean isFeatured,
                                           boolean isRecommended, boolean isTrending,
                                           String phasesJson, String tags,
                                           int estimatedDurationDays, int usageCount,
                                           double rating, int ratingCount,
                                           String useCaseDescription) {
        Optional<ProjectTemplate> existingOpt = projectTemplateRepository.findAll().stream()
            .filter(t -> t.getOrganization() != null
                && org.getId().equals(t.getOrganization().getId())
                && name.equalsIgnoreCase(t.getName()))
            .findFirst();

        if (existingOpt.isPresent()) {
            ProjectTemplate existing = existingOpt.get();
            if (ensureTemplateHasStructure(existing, name, phasesJson)) {
                return projectTemplateRepository.save(existing);
            }
            return existing;
        }

        SeedTemplateStructure structure = buildTemplateStructureDefaults(phasesJson, name);
        return projectTemplateRepository.save(
            ProjectTemplate.builder()
                .organization(org)
                .createdBy(creatorId)
                .name(name)
                .templateType(type)
                .difficultyLevel(difficulty)
                .estimatedEffort(effort)
                .estimatedDurationDays(estimatedDurationDays)
                .status(status)
                .isPublic(isPublic)
                .isFeatured(isFeatured)
                .isRecommended(isRecommended)
                .isTrending(isTrending)
                .defaultVisibility(isPublic ? DefaultVisibility.PUBLIC : DefaultVisibility.PRIVATE)
                .teamStrategy(TeamStrategy.HYBRID)
                .defaultPhasesJson(structure.phasesJson())
                .defaultMilestonesJson(structure.milestonesJson())
                .defaultTasksJson(structure.tasksJson())
                .defaultRolesJson("[]")
                .defaultProjectConfigJson("{\"framework\":\"" + type.name().toLowerCase() + "\"}")
                .tags(tags)
                .useCaseDescription(useCaseDescription)
                .usageCount(usageCount)
                .rating(rating)
                .ratingCount(ratingCount)
                .version(1)
                .build());
    }

    private void ensurePibAlignedTemplates(User enterpriseOwner, User academicOwner) {
        ensurePibTemplate(
            UUID.fromString("fba6784c-2f42-5ab2-93ff-b5b9a150298f"),
            enterpriseOwner.getId(),
            "Delivery Sprint Blueprint",
            TemplateType.SCRUM,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Delivery Sprint Blueprint for enterprise teams with reusable phases, role defaults, and measurable outcomes.",
            0.80,
            0.71
        );
        ensurePibTemplate(
            UUID.fromString("5bb54131-eed8-53eb-8cdd-02667e3b58f4"),
            enterpriseOwner.getId(),
            "Incremental Kanban Delivery",
            TemplateType.KANBAN,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"OBSERVER\"]",
            "Incremental Kanban Delivery for enterprise teams with reusable phases, role defaults, and measurable outcomes.",
            0.85,
            0.76
        );
        ensurePibTemplate(
            UUID.fromString("51d6b20e-558e-5b0b-892c-6f67f12240c2"),
            enterpriseOwner.getId(),
            "Structured Research Program",
            TemplateType.WATERFALL,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Structured Research Program for enterprise teams with reusable phases, role defaults, and measurable outcomes.",
            0.77,
            0.68
        );
        ensurePibTemplate(
            UUID.fromString("d593955b-46d7-5830-8542-52ec29e0619f"),
            enterpriseOwner.getId(),
            "Design Discovery Track",
            TemplateType.CUSTOM,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Design Discovery Track for enterprise teams with reusable phases, role defaults, and measurable outcomes.",
            0.71,
            0.62
        );
        ensurePibTemplate(
            UUID.fromString("95118a01-51ac-5ea2-91b9-f917c69d703d"),
            enterpriseOwner.getId(),
            "Migration Reliability Plan",
            TemplateType.WATERFALL,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"OBSERVER\"]",
            "Migration Reliability Plan for enterprise teams with reusable phases, role defaults, and measurable outcomes.",
            0.74,
            0.65
        );

        ensurePibTemplate(
            UUID.fromString("8fef3471-c4ed-5352-89cf-76d0839d9f24"),
            academicOwner.getId(),
            "Delivery Sprint Blueprint",
            TemplateType.SCRUM,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Delivery Sprint Blueprint for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.83,
            0.74
        );
        ensurePibTemplate(
            UUID.fromString("6b136b83-9ad0-50fe-bfe1-b437846bc23e"),
            academicOwner.getId(),
            "Incremental Kanban Delivery",
            TemplateType.KANBAN,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"OBSERVER\"]",
            "Incremental Kanban Delivery for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.88,
            0.79
        );
        ensurePibTemplate(
            UUID.fromString("557725c8-92fe-502b-9643-c07ad1fef97c"),
            academicOwner.getId(),
            "Structured Research Program",
            TemplateType.WATERFALL,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Structured Research Program for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.74,
            0.65
        );
        ensurePibTemplate(
            UUID.fromString("65f464a3-8da1-51e2-a9d2-2df1df3918b6"),
            academicOwner.getId(),
            "Design Discovery Track",
            TemplateType.CUSTOM,
            "[\"PROJECT_MANAGER\",\"DEVELOPER\",\"REVIEWER\"]",
            "Design Discovery Track for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.74,
            0.65
        );
        ensurePibTemplate(
            UUID.fromString("1553b2f4-3aea-533d-b198-fcff8e7ba5d6"),
            academicOwner.getId(),
            "Academic Team Assignment",
            TemplateType.SCRUM,
            "[\"PROFESSOR\",\"DEVELOPER\",\"REVIEWER\"]",
            "Academic Team Assignment for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.83,
            0.74
        );
        ensurePibTemplate(
            UUID.fromString("e120bd40-cd74-5375-a943-068a94c143d4"),
            academicOwner.getId(),
            "Capstone Research Studio",
            TemplateType.CUSTOM,
            "[\"PROFESSOR\",\"DEVELOPER\",\"OBSERVER\"]",
            "Capstone Research Studio for academic teams with reusable phases, role defaults, and measurable outcomes.",
            0.74,
            0.65
        );
    }

    private void ensurePibTemplate(UUID templateId,
                                   Long createdBy,
                                   String name,
                                   TemplateType type,
                                   String defaultRolesJson,
                                   String description,
                                   double fitness,
                                   double completion) {
        String phasesJson = "[{\"name\":\"Discovery\",\"durationDays\":7},{\"name\":\"Planning\",\"durationDays\":14},{\"name\":\"Execution\",\"durationDays\":21},{\"name\":\"Validation\",\"durationDays\":7}]";
        SeedTemplateStructure structure = buildTemplateStructureDefaults(phasesJson, name);

        try {
            Optional<ProjectTemplate> existingOpt = projectTemplateRepository.findById(templateId);
            if (existingOpt.isPresent()) {
                ProjectTemplate existing = existingOpt.get();
                if (ensureTemplateHasStructure(existing, name, phasesJson)) {
                    projectTemplateRepository.save(existing);
                }
                return;
            }
        } catch (Exception ex) {
            log.debug("Error checking PIB template existence: {}", templateId, ex);
            return;
        }

        try {
            // Create new template with explicit ID
            ProjectTemplate template = ProjectTemplate.builder()
                .id(templateId)
                .organization(null)
                .createdBy(createdBy)
                .name(name)
                .templateType(type)
                .status(TemplateStatus.APPROVED)
                .isPublic(true)
                .isFeatured(false)
                .isRecommended(true)
                .isTrending(false)
                .defaultVisibility(DefaultVisibility.PUBLIC)
                .teamStrategy(TeamStrategy.HYBRID)
                .defaultPhasesJson(structure.phasesJson())
                .defaultMilestonesJson(structure.milestonesJson())
                .defaultTasksJson(structure.tasksJson())
                .defaultRolesJson(defaultRolesJson)
                .defaultProjectConfigJson("{\"framework\":\"" + type.name().toLowerCase() + "\",\"source\":\"pib-aligned-seed\"}")
                .useCaseDescription(description)
                .difficultyLevel(DifficultyLevel.INTERMEDIATE)
                .estimatedEffort(EstimatedEffort.MEDIUM)
                .estimatedDurationDays(49)
                .tags("pib,ml-seed," + type.name().toLowerCase())
                .version(1)
                .usageCount(0)
                .rating(0.0)
                .ratingCount(0)
                .mlFitnessScore(fitness)
                .mlCompletionRate(completion)
                .mlLastMetricsAt(Instant.now())
                .deletedAt(null)
                .build();

            projectTemplateRepository.save(template);
        } catch (Exception ex) {
            // Gracefully handle version conflicts or duplicate key errors
            log.debug("Could not upsert PIB template {}: {}", templateId, ex.getMessage());
        }
    }

    private void applyWorkspaceMemberMlProfiles(List<Workspace> workspaces) {
        for (Workspace workspace : workspaces) {
            String orgType = workspace.getOrgType() != null ? workspace.getOrgType().trim().toLowerCase() : "enterprise";
            for (WorkspaceMember wm : workspaceMemberRepository.findAllByWorkspaceId(workspace.getId())) {
                Random rng = new Random(Objects.hash(workspace.getId().toString(), wm.getUserId()));
                double roleHistory = boundedScore(rng, 0.30, 0.95);
                double skillMatch = boundedScore(rng, 0.35, 0.97);
                double availability = boundedScore(rng, 0.25, 0.90);
                double chemistry = boundedScore(rng, 0.20, 0.88);

                List<String> topRoles;
                if ("academic".equals(orgType) && EnumSet.of(
                    WorkspaceMember.WorkspaceRole.TA,
                    WorkspaceMember.WorkspaceRole.ADMIN,
                    WorkspaceMember.WorkspaceRole.OWNER
                ).contains(wm.getRole())) {
                    topRoles = List.of("PROFESSOR", "REVIEWER");
                } else if (!"academic".equals(orgType) && EnumSet.of(
                    WorkspaceMember.WorkspaceRole.MANAGER,
                    WorkspaceMember.WorkspaceRole.ADMIN,
                    WorkspaceMember.WorkspaceRole.OWNER
                ).contains(wm.getRole())) {
                    topRoles = List.of("PROJECT_MANAGER", "REVIEWER");
                } else {
                    topRoles = List.of("DEVELOPER", "REVIEWER");
                }

                List<Double> profileVector = new ArrayList<>(List.of(roleHistory, skillMatch, availability, chemistry));
                for (int i = 0; i < 20; i++) profileVector.add(0.0);

                wm.setMlRoleHistoryScore(roleHistory);
                wm.setMlSkillMatchScore(skillMatch);
                wm.setMlAvailabilityScore(availability);
                wm.setMlChemistryScore(chemistry);
                wm.setMlTopRolesJson(toJson(topRoles));
                wm.setMlProfileVector(toJson(profileVector));
                wm.setMlProfileUpdatedAt(Instant.now());
                workspaceMemberRepository.save(wm);
            }
        }
    }

    private double boundedScore(Random rng, double min, double max) {
        double raw = min + (rng.nextDouble() * (max - min));
        return Math.round(raw * 10000.0) / 10000.0;
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            return "[]";
        }
    }

    private ProjectTemplate applyTemplateReferenceConfig(ProjectTemplate template,
                                                         List<String> githubRepos,
                                                         String academicSourcesQuery) {
        if (template == null) {
            return null;
        }

        List<String> normalizedRepos = new ArrayList<>();
        if (githubRepos != null) {
            for (String repo : githubRepos) {
                String normalized = normalizeGithubRepoUrlSeed(repo);
                if (normalized != null && !normalizedRepos.contains(normalized)) {
                    normalizedRepos.add(normalized);
                }
            }
        }

        Map<String, Object> config = new LinkedHashMap<>();
        config.put(
            "framework",
            template.getTemplateType() != null
                ? template.getTemplateType().name().toLowerCase(Locale.ROOT)
                : "custom"
        );
        config.put("source", "m2-real-data-seed");
        if (!normalizedRepos.isEmpty()) {
            config.put("referenceRepos", normalizedRepos);
        }
        if (hasText(academicSourcesQuery)) {
            config.put("academicSourcesQuery", academicSourcesQuery.trim());
            config.put("academicSourcesEndpoint", "/api/project-templates/academic-sources");
        }

        String configJson = toJson(config);
        if (Objects.equals(template.getDefaultProjectConfigJson(), configJson)) {
            return template;
        }

        template.setDefaultProjectConfigJson(configJson);
        return projectTemplateRepository.save(template);
    }

    private Project applyProjectMetadata(Project project,
                                         String description,
                                         String githubRepoUrl,
                                         String detectedMode,
                                         List<String> domainTags,
                                         List<String> constraints) {
        if (project == null) {
            return null;
        }

        boolean changed = false;

        if (hasText(description) && !Objects.equals(project.getDescription(), description.trim())) {
            project.setDescription(description.trim());
            changed = true;
        }

        String normalizedRepo = normalizeGithubRepoUrlSeed(githubRepoUrl);
        if (!Objects.equals(project.getGithubRepoUrl(), normalizedRepo)) {
            project.setGithubRepoUrl(normalizedRepo);
            changed = true;
        }

        String normalizedMode = hasText(detectedMode) ? detectedMode.trim().toLowerCase(Locale.ROOT) : null;
        if (!Objects.equals(project.getMlDetectedMode(), normalizedMode)) {
            project.setMlDetectedMode(normalizedMode);
            changed = true;
        }

        String domainTagsJson = (domainTags == null || domainTags.isEmpty()) ? null : toJson(domainTags);
        if (!Objects.equals(project.getMlDomainTagsJson(), domainTagsJson)) {
            project.setMlDomainTagsJson(domainTagsJson);
            changed = true;
        }

        String constraintsJson = (constraints == null || constraints.isEmpty()) ? null : toJson(constraints);
        if (!Objects.equals(project.getMlConstraintsJson(), constraintsJson)) {
            project.setMlConstraintsJson(constraintsJson);
            changed = true;
        }

        if (project.getMlLastInferenceAt() == null) {
            project.setMlLastInferenceAt(Instant.now());
            changed = true;
        }

        return changed ? projectRepository.save(project) : project;
    }

    private String normalizeGithubRepoUrlSeed(String rawUrl) {
        if (!hasText(rawUrl)) {
            return null;
        }

        String value = rawUrl.trim();
        if (value.matches("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) {
            value = "https://github.com/" + value;
        }

        value = value.replaceAll("/+$", "");
        return value;
    }

    private void ensureAcademicSourceTasks(Project project, User owner, String query) {
        if (project == null || owner == null || !hasText(query)) {
            return;
        }

        List<Task> existing = taskRepository.findByProject_Id(project.getId());
        boolean alreadySeeded = existing.stream().anyMatch(task ->
            hasText(task.getDescription()) && task.getDescription().contains(ACADEMIC_SOURCE_TASK_MARKER)
        );
        if (alreadySeeded) {
            return;
        }

        List<Map<String, Object>> sources = fetchAcademicSourceItems(query.trim(), 4);
        if (sources.isEmpty()) {
            return;
        }

        Milestone sourceMilestone = ensureAcademicSourcesMilestone(project, owner, query);
        LocalDate baseDate = resolveProjectStartDate(project);
        int created = 0;

        for (Map<String, Object> source : sources) {
            if (created >= 4) {
                break;
            }

            String title = asText(source.get("title"));
            if (!hasText(title)) {
                continue;
            }

            String openAccessUrl = asText(source.get("openAccessUrl"));
            String landingPageUrl = asText(source.get("landingPageUrl"));
            String sourceUrl = firstNonBlank(openAccessUrl, landingPageUrl);
            String firstAuthor = asText(source.get("firstAuthor"));
            String publicationYear = asText(source.get("publicationYear"));

            StringBuilder description = new StringBuilder();
            description.append(ACADEMIC_SOURCE_TASK_MARKER)
                .append(" Review and summarize evidence from \"")
                .append(title)
                .append("\".");

            if (hasText(firstAuthor) || hasText(publicationYear)) {
                description.append(" Source metadata:");
                if (hasText(firstAuthor)) {
                    description.append(" author=").append(firstAuthor).append(";");
                }
                if (hasText(publicationYear)) {
                    description.append(" year=").append(publicationYear).append(";");
                }
            }

            if (hasText(sourceUrl)) {
                description.append(" Link: ").append(sourceUrl).append(".");
            }

            taskRepository.save(Task.builder()
                .project(project)
                .milestone(sourceMilestone)
                .title("Review source: " + abbreviate(title, 80))
                .description(description.toString())
                .taskType(Task.TaskType.task)
                .status(Task.TaskStatus.todo)
                .priority(Task.TaskPriority.medium)
                .estimatedHours(4f + created)
                .createdBy(owner)
                .assignedTo(owner)
                .startDate(baseDate.plusDays(2L + (long) created * 5L))
                .dueDate(baseDate.plusDays(5L + (long) created * 5L))
                .build());

            created++;
        }
    }

    private Milestone ensureAcademicSourcesMilestone(Project project, User owner, String query) {
        for (Milestone milestone : milestoneRepository.findByProject_Id(project.getId())) {
            if ("academic-source-digest".equalsIgnoreCase(milestone.getSourceMilestoneKey())) {
                return milestone;
            }
        }

        LocalDate dueDate = resolveProjectStartDate(project).plusDays(14L);
        return milestoneRepository.save(Milestone.builder()
            .project(project)
            .name("Academic Source Digest")
            .description("Curated literature review checkpoint for query: " + query)
            .dueDate(dueDate)
            .status(Milestone.MilestoneStatus.in_progress)
            .completionPct(30f)
            .isGate(Boolean.FALSE)
            .sourceMilestoneKey("academic-source-digest")
            .createdBy(owner)
            .build());
    }

    private List<Map<String, Object>> fetchAcademicSourceItems(String query, int limit) {
        try {
            Map<String, Object> payload = publicIntegrationService.getAcademicSources(query, limit);
            Object rawItems = payload.get("items");
            if (rawItems instanceof List<?> list) {
                List<Map<String, Object>> normalized = new ArrayList<>();
                for (Object row : list) {
                    if (!(row instanceof Map<?, ?> map)) {
                        continue;
                    }

                    Map<String, Object> copy = new LinkedHashMap<>();
                    for (Map.Entry<?, ?> entry : map.entrySet()) {
                        if (entry.getKey() != null) {
                            copy.put(String.valueOf(entry.getKey()), entry.getValue());
                        }
                    }
                    normalized.add(copy);
                }

                if (!normalized.isEmpty()) {
                    return normalized;
                }
            }
        } catch (Exception ex) {
            log.warn("[M2DevSeedService] Academic source API unavailable for '{}': {}", query, ex.getMessage());
        }

        return fallbackAcademicSourceItems();
    }

    private List<Map<String, Object>> fallbackAcademicSourceItems() {
        List<Map<String, Object>> fallback = new ArrayList<>();

        Map<String, Object> source1 = new LinkedHashMap<>();
        source1.put("title", "A Survey on Reproducibility in Machine Learning");
        source1.put("firstAuthor", "Pineau et al.");
        source1.put("publicationYear", 2021);
        source1.put("openAccessUrl", "https://arxiv.org/abs/2003.12206");
        fallback.add(source1);

        Map<String, Object> source2 = new LinkedHashMap<>();
        source2.put("title", "Technical Debt in Machine Learning Systems");
        source2.put("firstAuthor", "Sculley et al.");
        source2.put("publicationYear", 2015);
        source2.put("openAccessUrl", "https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html");
        fallback.add(source2);

        Map<String, Object> source3 = new LinkedHashMap<>();
        source3.put("title", "Hidden Technical Debt in ML Systems (Practice Notes)");
        source3.put("firstAuthor", "Google Research");
        source3.put("publicationYear", 2023);
        source3.put("landingPageUrl", "https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/");
        fallback.add(source3);

        Map<String, Object> source4 = new LinkedHashMap<>();
        source4.put("title", "Project-Based Learning in Software Engineering Education");
        source4.put("firstAuthor", "ACM Education SIG");
        source4.put("publicationYear", 2022);
        source4.put("landingPageUrl", "https://dl.acm.org/");
        fallback.add(source4);

        return fallback;
    }

    private String asText(Object raw) {
        if (raw == null) {
            return null;
        }
        String text = String.valueOf(raw).trim();
        return text.isEmpty() ? null : text;
    }

    private String abbreviate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        if (maxLength <= 3) {
            return text.substring(0, Math.max(0, maxLength));
        }
        return text.substring(0, maxLength - 3) + "...";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROJECT
    // ─────────────────────────────────────────────────────────────────────────

    private Project ensureProject(Workspace ws, Long creatorId, String name,
                                  Project.ProjectStatus status, Project.Visibility visibility,
                                  LocalDate startDate, LocalDate endDate,
                                  ProjectTemplate template) {
        // Ensure project exists; if it does exist ensure its created_at is not newer than SEEDED_CREATED_AT
        Optional<Project> existing = projectRepository.findAllByWorkspaceId(ws.getId(), Pageable.unpaged()).stream()
            .filter(p -> name.equalsIgnoreCase(p.getName()))
            .findFirst();

        if (existing.isPresent()) {
            Project p = existing.get();
            boolean changed = false;

            if (!Objects.equals(p.getCreatedBy(), creatorId)) {
                p.setCreatedBy(creatorId);
                changed = true;
            }
            if (!Objects.equals(p.getName(), name)) {
                p.setName(name);
                changed = true;
            }
            if (!Objects.equals(p.getStatus(), status)) {
                p.setStatus(status);
                changed = true;
            }
            if (!Objects.equals(p.getVisibility(), visibility)) {
                p.setVisibility(visibility);
                changed = true;
            }
            if (!Objects.equals(p.getStartDate(), startDate)) {
                p.setStartDate(startDate);
                changed = true;
            }
            if (!Objects.equals(p.getEndDate(), endDate)) {
                p.setEndDate(endDate);
                changed = true;
            }

            UUID expectedTemplateId = template != null ? template.getId() : null;
            if (!Objects.equals(p.getTemplateId(), expectedTemplateId)) {
                p.setTemplateId(expectedTemplateId);
                changed = true;
            }

            if (template != null && !Objects.equals(p.getPhasesJson(), template.getDefaultPhasesJson())) {
                p.setPhasesJson(template.getDefaultPhasesJson());
                changed = true;
            }

            if (p.getCreatedAt() == null || p.getCreatedAt().isAfter(SEEDED_CREATED_AT)) {
                // Use direct JDBC update because created_at is updatable=false in JPA mapping
                jdbcTemplate.update("UPDATE projects SET created_at = ? WHERE id = ?", java.sql.Timestamp.from(SEEDED_CREATED_AT), p.getId().toString());
                p.setCreatedAt(SEEDED_CREATED_AT);
                changed = true;
            }

            if (changed) {
                p = projectRepository.save(p);
            }
            return p;
        }

        Project.ProjectBuilder builder = Project.builder()
            .workspace(ws)
            .createdBy(creatorId)
            .name(name)
            .status(status)
            .visibility(visibility)
            .startDate(startDate)
            .endDate(endDate)
            .createdAt(SEEDED_CREATED_AT);
        if (template != null) {
            builder.templateId(template.getId())
                   .phasesJson(template.getDefaultPhasesJson());
        }
        return projectRepository.save(builder.build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROJECT MEMBER
    // ─────────────────────────────────────────────────────────────────────────

    private void ensureProjMember(Project project, Long userId,
                                  ProjectMember.ProjectRole role, User assigner) {
        if (projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId)) return;
        projectMemberRepository.save(ProjectMember.builder()
            .project(project)
            .userId(userId)
            .role(role)
            .assignedByUser(assigner)
            .build());
    }

    private void applyTimeMachineTimeline(
        Workspace workspace,
        User owner,
        User coreDev,
        User rotatingDev,
        User analyst,
        Project chronosCore,
        Project legacySunset,
        Project portalReboot,
        Project growthAnalytics,
        Project managerDelivery,
        Project managerAcademicBridge
    ) {
        ensureWorkspaceMemberTimeline(
            workspace.getId(), owner.getId(), WorkspaceMember.WorkspaceRole.OWNER,
            Instant.parse("2024-01-02T09:00:00Z"), null
        );
        ensureWorkspaceMemberTimeline(
            workspace.getId(), coreDev.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE,
            Instant.parse("2024-04-12T10:15:00Z"), null
        );
        ensureWorkspaceMemberTimeline(
            workspace.getId(), rotatingDev.getId(), WorkspaceMember.WorkspaceRole.EMPLOYEE,
            Instant.parse("2025-02-06T08:45:00Z"), Instant.parse("2026-01-15T18:00:00Z")
        );
        ensureWorkspaceMemberTimeline(
            workspace.getId(), analyst.getId(), WorkspaceMember.WorkspaceRole.VIEWER,
            Instant.parse("2026-04-17T09:30:00Z"), null
        );

        ensureProjectTimeline(
            chronosCore.getId(), Project.ProjectStatus.ACTIVE, Project.Visibility.PRIVATE,
            Instant.parse("2024-03-10T08:00:00Z"), null
        );
        ensureProjectTimeline(
            legacySunset.getId(), Project.ProjectStatus.COMPLETED, Project.Visibility.PRIVATE,
            Instant.parse("2024-09-01T12:00:00Z"), Instant.parse("2025-06-20T20:00:00Z")
        );
        ensureProjectTimeline(
            portalReboot.getId(), Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            Instant.parse("2025-09-05T14:00:00Z"), null
        );
        ensureProjectTimeline(
            growthAnalytics.getId(), Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            Instant.parse("2026-02-28T16:00:00Z"), null
        );
        ensureProjectTimeline(
            managerDelivery.getId(), Project.ProjectStatus.ACTIVE, Project.Visibility.PUBLIC,
            Instant.parse("2026-04-18T11:15:00Z"), null
        );
        ensureProjectTimeline(
            managerAcademicBridge.getId(), Project.ProjectStatus.PLANNING, Project.Visibility.PRIVATE,
            Instant.parse("2026-04-19T10:45:00Z"), null
        );
    }

    private void ensureWorkspaceMemberTimeline(
        UUID workspaceId,
        Long userId,
        WorkspaceMember.WorkspaceRole role,
        Instant joinedAt,
        Instant deletedAt
    ) {
        String workspaceKey = workspaceId.toString();
        String roleColumn = workspaceMemberRoleColumn();
        jdbcTemplate.update(
            "UPDATE workspace_members SET joined_at = ?, deleted_at = ?, " + roleColumn + " = ? " +
                "WHERE user_id = ? AND (workspace_id = ? OR workspace_id = UNHEX(REPLACE(?, '-', '')))",
            java.sql.Timestamp.from(joinedAt),
            deletedAt == null ? null : java.sql.Timestamp.from(deletedAt),
            role.name(),
            userId,
            workspaceKey,
            workspaceKey
        );
    }

    private void ensureProjectTimeline(
        UUID projectId,
        Project.ProjectStatus status,
        Project.Visibility visibility,
        Instant createdAt,
        Instant deletedAt
    ) {
        String projectKey = projectId.toString();
        jdbcTemplate.update(
            "UPDATE projects SET status = ?, visibility = ?, created_at = ?, deleted_at = ? " +
                "WHERE (id = ? OR id = UNHEX(REPLACE(?, '-', '')))",
            status.name(),
            visibility.name(),
            java.sql.Timestamp.from(createdAt),
            deletedAt == null ? null : java.sql.Timestamp.from(deletedAt),
            projectKey,
            projectKey
        );
    }

    private String workspaceMemberRoleColumn() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = 'workspace_members' AND column_name = 'workspace_role'",
            Integer.class
        );
        return (count != null && count > 0) ? "workspace_role" : "role";
    }

    private List<String> timeMachineSuggestedDates() {
        return List.of(
            "2024-01-02T23:59:59Z",
            "2024-09-01T23:59:59Z",
            "2025-09-05T23:59:59Z",
            "2026-02-28T23:59:59Z",
            "2026-04-18T23:59:59Z",
            "2026-04-19T23:59:59Z"
        );
    }

    private void ensureSeedProjectTimelines(List<SeedProjectTimelineSpec> specs) {
        for (SeedProjectTimelineSpec spec : specs) {
            if (spec == null || spec.project() == null || spec.owner() == null) {
                continue;
            }

            try {
                ensureProjectTimelineSeed(spec.project(), spec.owner(), spec.template());
            } catch (Exception ex) {
                log.warn(
                    "[M2DevSeedService] Timeline seed skipped for project '{}': {}",
                    spec.project().getName(),
                    ex.getMessage()
                );
            }
        }
    }

    private void ensureProjectTimelineSeed(Project project, User owner, ProjectTemplate template) {
        List<Milestone> existingMilestones = milestoneRepository.findByProject_Id(project.getId());
        List<Task> existingTasks = taskRepository.findByProject_Id(project.getId());

        if (!existingMilestones.isEmpty() && !existingTasks.isEmpty()) {
            return;
        }

        TemplateStructureService.NormalizedTemplateStructure structure = resolveTimelineStructure(project, template);
        LocalDate projectStartDate = resolveProjectStartDate(project);

        Map<String, Milestone> milestonesByKey = new LinkedHashMap<>();
        List<Milestone> milestonePool = new ArrayList<>(existingMilestones);

        if (existingMilestones.isEmpty()) {
            milestonesByKey = createSeedMilestones(project, owner, structure, projectStartDate);
            milestonePool = new ArrayList<>(milestonesByKey.values());
        } else {
            milestonePool.sort(
                Comparator.comparing(Milestone::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(Milestone::getId)
            );
        }

        if (existingTasks.isEmpty()) {
            createSeedTasks(project, owner, structure, projectStartDate, milestonePool, milestonesByKey);
        }
    }

    private TemplateStructureService.NormalizedTemplateStructure resolveTimelineStructure(Project project,
                                                                                          ProjectTemplate template) {
        String phasesJson = firstNonBlank(
            project.getPhasesJson(),
            template != null ? template.getDefaultPhasesJson() : null
        );
        String milestonesJson = template != null ? template.getDefaultMilestonesJson() : null;
        String tasksJson = template != null ? template.getDefaultTasksJson() : null;

        SeedTemplateStructure generated = buildTemplateStructureDefaults(phasesJson, project.getName());

        String normalizedPhasesJson = hasText(phasesJson) ? phasesJson : generated.phasesJson();
        String normalizedMilestonesJson = hasNonEmptyJsonArray(milestonesJson)
            ? milestonesJson
            : generated.milestonesJson();
        String normalizedTasksJson = hasNonEmptyJsonArray(tasksJson)
            ? tasksJson
            : generated.tasksJson();

        try {
            return templateStructureService.normalizeTemplateStructure(
                normalizedPhasesJson,
                normalizedMilestonesJson,
                normalizedTasksJson,
                "M2 seed timeline"
            );
        } catch (Module2Exception ex) {
            return templateStructureService.normalizeTemplateStructure(
                generated.phasesJson(),
                generated.milestonesJson(),
                generated.tasksJson(),
                "M2 seed timeline fallback"
            );
        }
    }

    private Map<String, Milestone> createSeedMilestones(Project project,
                                                        User owner,
                                                        TemplateStructureService.NormalizedTemplateStructure structure,
                                                        LocalDate projectStartDate) {
        List<TemplateStructureService.MilestoneSpec> specs = structure.milestones().stream()
            .filter(TemplateStructureService.MilestoneSpec::enabled)
            .sorted(Comparator.comparingInt(TemplateStructureService.MilestoneSpec::offsetDays))
            .limit(18)
            .toList();

        Map<String, Milestone> created = new LinkedHashMap<>();

        if (specs.isEmpty()) {
            List<String> fallbackNames = List.of("Kickoff", "Execution Checkpoint", "Release");
            for (int i = 0; i < fallbackNames.size(); i++) {
                Milestone.MilestoneStatus status = resolveSeedMilestoneStatus(
                    project.getStatus(),
                    i,
                    fallbackNames.size(),
                    "pending"
                );

                Milestone milestone = milestoneRepository.save(Milestone.builder()
                    .project(project)
                    .name(project.getName() + " " + fallbackNames.get(i))
                    .description("Seeded milestone for README coverage.")
                    .dueDate(projectStartDate.plusDays((long) i * 14L))
                    .status(status)
                    .completionPct(resolveSeedMilestoneCompletion(status, 0f))
                    .createdBy(owner)
                    .build());
                created.put("fallback-ms-" + (i + 1), milestone);
            }
            return created;
        }

        for (int i = 0; i < specs.size(); i++) {
            TemplateStructureService.MilestoneSpec spec = specs.get(i);
            Milestone.MilestoneStatus status = resolveSeedMilestoneStatus(
                project.getStatus(),
                i,
                specs.size(),
                spec.status()
            );

            Milestone milestone = milestoneRepository.save(Milestone.builder()
                .project(project)
                .name(spec.name())
                .description(spec.description())
                .dueDate(resolveSeedDateFromOffset(projectStartDate, spec.offsetDays()))
                .status(status)
                .completionPct(resolveSeedMilestoneCompletion(status, spec.completionPct()))
                .createdBy(owner)
                .build());

            created.put(spec.key(), milestone);
        }

        return created;
    }

    private void createSeedTasks(Project project,
                                 User owner,
                                 TemplateStructureService.NormalizedTemplateStructure structure,
                                 LocalDate projectStartDate,
                                 List<Milestone> milestonePool,
                                 Map<String, Milestone> milestonesByKey) {
        List<User> assignableUsers = resolveAssignableProjectUsers(project, owner);

        Map<String, Integer> milestoneOffsetByKey = new LinkedHashMap<>();
        for (TemplateStructureService.MilestoneSpec milestoneSpec : structure.milestones()) {
            milestoneOffsetByKey.put(milestoneSpec.key(), milestoneSpec.offsetDays());
        }

        List<TemplateStructureService.TaskSpec> specs = structure.tasks().stream()
            .filter(TemplateStructureService.TaskSpec::enabled)
            .limit(36)
            .toList();

        Map<String, Task> tasksByKey = new LinkedHashMap<>();
        Map<String, String> parentReferences = new LinkedHashMap<>();

        if (specs.isEmpty()) {
            int fallbackCount = Math.max(3, milestonePool.isEmpty() ? 3 : Math.min(6, milestonePool.size() * 2));
            for (int i = 0; i < fallbackCount; i++) {
                Milestone milestone = milestonePool.isEmpty() ? null : milestonePool.get(i % milestonePool.size());
                User assignedTo = assignableUsers.isEmpty() ? null : assignableUsers.get(i % assignableUsers.size());
                Task.TaskStatus status = resolveSeedTaskStatus(project.getStatus(), i, fallbackCount, "todo");

                LocalDate startDate = projectStartDate.plusDays((long) i * 5L);
                LocalDate dueDate = startDate.plusDays(4L);

                taskRepository.save(Task.builder()
                    .project(project)
                    .milestone(milestone)
                    .title((milestone != null ? milestone.getName() : project.getName()) + " Task " + (i + 1))
                    .description("Seeded delivery task for README timeline coverage.")
                    .taskType(Task.TaskType.task)
                    .status(status)
                    .priority(i == fallbackCount - 1 ? Task.TaskPriority.high : Task.TaskPriority.medium)
                    .estimatedHours(6f + i)
                    .createdBy(owner)
                    .assignedTo(assignedTo)
                    .startDate(startDate)
                    .dueDate(dueDate)
                    .build());
            }
            return;
        }

        for (int i = 0; i < specs.size(); i++) {
            TemplateStructureService.TaskSpec spec = specs.get(i);

            Milestone milestone = spec.milestoneKey() != null ? milestonesByKey.get(spec.milestoneKey()) : null;
            if (milestone == null && !milestonePool.isEmpty()) {
                milestone = milestonePool.get(i % milestonePool.size());
            }

            User assignedTo = assignableUsers.isEmpty() ? null : assignableUsers.get(i % assignableUsers.size());
            Task.TaskStatus status = resolveSeedTaskStatus(project.getStatus(), i, specs.size(), spec.status());

            Task task = Task.builder()
                .project(project)
                .milestone(milestone)
                .title(spec.title())
                .description(spec.description())
                .taskType(parseTaskType(spec.taskType(), Task.TaskType.task))
                .status(status)
                .priority(parseTaskPriority(spec.priority(), Task.TaskPriority.medium))
                .estimatedHours(spec.estimatedHours() != null ? spec.estimatedHours() : (6f + (i % 6)))
                .createdBy(owner)
                .assignedTo(assignedTo)
                .startDate(resolveSeedTaskStartDate(projectStartDate, spec, milestoneOffsetByKey))
                .dueDate(resolveSeedTaskDueDate(projectStartDate, spec, milestoneOffsetByKey))
                .build();

            Task saved = taskRepository.save(task);
            tasksByKey.put(spec.key(), saved);

            if (hasText(spec.parentTaskKey())) {
                parentReferences.put(spec.key(), spec.parentTaskKey());
            }
        }

        for (Map.Entry<String, String> parentRef : parentReferences.entrySet()) {
            Task child = tasksByKey.get(parentRef.getKey());
            Task parent = tasksByKey.get(parentRef.getValue());
            if (child == null || parent == null || Objects.equals(child.getId(), parent.getId())) {
                continue;
            }

            child.setParentTask(parent);
            taskRepository.save(child);
        }
    }

    private List<User> resolveAssignableProjectUsers(Project project, User owner) {
        LinkedHashSet<Long> userIds = new LinkedHashSet<>();
        for (ProjectMember member : projectMemberRepository.findAllByProjectId(project.getId())) {
            userIds.add(member.getUserId());
        }
        if (owner != null && owner.getId() != null) {
            userIds.add(owner.getId());
        }

        if (userIds.isEmpty()) {
            return List.of();
        }

        Map<Long, User> usersById = new LinkedHashMap<>();
        userRepository.findAllById(userIds).forEach(user -> usersById.put(user.getId(), user));

        List<User> users = new ArrayList<>();
        for (Long userId : userIds) {
            User user = usersById.get(userId);
            if (user != null) {
                users.add(user);
            }
        }

        return users;
    }

    private LocalDate resolveProjectStartDate(Project project) {
        if (project.getStartDate() != null) {
            return project.getStartDate();
        }
        if (project.getCreatedAt() != null) {
            return project.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        return LocalDate.now();
    }

    private LocalDate resolveSeedDateFromOffset(LocalDate projectStartDate, Integer offsetDays) {
        if (projectStartDate == null || offsetDays == null) {
            return null;
        }
        return projectStartDate.plusDays(Math.max(0, offsetDays));
    }

    private LocalDate resolveSeedTaskStartDate(LocalDate projectStartDate,
                                               TemplateStructureService.TaskSpec spec,
                                               Map<String, Integer> milestoneOffsetByKey) {
        Integer startOffset = spec.startOffsetDays();
        if (startOffset == null && spec.milestoneKey() != null) {
            startOffset = milestoneOffsetByKey.get(spec.milestoneKey());
        }
        return resolveSeedDateFromOffset(projectStartDate, startOffset);
    }

    private LocalDate resolveSeedTaskDueDate(LocalDate projectStartDate,
                                             TemplateStructureService.TaskSpec spec,
                                             Map<String, Integer> milestoneOffsetByKey) {
        Integer dueOffset = spec.dueOffsetDays();
        Integer inferredStartOffset = spec.startOffsetDays();

        if (inferredStartOffset == null && spec.milestoneKey() != null) {
            inferredStartOffset = milestoneOffsetByKey.get(spec.milestoneKey());
        }

        if (dueOffset == null && inferredStartOffset != null && spec.estimatedHours() != null && spec.estimatedHours() > 0f) {
            int estimatedDays = Math.max(1, (int) Math.ceil(spec.estimatedHours() / 8.0));
            dueOffset = inferredStartOffset + estimatedDays;
        }

        if (dueOffset == null) {
            dueOffset = inferredStartOffset;
        }

        return resolveSeedDateFromOffset(projectStartDate, dueOffset);
    }

    private Milestone.MilestoneStatus resolveSeedMilestoneStatus(Project.ProjectStatus projectStatus,
                                                                 int index,
                                                                 int total,
                                                                 String fallbackStatus) {
        Milestone.MilestoneStatus fallback = parseMilestoneStatus(fallbackStatus, Milestone.MilestoneStatus.pending);
        if (projectStatus == null) {
            return fallback;
        }

        return switch (projectStatus) {
            case COMPLETED, ARCHIVED -> Milestone.MilestoneStatus.completed;
            case ACTIVE -> index < Math.max(1, total / 2)
                ? Milestone.MilestoneStatus.completed
                : Milestone.MilestoneStatus.in_progress;
            case ON_HOLD -> index == 0
                ? Milestone.MilestoneStatus.completed
                : Milestone.MilestoneStatus.at_risk;
            case CANCELLED -> index == 0
                ? Milestone.MilestoneStatus.completed
                : Milestone.MilestoneStatus.missed;
            case PLANNING -> fallback;
        };
    }

    private float resolveSeedMilestoneCompletion(Milestone.MilestoneStatus status, float fallbackCompletion) {
        return switch (status) {
            case completed -> 100f;
            case in_progress -> Math.max(40f, Math.min(95f, fallbackCompletion > 0f ? fallbackCompletion : 65f));
            case at_risk -> Math.max(20f, Math.min(80f, fallbackCompletion > 0f ? fallbackCompletion : 45f));
            case missed -> Math.max(5f, Math.min(60f, fallbackCompletion > 0f ? fallbackCompletion : 20f));
            case pending -> Math.max(0f, Math.min(35f, fallbackCompletion));
        };
    }

    private Task.TaskStatus resolveSeedTaskStatus(Project.ProjectStatus projectStatus,
                                                  int index,
                                                  int total,
                                                  String fallbackStatus) {
        Task.TaskStatus fallback = parseTaskStatus(fallbackStatus, Task.TaskStatus.todo);
        if (projectStatus == null) {
            return fallback;
        }

        return switch (projectStatus) {
            case COMPLETED, ARCHIVED -> Task.TaskStatus.done;
            case ACTIVE -> {
                int doneThreshold = Math.max(1, total / 3);
                int progressThreshold = Math.max(doneThreshold + 1, (total * 2) / 3);
                if (index < doneThreshold) {
                    yield Task.TaskStatus.done;
                }
                if (index < progressThreshold) {
                    yield Task.TaskStatus.in_progress;
                }
                yield fallback;
            }
            case ON_HOLD -> {
                if (index == 0) {
                    yield Task.TaskStatus.done;
                }
                if (index == 1) {
                    yield Task.TaskStatus.blocked;
                }
                yield fallback;
            }
            case CANCELLED -> Task.TaskStatus.blocked;
            case PLANNING -> fallback;
        };
    }

    private Milestone.MilestoneStatus parseMilestoneStatus(String rawStatus,
                                                           Milestone.MilestoneStatus fallback) {
        if (!hasText(rawStatus)) {
            return fallback;
        }
        try {
            return Milestone.MilestoneStatus.valueOf(rawStatus.trim().toLowerCase(Locale.ROOT));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private Task.TaskType parseTaskType(String rawType, Task.TaskType fallback) {
        if (!hasText(rawType)) {
            return fallback;
        }
        try {
            return Task.TaskType.valueOf(rawType.trim().toLowerCase(Locale.ROOT));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private Task.TaskStatus parseTaskStatus(String rawStatus, Task.TaskStatus fallback) {
        if (!hasText(rawStatus)) {
            return fallback;
        }
        try {
            return Task.TaskStatus.valueOf(rawStatus.trim().toLowerCase(Locale.ROOT));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private Task.TaskPriority parseTaskPriority(String rawPriority, Task.TaskPriority fallback) {
        if (!hasText(rawPriority)) {
            return fallback;
        }
        try {
            return Task.TaskPriority.valueOf(rawPriority.trim().toLowerCase(Locale.ROOT));
        } catch (Exception ex) {
            return fallback;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FAVORITES  &  RATINGS
    // ─────────────────────────────────────────────────────────────────────────

    private void ensureFavorite(User user, ProjectTemplate template) {
        if (!templateFavoriteRepository.existsByTemplateIdAndUserId(template.getId(), user.getId())) {
            templateFavoriteRepository.save(TemplateFavorite.builder()
                .templateId(template.getId())
                .userId(user.getId())
                .build());
        }
    }

    private void ensureRating(User user, ProjectTemplate template, int stars) {
        if (!templateRatingRepository.existsByTemplateIdAndUserId(template.getId(), user.getId())) {
            templateRatingRepository.save(TemplateRating.builder()
                .templateId(template.getId())
                .userId(user.getId())
                .rating(stars)
                .build());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    //  TEMPLATE FORK
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a forked template with a custom name.
     * Uses ProjectTemplateService.forkTemplate() internally to ensure proper
     * genealogy (parentTemplateId) and consistency.
     *
     * @param sourceTemplate the template to fork
     * @param requesterId    the ID of the user creating the fork
     * @param customName     the custom name for the fork (overrides default " (Fork)" suffix)
     * @return the saved fork template
     */
    private ProjectTemplate ensureTemplateFork(ProjectTemplate sourceTemplate,
                                                Long requesterId,
                                                String customName) {
        Optional<ProjectTemplate> existingFork = projectTemplateRepository.findAll().stream()
            .filter(t -> Objects.equals(t.getParentTemplateId(), sourceTemplate.getId())
                && customName.equalsIgnoreCase(t.getName()))
            .findFirst();

        if (existingFork.isPresent()) {
            ProjectTemplate fork = existingFork.get();
            boolean changed = false;

            if (!Boolean.TRUE.equals(fork.getIsPublic())) {
                fork.setIsPublic(true);
                changed = true;
            }
            if (fork.getStatus() != TemplateStatus.APPROVED) {
                fork.setStatus(TemplateStatus.APPROVED);
                changed = true;
            }
            if (fork.getDefaultVisibility() != DefaultVisibility.PUBLIC) {
                fork.setDefaultVisibility(DefaultVisibility.PUBLIC);
                changed = true;
            }
            if (!Objects.equals(fork.getVersion(), 1)) {
                fork.setVersion(1);
                changed = true;
            }
            if (ensureTemplateHasStructure(fork, customName, sourceTemplate.getDefaultPhasesJson())) {
                changed = true;
            }
            return changed ? projectTemplateRepository.save(fork) : fork;
        }

        // Use service to fork (sets parentTemplateId, status=DRAFT, etc.)
        ProjectTemplate fork = projectTemplateService.forkTemplate(sourceTemplate.getId(), requesterId);
        
        // Override the default " (Fork)" naming with custom name
        fork.setName(customName);
        fork.setVersion(1);
        // Make forks public and approved for easy discovery
        fork.setIsPublic(true);
        fork.setStatus(ProjectTemplate.TemplateStatus.APPROVED);
        fork.setDefaultVisibility(ProjectTemplate.DefaultVisibility.PUBLIC);
        ensureTemplateHasStructure(fork, customName, sourceTemplate.getDefaultPhasesJson());
        
        // Save with custom name and public visibility
        return projectTemplateRepository.save(fork);
    }

    private boolean ensureTemplateHasStructure(ProjectTemplate template,
                                               String templateName,
                                               String preferredPhasesJson) {
        String sourcePhasesJson = isJsonArray(template.getDefaultPhasesJson())
            ? template.getDefaultPhasesJson()
            : preferredPhasesJson;
        SeedTemplateStructure generated = buildTemplateStructureDefaults(sourcePhasesJson, templateName);
        boolean changed = false;

        if (!isJsonArray(template.getDefaultPhasesJson())) {
            template.setDefaultPhasesJson(generated.phasesJson());
            changed = true;
        }
        if (!hasNonEmptyJsonArray(template.getDefaultMilestonesJson())) {
            template.setDefaultMilestonesJson(generated.milestonesJson());
            changed = true;
        }
        if (!hasNonEmptyJsonArray(template.getDefaultTasksJson())) {
            template.setDefaultTasksJson(generated.tasksJson());
            changed = true;
        }
        if (!hasText(template.getDefaultRolesJson())) {
            template.setDefaultRolesJson("[]");
            changed = true;
        }

        return changed;
    }

    private SeedTemplateStructure buildTemplateStructureDefaults(String phasesJson, String templateName) {
        List<SeedPhaseSpec> phases = parseSeedPhases(phasesJson, templateName);

        List<Map<String, Object>> phaseRows = new ArrayList<>();
        List<Map<String, Object>> milestones = new ArrayList<>();
        List<Map<String, Object>> tasks = new ArrayList<>();

        int runningOffset = 0;
        for (int i = 0; i < phases.size(); i++) {
            SeedPhaseSpec phase = phases.get(i);
            int phaseDuration = Math.max(1, phase.durationDays());
            int phaseStartOffset = runningOffset;
            int phaseEndOffset = phaseStartOffset + phaseDuration;

            Map<String, Object> phaseRow = new LinkedHashMap<>();
            phaseRow.put("key", phase.key());
            phaseRow.put("name", phase.name());
            phaseRow.put("durationDays", phase.durationDays());
            phaseRow.put("order", i + 1);
            phaseRow.put("enabled", phase.enabled());
            phaseRows.add(phaseRow);

            String kickoffMilestoneKey = phase.key() + "-ms-kickoff";
            String completionMilestoneKey = phase.key() + "-ms-complete";

            Map<String, Object> kickoffMilestone = new LinkedHashMap<>();
            kickoffMilestone.put("key", kickoffMilestoneKey);
            kickoffMilestone.put("name", phase.name() + " Kickoff");
            kickoffMilestone.put("description", "Kickoff checkpoint for " + phase.name() + ".");
            kickoffMilestone.put("phaseKey", phase.key());
            kickoffMilestone.put("offsetDays", phaseStartOffset);
            kickoffMilestone.put("status", "pending");
            kickoffMilestone.put("completionPct", 0f);
            kickoffMilestone.put("enabled", phase.enabled());
            milestones.add(kickoffMilestone);

            Map<String, Object> completionMilestone = new LinkedHashMap<>();
            completionMilestone.put("key", completionMilestoneKey);
            completionMilestone.put("name", phase.name() + " Complete");
            completionMilestone.put("description", "Completion checkpoint for " + phase.name() + ".");
            completionMilestone.put("phaseKey", phase.key());
            completionMilestone.put("offsetDays", Math.max(phaseStartOffset, phaseEndOffset - 1));
            completionMilestone.put("status", "pending");
            completionMilestone.put("completionPct", 0f);
            completionMilestone.put("enabled", phase.enabled());
            milestones.add(completionMilestone);

            int planningDueOffset = Math.max(phaseStartOffset, phaseStartOffset + Math.max(1, phaseDuration / 2));
            int executionStartOffset = Math.min(planningDueOffset, Math.max(phaseStartOffset, phaseEndOffset - 1));
            int executionDueOffset = Math.max(executionStartOffset, phaseEndOffset);

            Map<String, Object> planningTask = new LinkedHashMap<>();
            planningTask.put("key", phase.key() + "-task-plan");
            planningTask.put("title", "Plan " + phase.name());
            planningTask.put("description", "Define scope and acceptance criteria for " + phase.name() + ".");
            planningTask.put("phaseKey", phase.key());
            planningTask.put("milestoneKey", kickoffMilestoneKey);
            planningTask.put("taskType", "task");
            planningTask.put("status", "todo");
            planningTask.put("priority", "medium");
            planningTask.put("estimatedHours", 6f + i);
            planningTask.put("startOffsetDays", phaseStartOffset);
            planningTask.put("dueOffsetDays", planningDueOffset);
            planningTask.put("enabled", phase.enabled());
            tasks.add(planningTask);

            Map<String, Object> executionTask = new LinkedHashMap<>();
            executionTask.put("key", phase.key() + "-task-deliver");
            executionTask.put("title", "Deliver " + phase.name());
            executionTask.put("description", "Execute and deliver the outputs for " + phase.name() + ".");
            executionTask.put("phaseKey", phase.key());
            executionTask.put("milestoneKey", completionMilestoneKey);
            executionTask.put("taskType", "task");
            executionTask.put("status", "todo");
            executionTask.put("priority", i >= phases.size() - 1 ? "high" : "medium");
            executionTask.put("estimatedHours", 10f + i);
            executionTask.put("startOffsetDays", executionStartOffset);
            executionTask.put("dueOffsetDays", executionDueOffset);
            executionTask.put("enabled", phase.enabled());
            tasks.add(executionTask);

            if (phase.enabled()) {
                runningOffset += phaseDuration;
            }
        }

        return new SeedTemplateStructure(toJson(phaseRows), toJson(milestones), toJson(tasks));
    }

    private List<SeedPhaseSpec> parseSeedPhases(String phasesJson, String templateName) {
        List<SeedPhaseSpec> phases = new ArrayList<>();
        Set<String> usedKeys = new HashSet<>();

        if (hasText(phasesJson)) {
            try {
                JsonNode root = objectMapper.readTree(phasesJson);
                if (root.isArray()) {
                    for (int i = 0; i < root.size(); i++) {
                        JsonNode item = root.get(i);
                        String name = null;
                        String keyCandidate = null;
                        int durationDays = 14;
                        boolean enabled = true;

                        if (item != null && item.isObject()) {
                            name = optionalText(item, "name", "title");
                            keyCandidate = optionalText(item, "key");
                            durationDays = optionalInt(item, 14, "durationDays", "duration");
                            enabled = item.path("enabled").asBoolean(true);
                        } else if (item != null && item.isTextual()) {
                            name = item.asText();
                        }

                        if (!hasText(name)) {
                            name = "Phase " + (i + 1);
                        }

                        String key = uniqueKey(hasText(keyCandidate) ? keyCandidate : name, usedKeys);
                        int boundedDuration = Math.max(0, Math.min(3650, durationDays));
                        phases.add(new SeedPhaseSpec(key, name.trim(), boundedDuration, enabled));
                    }
                }
            } catch (Exception ex) {
                log.debug("[M2DevSeedService] Could not parse phases JSON for template '{}': {}", templateName, ex.getMessage());
            }
        }

        if (phases.isEmpty()) {
            phases.add(new SeedPhaseSpec("phase-1", "Planning", 7, true));
            phases.add(new SeedPhaseSpec("phase-2", "Execution", 14, true));
            phases.add(new SeedPhaseSpec("phase-3", "Validation", 7, true));
        }

        return phases;
    }

    private String optionalText(JsonNode node, String... fields) {
        if (node == null) return null;
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value == null || value.isNull()) continue;
            String text = value.asText("").trim();
            if (!text.isEmpty()) return text;
        }
        return null;
    }

    private int optionalInt(JsonNode node, int fallback, String... fields) {
        if (node == null) return fallback;
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value == null || value.isNull()) continue;
            if (value.isInt() || value.isLong()) return value.asInt();
            if (value.isTextual()) {
                try {
                    return Integer.parseInt(value.asText().trim());
                } catch (NumberFormatException ignored) {
                    // keep fallback
                }
            }
        }
        return fallback;
    }

    private String uniqueKey(String candidate, Set<String> usedKeys) {
        String base = sanitizeKey(candidate);
        if (!hasText(base)) base = "phase";

        String key = base;
        int suffix = 2;
        while (usedKeys.contains(key)) {
            key = base + "-" + suffix;
            suffix++;
        }
        usedKeys.add(key);
        return key;
    }

    private String sanitizeKey(String value) {
        if (!hasText(value)) return "";
        String normalized = value.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
        return normalized;
    }

    private boolean hasNonEmptyJsonArray(String rawJson) {
        if (!hasText(rawJson)) return false;
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            return root.isArray() && root.size() > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isJsonArray(String rawJson) {
        if (!hasText(rawJson)) return false;
        try {
            return objectMapper.readTree(rawJson).isArray();
        } catch (Exception ex) {
            return false;
        }
    }

    private String firstNonBlank(String primary, String fallback) {
        return hasText(primary) ? primary : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("[M2DevSeedService] Missing required user: " + email));
    }
}
