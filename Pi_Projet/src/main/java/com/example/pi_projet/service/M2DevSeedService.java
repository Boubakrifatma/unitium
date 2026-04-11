package com.example.pi_projet.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.entity.ProjectTemplate.*;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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

    // ── Repositories ────────────────────────────────────────────────────────
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectTemplateRepository projectTemplateRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final TemplateFavoriteRepository templateFavoriteRepository;
    private final TemplateRatingRepository templateRatingRepository;

    // ── Services ─────────────────────────────────────────────────────────────
    private final M2OrganizationProvisioningService organizationProvisioningService;
    private final ProjectTemplateService projectTemplateService;

    // ─────────────────────────────────────────────────────────────────────────
    //  ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> seed() {
        log.info("[M2DevSeedService] Starting rich seed...");

        // ── 1. Load all required users ───────────────────────────────────────
        User manager   = requireUser("manager@test.com");
        User manager2  = requireUser("manager2@test.com");
        User tutor     = requireUser("tutor@test.com");
        User tutor2    = requireUser("tutor2@test.com");
        User dev1      = requireUser("dev1@test.com");
        User dev2      = requireUser("dev2@test.com");
        User dev3      = requireUser("dev3@test.com");
        User analyst   = requireUser("analyst@test.com");
        User employee  = requireUser("employee@test.com");
        User viewer    = requireUser("viewer@test.com");
        User student   = requireUser("student@test.com");
        User student1  = requireUser("student1@test.com");
        User student2  = requireUser("student2@test.com");
        User student3  = requireUser("student3@test.com");
        User ta        = requireUser("ta@test.com");
        User po        = requireUser("po@test.com");

        // ── 2. Plans ─────────────────────────────────────────────────────────
        Plan enterprisePro  = ensurePlan("enterprise_pro",  "Enterprise Pro",  10,  50,  9900, 99000,
                Plan.MlTier.FULL,  Plan.SupportTier.PRIORITY, Plan.CustomIntegrations.FULL,   102400L, true,  false, false);
        Plan startupFree    = ensurePlan("startup_free",    "Startup Free",     1,   3,     0,     0,
                Plan.MlTier.NONE,  Plan.SupportTier.COMMUNITY, Plan.CustomIntegrations.NONE,   1024L, false, false, false);
        Plan academicFull   = ensurePlan("academic_full",   "Academic Full",   20, 100,  4900, 49000,
                Plan.MlTier.BASIC, Plan.SupportTier.ACADEMIC,  Plan.CustomIntegrations.LIMITED, 51200L, true, true,  true);
        Plan academicBasic  = ensurePlan("academic_basic",  "Academic Basic",   1,   3,     0,     0,
                Plan.MlTier.NONE,  Plan.SupportTier.COMMUNITY, Plan.CustomIntegrations.NONE,   2048L, false, false, false);

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
        applyWorkspaceMemberMlProfiles(List.of(engHQ, mktHub, prodLab, startMain, csDept, dsLab, resCtr, miniWs));

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

        // ── 10. Template Favorites ───────────────────────────────────────────
        ensureFavorite(manager,  tplAgile);
        ensureFavorite(manager,  tplKanban);
        ensureFavorite(manager,  tplWaterfall);

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

        log.info("[M2DevSeedService] Seed complete: 4 orgs, 8 workspaces, 10 templates, 18 projects.");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nexusCorpId",  nexusCorp.getId());
        out.put("startupXId",   startupX.getId());
        out.put("openEduId",    openEdu.getId());
        out.put("miniCampusId", miniCampus.getId());
        out.put("message", "Module 2 rich seed completed — 4 orgs, 8 workspaces, 10 templates, 18 projects");
        return out;
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
        UUID wsId = UUID.nameUUIDFromBytes((org.getSlug() + ":" + slug).getBytes());
        return workspaceRepository.findById(wsId).orElseGet(() ->
            workspaceRepository.save(Workspace.builder()
                .id(wsId)
                .organization(org)
                .name(name)
                .slug(slug)
                .orgType(org.getOrgType().name().toLowerCase())
                .ownerId(ownerId)
                .build()));
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
            workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(ws)
                .userId(userId)
                .role(role)
                .invitedByUser(inviter)
                .joinedAt(Instant.now())
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
        return projectTemplateRepository.findAll().stream()
            .filter(t -> t.getOrganization() != null
                && org.getId().equals(t.getOrganization().getId())
                && name.equalsIgnoreCase(t.getName()))
            .findFirst()
            .orElseGet(() -> projectTemplateRepository.save(
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
                    .defaultPhasesJson(phasesJson)
                    .defaultRolesJson("[]")
                    .defaultProjectConfigJson("{\"framework\":\"" + type.name().toLowerCase() + "\"}")
                    .tags(tags)
                    .useCaseDescription(useCaseDescription)
                    .usageCount(usageCount)
                    .rating(rating)
                    .ratingCount(ratingCount)
                    .version(1)
                    .build()));
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
        // Check if exists — if so, simply return (fully idempotent)
        try {
            if (projectTemplateRepository.existsById(templateId)) {
                return;
            }
        } catch (Exception ex) {
            // Ignore database errors during existence check
            log.debug("Error checking template existence: {}", templateId, ex);
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
                .defaultPhasesJson("[{\"name\":\"Discovery\",\"durationDays\":7},{\"name\":\"Planning\",\"durationDays\":14},{\"name\":\"Execution\",\"durationDays\":21},{\"name\":\"Validation\",\"durationDays\":7}]")
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

    // ─────────────────────────────────────────────────────────────────────────
    //  PROJECT
    // ─────────────────────────────────────────────────────────────────────────

    private Project ensureProject(Workspace ws, Long creatorId, String name,
                                  Project.ProjectStatus status, Project.Visibility visibility,
                                  LocalDate startDate, LocalDate endDate,
                                  ProjectTemplate template) {
        return projectRepository.findAllByWorkspaceId(ws.getId(), Pageable.unpaged()).stream()
            .filter(p -> name.equalsIgnoreCase(p.getName()))
            .findFirst()
            .orElseGet(() -> {
                Project.ProjectBuilder builder = Project.builder()
                    .workspace(ws)
                    .createdBy(creatorId)
                    .name(name)
                    .status(status)
                    .visibility(visibility)
                    .startDate(startDate)
                    .endDate(endDate);
                if (template != null) {
                    builder.templateId(template.getId())
                           .phasesJson(template.getDefaultPhasesJson());
                }
                return projectRepository.save(builder.build());
            });
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
        // Use service to fork (sets parentTemplateId, status=DRAFT, etc.)
        ProjectTemplate fork = projectTemplateService.forkTemplate(sourceTemplate.getId(), requesterId);
        
        // Override the default " (Fork)" naming with custom name
        fork.setName(customName);
        fork.setVersion(1);
        // Make forks public and approved for easy discovery
        fork.setIsPublic(true);
        fork.setStatus(ProjectTemplate.TemplateStatus.APPROVED);
        fork.setDefaultVisibility(ProjectTemplate.DefaultVisibility.PUBLIC);
        
        // Save with custom name and public visibility
        return projectTemplateRepository.save(fork);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("[M2DevSeedService] Missing required user: " + email));
    }
}
