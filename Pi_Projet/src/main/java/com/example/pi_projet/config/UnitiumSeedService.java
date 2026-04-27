package com.example.pi_projet.config;

import com.example.pi_projet.entity.*;
import com.example.pi_projet.entity.TimeLineAndDeadLine.*;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.*;
import com.example.pi_projet.enums.RoomType;
import com.example.pi_projet.ml.repository.ChurnPredictionRepository;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;

/**
 * Production-quality showcase seed for the Unitium organization.
 * Demonstrates all core modules: Users, Orgs, Workspaces, Projects, Milestones, Tasks,
 * POs, Deliverables, Chat, and ML churn compatibility.
 *
 * Runs at @Order(3) after DataInitializer (1) and Module2OrganizationInitializer (2).
 * Fully idempotent — safe to run multiple times.
 */
@Component
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class UnitiumSeedService implements CommandLineRunner {

    // ── Repositories ────────────────────────────────────────────────────────
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final DeliverableRepository deliverableRepository;
    private final DeliverableVersionRepository deliverableVersionRepository;
    private final DeliverableReviewRepository deliverableReviewRepository;
    private final PoDecisionRepository poDecisionRepository;
    private final ChurnPredictionRepository churnPredictionRepository;
    private final UsageQuotaRepository usageQuotaRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineItemRepository invoiceLineItemRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;

    // ── Seed Constants ──────────────────────────────────────────────────────
    private static final String SEED_ORG_SLUG = "unitium";
    private static final String SEED_WORKSPACE_SLUG = "unitium-platform";
    private static final LocalDate WORKSPACE_CREATED_DATE = LocalDate.of(2026, 3, 10);
    private static final String PLAINTEXT_PASSWORD = "Password123!";

    // ── Data holders populated during seed ──────────────────────────────────
    private User userJames, userAlice, userMarc, userPooja, userManager, userManager2, userAnalyst, userEmployee, userViewer;
    private Organization unitiumOrg;
    private Workspace unitiumWorkspace;
    private Project unitiumProject;
    private Milestone milestone1, milestone2;
    private Task task11, task12, task13, task14;
    private Task task21, task22, task23, task24;
    private ChatRoom roomGeneral, roomMilestone2;

    @Override
    @Transactional
    public void run(String... args) {
        // ── Idempotency guard ───────────────────────────────────────────────
        if (organizationRepository.findBySlug(SEED_ORG_SLUG).isPresent()) {
            log.info("[UnitiumSeedService] Already seeded — skipping.");
            return;
        }

        log.info("[UnitiumSeedService] ═══════════════════════════════════════════════════════");
        log.info("[UnitiumSeedService] Starting Unitium showcase seed (Order 3)...");
        log.info("[UnitiumSeedService] ═══════════════════════════════════════════════════════");

        try {
            step01_createUsers();
            step02_createOrganization();
            step03_createSubscription();
            step04_createWorkspace();
            step05_createProject();
            step06_createMilestones();
            step07_createTasks();
            step08_createTaskDependencies();
            step09_createTimeEntries();
            step10_createChatRooms();
            step11_createMessages();
            step12_createDeliverables();
            step13_createChurnPrediction();
            step14_createPaymentData();
            step15_createUsageQuotas();

            printCredentialsTable();
            log.info("[UnitiumSeedService] ═══════════════════════════════════════════════════════");
            log.info("[UnitiumSeedService] Seed completed successfully!");
            log.info("[UnitiumSeedService] ═══════════════════════════════════════════════════════");
        } catch (Exception e) {
            log.error("[UnitiumSeedService] Seed failed", e);
            throw new RuntimeException("UnitiumSeedService failed", e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 1: Create 9 Users (Unitium + M2 Module users)
    // ─────────────────────────────────────────────────────────────────────────

    private void step01_createUsers() {
        log.info("[UnitiumSeedService] Step 1: Creating 9 users for Unitium and M2 module...");
        String hashedPwd = passwordEncoder.encode(PLAINTEXT_PASSWORD);

        userJames = userRepository.save(User.builder()
            .email("james.morgan@unitium.io")
            .fullName("James Morgan")
            .passwordHash(hashedPwd)
            .role(User.RoleName.ADMIN)
            .isActive(true)
            .isVerified(true)
            .build());

        userAlice = userRepository.save(User.builder()
            .email("alice.dupont@unitium.io")
            .fullName("Alice Dupont")
            .passwordHash(hashedPwd)
            .role(User.RoleName.EMPLOYEE)
            .isActive(true)
            .isVerified(true)
            .build());

        userMarc = userRepository.save(User.builder()
            .email("marc.leroy@unitium.io")
            .fullName("Marc Leroy")
            .passwordHash(hashedPwd)
            .role(User.RoleName.EMPLOYEE)
            .isActive(true)
            .isVerified(true)
            .build());

        userPooja = userRepository.save(User.builder()
            .email("pooja.sharma@unitium.io")
            .fullName("Pooja Sharma")
            .passwordHash(hashedPwd)
            .role(User.RoleName.PRODUCT_OWNER)
            .isActive(true)
            .isVerified(true)
            .build());

        userManager = userRepository.save(User.builder()
            .email("manager@unitium.io")
            .fullName("Michael Manager")
            .passwordHash(hashedPwd)
            .role(User.RoleName.MANAGER)
            .isActive(true)
            .isVerified(true)
            .build());

        userManager2 = userRepository.save(User.builder()
            .email("manager2@unitium.io")
            .fullName("Maxwell Rivera")
            .passwordHash(hashedPwd)
            .role(User.RoleName.MANAGER)
            .isActive(true)
            .isVerified(true)
            .build());

        userAnalyst = userRepository.save(User.builder()
            .email("analyst@unitium.io")
            .fullName("Aria Analyst")
            .passwordHash(hashedPwd)
            .role(User.RoleName.EMPLOYEE)
            .isActive(true)
            .isVerified(true)
            .build());

        userEmployee = userRepository.save(User.builder()
            .email("employee@unitium.io")
            .fullName("Emma Employee")
            .passwordHash(hashedPwd)
            .role(User.RoleName.EMPLOYEE)
            .isActive(true)
            .isVerified(true)
            .build());

        userViewer = userRepository.save(User.builder()
            .email("viewer@unitium.io")
            .fullName("Victoria Viewer")
            .passwordHash(hashedPwd)
            .role(User.RoleName.VIEWER)
            .isActive(true)
            .isVerified(true)
            .build());

        // Set last login times via JdbcTemplate
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 25, 14, 0)), userJames.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 27, 8, 30)), userAlice.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 26, 16, 0)), userMarc.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 25, 11, 0)), userPooja.getId());

        log.info("[UnitiumSeedService]   ✓ 9 users created: James, Alice, Marc, Pooja, Manager, Manager2, Analyst, Employee, Viewer");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 2: Create Organization "Unitium"
    // ─────────────────────────────────────────────────────────────────────────

    private void step02_createOrganization() {
        log.info("[UnitiumSeedService] Step 2: Creating organization 'Unitium'...");

        unitiumOrg = organizationRepository.save(Organization.builder()
            .name("Unitium")
            .slug(SEED_ORG_SLUG)
            .ownerId(userJames.getId())
            .orgType(Organization.OrgType.ENTERPRISE)
            .billingEmail("billing@unitium.io")
            .build());

        // Create org members
        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(unitiumOrg)
            .userId(userJames.getId())
            .role(OrganizationMember.OrganizationRole.OWNER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(unitiumOrg)
            .userId(userAlice.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(unitiumOrg)
            .userId(userMarc.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(unitiumOrg)
            .userId(userPooja.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(unitiumOrg)
            .userId(userManager.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        log.info("[UnitiumSeedService]   ✓ Organization created with 6 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 3: Create Subscription
    // ─────────────────────────────────────────────────────────────────────────

    private void step03_createSubscription() {
        log.info("[UnitiumSeedService] Step 3: Creating subscription...");

        Plan enterprisePlan = planRepository.findByName("enterprise")
            .orElseThrow(() -> new IllegalStateException("Plan 'enterprise' not found"));

        Subscription subscription = subscriptionRepository.save(Subscription.builder()
            .organization(unitiumOrg)
            .plan(enterprisePlan)
            .status(Subscription.SubscriptionStatus.ACTIVE)
            .billingCycle(Subscription.BillingCycle.ANNUAL)
            .currentPeriodStart(LocalDateTime.of(2026, 3, 1, 0, 0))
            .currentPeriodEnd(LocalDateTime.of(2027, 3, 1, 0, 0))
            .stripeSubscriptionId("sub_unitium_showcase_2026")
            .build());

        log.info("[UnitiumSeedService]   ✓ Subscription created (ACTIVE, ANNUAL)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 4: Create Workspace
    // ─────────────────────────────────────────────────────────────────────────

    private void step04_createWorkspace() {
        log.info("[UnitiumSeedService] Step 4: Creating workspace...");

        UUID workspaceId = UUID.nameUUIDFromBytes(
            (SEED_ORG_SLUG + ":" + SEED_WORKSPACE_SLUG).getBytes(StandardCharsets.UTF_8));

        unitiumWorkspace = workspaceRepository.save(Workspace.builder()
            .id(workspaceId)
            .name("Unitium Platform Workspace")
            .slug(SEED_WORKSPACE_SLUG)
            .ownerId(userJames.getId())
            .organization(unitiumOrg)
            .orgType("enterprise")
            .build());

        // Patch created_at to 2026-03-10 00:00:00 UTC (required for Time Machine)
        jdbcTemplate.update("UPDATE workspaces SET created_at = ? WHERE id = ?",
            Timestamp.from(WORKSPACE_CREATED_DATE.atStartOfDay(ZoneId.of("UTC")).toInstant()),
            workspaceId.toString());

        // Create workspace members
        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(unitiumWorkspace)
            .userId(userJames.getId())
            .role(WorkspaceMember.WorkspaceRole.OWNER)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(unitiumWorkspace)
            .userId(userAlice.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(unitiumWorkspace)
            .userId(userMarc.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(unitiumWorkspace)
            .userId(userPooja.getId())
            .role(WorkspaceMember.WorkspaceRole.MEMBER)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(unitiumWorkspace)
            .userId(userManager.getId())
            .role(WorkspaceMember.WorkspaceRole.MEMBER)
            .build());

        log.info("[UnitiumSeedService]   ✓ Workspace created (createdAt: 2026-03-10) + 6 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 5: Create Project
    // ─────────────────────────────────────────────────────────────────────────

    private void step05_createProject() {
        log.info("[UnitiumSeedService] Step 5: Creating project...");

        unitiumProject = projectRepository.save(Project.builder()
            .workspace(unitiumWorkspace)
            .createdBy(userJames.getId())
            .name("Platform Modernization Initiative")
            .description("End-to-end modernization of Unitium's core platform infrastructure. " +
                "Includes API redesign, microservices migration, and enhanced analytics.")
            .startDate(LocalDate.of(2026, 3, 10))
            .endDate(LocalDate.of(2026, 5, 30))
            .status(Project.ProjectStatus.ACTIVE)
            .visibility(Project.Visibility.PRIVATE)
            .build());

        // Create project members
        projectMemberRepository.save(ProjectMember.builder()
            .project(unitiumProject)
            .userId(userJames.getId())
            .role(ProjectMember.ProjectRole.PROJECT_MANAGER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(unitiumProject)
            .userId(userAlice.getId())
            .role(ProjectMember.ProjectRole.DEVELOPER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(unitiumProject)
            .userId(userMarc.getId())
            .role(ProjectMember.ProjectRole.DEVELOPER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(unitiumProject)
            .userId(userPooja.getId())
            .role(ProjectMember.ProjectRole.OBSERVER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(unitiumProject)
            .userId(userManager.getId())
            .role(ProjectMember.ProjectRole.REVIEWER)
            .build());

        log.info("[UnitiumSeedService]   ✓ Project created + 6 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 6: Create Milestones
    // ─────────────────────────────────────────────────────────────────────────

    private void step06_createMilestones() {
        log.info("[UnitiumSeedService] Step 6: Creating milestones...");

        milestone1 = milestoneRepository.save(Milestone.builder()
            .project(unitiumProject)
            .name("Foundation & Planning")
            .description("Requirements gathering, architecture design, and setup")
            .startDate(LocalDate.of(2026, 3, 10))
            .dueDate(LocalDate.of(2026, 4, 5))
            .status(Milestone.MilestoneStatus.completed)
            .completionPct(100.0f)
            .build());

        milestone2 = milestoneRepository.save(Milestone.builder()
            .project(unitiumProject)
            .name("Execution & Delivery")
            .description("API development, frontend integration, security, and UAT")
            .startDate(LocalDate.of(2026, 4, 6))
            .dueDate(LocalDate.of(2026, 5, 30))
            .status(Milestone.MilestoneStatus.in_progress)
            .completionPct(55.0f)
            .build());

        log.info("[UnitiumSeedService]   ✓ 2 milestones created");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 7: Create Tasks (8 total)
    // ─────────────────────────────────────────────────────────────────────────

    private void step07_createTasks() {
        log.info("[UnitiumSeedService] Step 7: Creating 8 tasks...");

        // ── Milestone 1 Tasks (all DONE) ──
        task11 = taskRepository.save(Task.builder()
            .milestone(milestone1)
            .project(unitiumProject)
            .title("1.1 Requirements Analysis & Stakeholder Mapping")
            .description("Comprehensive requirements gathering and stakeholder interviews")
            .taskType(Task.TaskType.task)
            .assignedTo(userAlice)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(24f)
            .actualHours(22f)
            .startDate(LocalDate.of(2026, 3, 10))
            .dueDate(LocalDate.of(2026, 3, 18))
            .completedAt(LocalDateTime.of(2026, 3, 18, 16, 0))
            .createdBy(userJames)
            .build());

        task12 = taskRepository.save(Task.builder()
            .milestone(milestone1)
            .project(unitiumProject)
            .title("1.2 Architecture Design & Technology Stack Selection")
            .description("Design system architecture and select microservices framework")
            .taskType(Task.TaskType.task)
            .assignedTo(userMarc)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(32f)
            .actualHours(35f)
            .startDate(LocalDate.of(2026, 3, 19))
            .dueDate(LocalDate.of(2026, 3, 25))
            .completedAt(LocalDateTime.of(2026, 3, 26, 14, 0))
            .createdBy(userJames)
            .build());

        task13 = taskRepository.save(Task.builder()
            .milestone(milestone1)
            .project(unitiumProject)
            .title("1.3 Environment Setup & CI/CD Pipeline Configuration")
            .description("Configure dev/staging/prod environments and CI/CD automation")
            .taskType(Task.TaskType.task)
            .assignedTo(userAlice)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.medium)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(20f)
            .actualHours(18f)
            .startDate(LocalDate.of(2026, 3, 26))
            .dueDate(LocalDate.of(2026, 4, 1))
            .completedAt(LocalDateTime.of(2026, 4, 1, 11, 0))
            .createdBy(userJames)
            .build());

        task14 = taskRepository.save(Task.builder()
            .milestone(milestone1)
            .project(unitiumProject)
            .title("1.4 Sprint Planning & WBS Finalization")
            .description("Finalize work breakdown structure and plan first development sprints")
            .taskType(Task.TaskType.task)
            .assignedTo(userMarc)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.medium)
            .difficulty(Task.TaskDifficulty.easy)
            .estimatedHours(12f)
            .actualHours(10f)
            .startDate(LocalDate.of(2026, 4, 2))
            .dueDate(LocalDate.of(2026, 4, 5))
            .completedAt(LocalDateTime.of(2026, 4, 4, 17, 0))
            .createdBy(userJames)
            .build());

        // ── Milestone 2 Tasks (2 DONE, 1 IN_PROGRESS, 1 TODO) ──
        task21 = taskRepository.save(Task.builder()
            .milestone(milestone2)
            .project(unitiumProject)
            .title("2.1 Core API Development & Data Layer Implementation")
            .description("Implement REST API endpoints and data persistence layer")
            .taskType(Task.TaskType.task)
            .assignedTo(userAlice)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.critical)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(48f)
            .actualHours(45f)
            .startDate(LocalDate.of(2026, 4, 6))
            .dueDate(LocalDate.of(2026, 4, 18))
            .completedAt(LocalDateTime.of(2026, 4, 17, 18, 0))
            .createdBy(userJames)
            .build());

        task22 = taskRepository.save(Task.builder()
            .milestone(milestone2)
            .project(unitiumProject)
            .title("2.2 Frontend Module Integration & UI Components")
            .description("Integrate frontend modules and build responsive UI components")
            .taskType(Task.TaskType.task)
            .assignedTo(userMarc)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(40f)
            .actualHours(38f)
            .startDate(LocalDate.of(2026, 4, 19))
            .dueDate(LocalDate.of(2026, 4, 28))
            .completedAt(LocalDateTime.of(2026, 4, 26, 15, 0))
            .createdBy(userJames)
            .build());

        task23 = taskRepository.save(Task.builder()
            .milestone(milestone2)
            .project(unitiumProject)
            .title("2.3 Security Hardening & Performance Optimization")
            .description("Apply security patches, harden API, and optimize database queries")
            .taskType(Task.TaskType.task)
            .assignedTo(userAlice)
            .status(Task.TaskStatus.in_progress)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(36f)
            .actualHours(12f)
            .startDate(LocalDate.of(2026, 4, 29))
            .dueDate(LocalDate.of(2026, 5, 10))
            .completedAt(null)
            .createdBy(userJames)
            .build());

        task24 = taskRepository.save(Task.builder()
            .milestone(milestone2)
            .project(unitiumProject)
            .title("2.4 User Acceptance Testing & Documentation")
            .description("Conduct UAT with stakeholders and finalize technical documentation")
            .taskType(Task.TaskType.task)
            .assignedTo(userMarc)
            .status(Task.TaskStatus.todo)
            .priority(Task.TaskPriority.medium)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(28f)
            .actualHours(0f)
            .startDate(LocalDate.of(2026, 5, 11))
            .dueDate(LocalDate.of(2026, 5, 30))
            .completedAt(null)
            .createdBy(userJames)
            .build());

        log.info("[UnitiumSeedService]   ✓ 8 tasks created (4 M1 DONE, 2 M2 DONE, 1 IN_PROGRESS, 1 TODO)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 8: Create Task Dependencies (finish_to_start)
    // ─────────────────────────────────────────────────────────────────────────

    private void step08_createTaskDependencies() {
        log.info("[UnitiumSeedService] Step 8: Creating task dependencies...");

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task12)
            .dependsOnTask(task11)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task13)
            .dependsOnTask(task12)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task14)
            .dependsOnTask(task13)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task22)
            .dependsOnTask(task21)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task23)
            .dependsOnTask(task22)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task24)
            .dependsOnTask(task23)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(userJames)
            .build());

        log.info("[UnitiumSeedService]   ✓ 6 dependencies created (3 in M1, 3 in M2)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 9: Create Time Entries (JdbcTemplate, for burndown chart)
    // ─────────────────────────────────────────────────────────────────────────

    private void step09_createTimeEntries() {
        log.info("[UnitiumSeedService] Step 9: Creating time entries (burndown S-curve)...");

        // Task 1.1 (Alice, 22h total)
        insertTimeEntry(task11.getId(), userAlice.getId(), 480, "Initial requirements gathering",
            "2026-03-11 09:00");
        insertTimeEntry(task11.getId(), userAlice.getId(), 480, "Stakeholder interviews completed",
            "2026-03-14 14:00");
        insertTimeEntry(task11.getId(), userAlice.getId(), 360, "Requirements document finalized",
            "2026-03-18 15:00");

        // Task 1.2 (Marc, 35h total)
        insertTimeEntry(task12.getId(), userMarc.getId(), 480, "Architecture review and design phase 1",
            "2026-03-20 10:00");
        insertTimeEntry(task12.getId(), userMarc.getId(), 540, "Architecture design phase 2 + tech selection",
            "2026-03-23 09:00");
        insertTimeEntry(task12.getId(), userMarc.getId(), 420, "Architecture documentation complete",
            "2026-03-26 14:00");

        // Task 1.3 (Alice, 18h total)
        insertTimeEntry(task13.getId(), userAlice.getId(), 480, "Dev environment configuration",
            "2026-03-27 10:00");
        insertTimeEntry(task13.getId(), userAlice.getId(), 420, "CI/CD pipeline setup and testing",
            "2026-03-30 14:00");
        insertTimeEntry(task13.getId(), userAlice.getId(), 300, "Final deployment configuration",
            "2026-04-01 11:00");

        // Task 1.4 (Marc, 10h total)
        insertTimeEntry(task14.getId(), userMarc.getId(), 360, "WBS creation and sprint planning",
            "2026-04-02 09:00");
        insertTimeEntry(task14.getId(), userMarc.getId(), 240, "Sprint planning finalization",
            "2026-04-04 17:00");

        // Task 2.1 (Alice, 45h total)
        insertTimeEntry(task21.getId(), userAlice.getId(), 540, "API endpoint development phase 1",
            "2026-04-07 09:00");
        insertTimeEntry(task21.getId(), userAlice.getId(), 600, "API endpoint development phase 2",
            "2026-04-10 10:00");
        insertTimeEntry(task21.getId(), userAlice.getId(), 480, "Testing and documentation",
            "2026-04-17 18:00");

        // Task 2.2 (Marc, 38h total)
        insertTimeEntry(task22.getId(), userMarc.getId(), 540, "Frontend module integration phase 1",
            "2026-04-20 09:00");
        insertTimeEntry(task22.getId(), userMarc.getId(), 480, "UI component development",
            "2026-04-23 14:00");
        insertTimeEntry(task22.getId(), userMarc.getId(), 420, "Integration testing and fixes",
            "2026-04-26 15:00");

        // Task 2.3 (Alice, 12h so far)
        insertTimeEntry(task23.getId(), userAlice.getId(), 360, "Security vulnerability assessment",
            "2026-04-29 09:00");
        insertTimeEntry(task23.getId(), userAlice.getId(), 360, "CVE patching in progress",
            "2026-04-27 08:30");

        log.info("[UnitiumSeedService]   ✓ 18 time entries created for realistic burndown");
    }

    private void insertTimeEntry(Long taskId, Long userId, int durationMinutes, String description, String loggedAt) {
        jdbcTemplate.update(
            "INSERT INTO time_entries (task_id, user_id, duration_minutes, description, is_billable, logged_at, created_at) " +
            "VALUES (?, ?, ?, ?, true, ?, NOW())",
            taskId, userId, durationMinutes, description, loggedAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 10: Create ChatRooms
    // ─────────────────────────────────────────────────────────────────────────

    private void step10_createChatRooms() {
        log.info("[UnitiumSeedService] Step 10: Creating chat rooms...");

        roomGeneral = chatRoomRepository.save(ChatRoom.builder()
            .project(unitiumProject)
            .createdBy(userJames)
            .name("General")
            .roomType(RoomType.general)
            .description("General project discussion and announcements")
            .build());

        roomMilestone2 = chatRoomRepository.save(ChatRoom.builder()
            .project(unitiumProject)
            .createdBy(userJames)
            .name("Milestone 2 – Execution & Delivery")
            .roomType(RoomType.task_thread)
            .description("Execution phase: API development, integration, and testing")
            .build());

        // Add all users to both rooms
        for (User user : Arrays.asList(userJames, userAlice, userMarc, userPooja, userManager, userManager2, userAnalyst, userEmployee, userViewer)) {
            roomMemberRepository.save(RoomMember.builder()
                .room(roomGeneral)
                .user(user)
                .build());
            roomMemberRepository.save(RoomMember.builder()
                .room(roomMilestone2)
                .user(user)
                .build());
        }

        log.info("[UnitiumSeedService]   ✓ 2 chat rooms created + 18 memberships (all users included for sentiment analysis)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 11: Create Messages (JdbcTemplate for historical timestamps)
    // ─────────────────────────────────────────────────────────────────────────

    private void step11_createMessages() {
        log.info("[UnitiumSeedService] Step 11: Creating messages...");

        // Room 1: General (8 messages)
        insertMessage(roomGeneral.getId(), userJames.getId(),
            "Project kickoff! Welcome to Platform Modernization Initiative. All aboard for a successful delivery.",
            "2026-03-10 08:00");
        insertMessage(roomGeneral.getId(), userJames.getId(),
            "Requirements doc reviewed and signed off. Great work Alice. Architecture design can start.",
            "2026-03-15 10:30");
        insertMessage(roomGeneral.getId(), userMarc.getId(),
            "Architecture proposal published. Microservices approach with event-driven messaging confirmed.",
            "2026-03-20 14:00");
        insertMessage(roomGeneral.getId(), userAlice.getId(),
            "CI/CD pipeline is live. First deploy went green on all 12 checks.",
            "2026-03-26 16:00");
        insertMessage(roomGeneral.getId(), userJames.getId(),
            "Sprint planning finalized. WBS approved by all stakeholders.",
            "2026-04-04 17:30");
        insertMessage(roomGeneral.getId(), userJames.getId(),
            "Milestone 1 COMPLETE — 100% on time and on budget. Excellent execution!",
            "2026-04-05 09:00");
        insertMessage(roomGeneral.getId(), userAlice.getId(),
            "Core API wrapped up. 198 endpoints, 94% test coverage.",
            "2026-04-17 19:00");
        insertMessage(roomGeneral.getId(), userAlice.getId(),
            "Security sprint in progress. Found 3 medium CVEs, patching now.",
            "2026-04-27 09:00");

        // Team sentiment messages for ML analysis (mixed sentiments)
        insertMessage(roomGeneral.getId(), userManager.getId(),
            "Great progress team! The deliverables are looking solid. Keep up the excellent work everyone! 💪",
            "2026-04-27 10:15");
        insertMessage(roomGeneral.getId(), userEmployee.getId(),
            "Thanks for the encouragement! I'm really enjoying working on this project. The collaboration has been fantastic so far.",
            "2026-04-27 10:45");
        insertMessage(roomGeneral.getId(), userAnalyst.getId(),
            "I'm a bit concerned about the timeline. We're cutting it close with some of the deliverables. Need to accelerate.",
            "2026-04-27 11:00");
        insertMessage(roomGeneral.getId(), userViewer.getId(),
            "Agreed with the analyst. The quality vs speed trade-off is getting tighter. We might need to deprioritize some features.",
            "2026-04-27 11:20");
        insertMessage(roomGeneral.getId(), userJames.getId(),
            "Let's discuss this in the standup. We have contingency plans but we need team input. Schedule a sync for 3pm?",
            "2026-04-27 11:35");
        insertMessage(roomGeneral.getId(), userAlice.getId(),
            "3pm works for me. I think we can optimize the API layer to gain some time back. Confident we can deliver on schedule.",
            "2026-04-27 11:50");
        insertMessage(roomGeneral.getId(), userMarc.getId(),
            "Frontend is ready to integrate. Excited to see everything come together! This has been a challenging but rewarding milestone.",
            "2026-04-27 12:00");
        insertMessage(roomGeneral.getId(), userManager.getId(),
            "Excellent attitude from everyone. Challenges are what make us grow. Trust the team, trust the process. We've got this! 🎯",
            "2026-04-27 12:15");

        // Room 2: Milestone 2 (8 messages)
        insertMessage(roomMilestone2.getId(), userJames.getId(),
            "Milestone 2 kick-off. API development starts today — Alice leads the backend sprint.",
            "2026-04-06 09:00");
        insertMessage(roomMilestone2.getId(), userAlice.getId(),
            "Core endpoints for users, orgs, and workspaces complete. Performance benchmarks passing.",
            "2026-04-10 11:00");
        insertMessage(roomMilestone2.getId(), userMarc.getId(),
            "Deliverable for task 2.2 submitted. Frontend module integration report v1 ready for review.",
            "2026-04-18 14:00");
        insertMessage(roomMilestone2.getId(), userPooja.getId(),
            "Reviewed 2.2 deliverable. REJECTED: missing technical documentation, wrong file format. Details in review comments.",
            "2026-04-20 16:00");
        insertMessage(roomMilestone2.getId(), userMarc.getId(),
            "Understood. Will fix the docs format and provide full technical specs.",
            "2026-04-21 10:00");
        insertMessage(roomMilestone2.getId(), userAlice.getId(),
            "Deliverable for task 2.1 submitted. Core API final delivery with full docs, test suite, and deployment guide.",
            "2026-04-24 15:00");
        insertMessage(roomMilestone2.getId(), userPooja.getId(),
            "Task 2.1 deliverable reviewed and VALIDATED. All criteria met — excellent documentation, Alice!",
            "2026-04-25 10:00");
        insertMessage(roomMilestone2.getId(), userJames.getId(),
            "Security sprint on track. ETA May 8 for hardening completion.",
            "2026-04-27 08:30");

        log.info("[UnitiumSeedService]   ✓ 16 messages created (8 per room, historical timestamps)");
    }

    private void insertMessage(Long roomId, Long senderId, String text, String createdAt) {
        jdbcTemplate.update(
            "INSERT INTO messages (room_id, sender_id, content_text, content_type, is_system_message, is_pinned, is_deleted, created_at) " +
            "VALUES (?, ?, ?, 'text', false, false, false, ?)",
            roomId, senderId, text, createdAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 12: Create Deliverables, Versions, Reviews, PO Decisions
    // ─────────────────────────────────────────────────────────────────────────

    private void step12_createDeliverables() {
        log.info("[UnitiumSeedService] Step 12: Creating deliverables (1 rejected, 1 validated)...");

        // ── DELIVERABLE 1: REJECTED ──
        Deliverable deliv1 = deliverableRepository.save(Deliverable.builder()
            .task(task22)
            .project(unitiumProject)
            .submittedBy(userMarc)
            .title("Frontend Module Integration Report v1")
            .description("Initial delivery of frontend integration module. Work-in-progress state.")
            .currentVersion(1)
            .fileUrl("/uploads/unitium/deliverable-2-2-v1.pdf")
            .fileType("application/pdf")
            .fileSizeKb(450L)
            .status(Deliverable.DeliverableStatus.rejected_final)
            .poDecisionField(Deliverable.PoDecisionField.rejected)
            .build());

        DeliverableVersion dv1 = deliverableVersionRepository.save(DeliverableVersion.builder()
            .deliverable(deliv1)
            .versionNumber(1)
            .fileUrl("/uploads/unitium/deliverable-2-2-v1.pdf")
            .fileSizeKb(450L)
            .changeSummary("Initial submission")
            .submittedBy(userMarc)
            .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(deliv1)
            .version(dv1)
            .reviewer(userJames)
            .reviewerRole(DeliverableReview.ReviewerRole.MANAGER)
            .score(3.5f)
            .feedbackText("Work partially complete but lacks technical documentation.")
            .decision(DeliverableReview.ReviewDecision.ACCEPTED)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(deliv1)
            .version(dv1)
            .reviewer(userPooja)
            .reviewerRole(DeliverableReview.ReviewerRole.PO)
            .score(1.5f)
            .feedbackText("Deliverable does not meet the acceptance criteria outlined in task 2.2. " +
                "Missing technical documentation and the submitted format is incompatible with our delivery standards. " +
                "Please resubmit with complete API reference docs in PDF format.")
            .decision(DeliverableReview.ReviewDecision.REJECTED)
            .build());

        poDecisionRepository.save(PoDecision.builder()
            .deliverable(deliv1)
            .po(userPooja)
            .manager(userJames)
            .decision(PoDecision.PoDecisionType.rejected)
            .finalComments("Deliverable does not meet the acceptance criteria outlined in task 2.2. " +
                "Missing technical documentation and the submitted format is incompatible.")
            .build());

        // ── DELIVERABLE 2: VALIDATED ──
        Deliverable deliv2 = deliverableRepository.save(Deliverable.builder()
            .task(task21)
            .project(unitiumProject)
            .submittedBy(userAlice)
            .title("Core API Development — Final Deliverable")
            .description("Complete implementation of core API layer. Includes full OpenAPI spec, " +
                "unit/integration test suite (94% coverage), deployment guide, and performance benchmark report.")
            .currentVersion(1)
            .fileUrl("/uploads/unitium/deliverable-2-1-v1.pdf")
            .fileType("application/pdf")
            .fileSizeKb(2100L)
            .status(Deliverable.DeliverableStatus.validated)
            .poDecisionField(Deliverable.PoDecisionField.validated)
            .build());

        DeliverableVersion dv2 = deliverableVersionRepository.save(DeliverableVersion.builder()
            .deliverable(deliv2)
            .versionNumber(1)
            .fileUrl("/uploads/unitium/deliverable-2-1-v1.pdf")
            .fileSizeKb(2100L)
            .changeSummary("Final delivery")
            .submittedBy(userAlice)
            .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(deliv2)
            .version(dv2)
            .reviewer(userJames)
            .reviewerRole(DeliverableReview.ReviewerRole.MANAGER)
            .score(4.8f)
            .feedbackText("Exceptional work. All acceptance criteria met, documentation is thorough and clear.")
            .decision(DeliverableReview.ReviewDecision.ACCEPTED)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(deliv2)
            .version(dv2)
            .reviewer(userPooja)
            .reviewerRole(DeliverableReview.ReviewerRole.PO)
            .score(4.8f)
            .feedbackText("Deliverable fully meets all requirements. Approved for production.")
            .decision(DeliverableReview.ReviewDecision.ACCEPTED)
            .build());

        poDecisionRepository.save(PoDecision.builder()
            .deliverable(deliv2)
            .po(userPooja)
            .manager(userJames)
            .decision(PoDecision.PoDecisionType.validated)
            .finalComments("All criteria met. Deliverable approved.")
            .build());

        log.info("[UnitiumSeedService]   ✓ 2 deliverables created (1 rejected, 1 validated)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 13: Create ChurnPrediction (ML compatibility)
    // ─────────────────────────────────────────────────────────────────────────

    private void step13_createChurnPrediction() {
        log.info("[UnitiumSeedService] Step 13: Creating churn predictions with multiple risk scenarios...");

        Subscription subscription = subscriptionRepository.findAll().stream()
            .filter(s -> s.getOrganization().getId().equals(unitiumOrg.getId()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Subscription not found"));

        // HIGH_RISK - Discount offer triggered (TODAY)
        churnPredictionRepository.save(ChurnPrediction.builder()
            .organization(unitiumOrg)
            .subscription(subscription)
            .predictionDate(LocalDate.of(2026, 4, 27))
            .churnProbability(BigDecimal.valueOf(0.82))
            .riskSegment(ChurnPrediction.RiskSegment.HIGH_RISK)
            .wauRatio(BigDecimal.valueOf(0.15))
            .mlUsageRate(BigDecimal.valueOf(0.05))
            .supportTicketCount((short) 5)
            .lastLoginDeltaDays(21)
            .planUtilizationPct(BigDecimal.valueOf(95.0))
            .paymentFailuresCount((short) 2)
            .tenureMonths((short) 3)
            .actionTriggered(ChurnPrediction.ActionTriggered.DISCOUNT_OFFER)
            .actionTriggeredAt(LocalDateTime.of(2026, 4, 27, 9, 0))
            .modelVersion("xgb-1.0.0")
            .build());

        // MEDIUM_RISK - Email action triggered (TODAY)
        churnPredictionRepository.save(ChurnPrediction.builder()
            .organization(unitiumOrg)
            .subscription(subscription)
            .predictionDate(LocalDate.of(2026, 4, 27))
            .churnProbability(BigDecimal.valueOf(0.35))
            .riskSegment(ChurnPrediction.RiskSegment.MEDIUM_RISK)
            .wauRatio(BigDecimal.valueOf(0.45))
            .mlUsageRate(BigDecimal.valueOf(0.25))
            .supportTicketCount((short) 2)
            .lastLoginDeltaDays(10)
            .planUtilizationPct(BigDecimal.valueOf(72.0))
            .paymentFailuresCount((short) 0)
            .tenureMonths((short) 6)
            .actionTriggered(ChurnPrediction.ActionTriggered.EMAIL)
            .actionTriggeredAt(LocalDateTime.of(2026, 4, 27, 10, 30))
            .modelVersion("xgb-1.0.0")
            .build());

        // STABLE - No action needed (TODAY)
        churnPredictionRepository.save(ChurnPrediction.builder()
            .organization(unitiumOrg)
            .subscription(subscription)
            .predictionDate(LocalDate.of(2026, 4, 27))
            .churnProbability(BigDecimal.valueOf(0.12))
            .riskSegment(ChurnPrediction.RiskSegment.STABLE)
            .wauRatio(BigDecimal.valueOf(0.85))
            .mlUsageRate(BigDecimal.valueOf(0.70))
            .supportTicketCount((short) 0)
            .lastLoginDeltaDays(1)
            .planUtilizationPct(BigDecimal.valueOf(45.0))
            .paymentFailuresCount((short) 0)
            .tenureMonths((short) 2)
            .actionTriggered(ChurnPrediction.ActionTriggered.NONE)
            .modelVersion("xgb-1.0.0")
            .build());

        log.info("[UnitiumSeedService]   ✓ 3 churn predictions created (1 STABLE, 1 MEDIUM, 1 HIGH)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 14: Create Payment Data (Invoices and Payment Attempts)
    // ─────────────────────────────────────────────────────────────────────────

    private void step14_createPaymentData() {
        log.info("[UnitiumSeedService] Step 14: Creating payment data with successful and failed attempts...");

        Subscription subscription = subscriptionRepository.findAll().stream()
            .filter(s -> s.getOrganization().getId().equals(unitiumOrg.getId()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Subscription not found"));

        // Create invoices for March, April, and May
        LocalDate[] invoiceDates = {
            LocalDate.of(2026, 3, 1),
            LocalDate.of(2026, 4, 1),
            LocalDate.of(2026, 5, 1)
        };

        int invoiceNum = 1;
        for (LocalDate invoiceDate : invoiceDates) {
            // Create invoice
            Invoice invoice = Invoice.builder()
                .organization(unitiumOrg)
                .subscription(subscription)
                .invoiceNumber("INV-UNITIUM-" + invoiceDate.getMonthValue() + "-" + invoiceDate.getYear())
                .billingPeriodStart(invoiceDate)
                .billingPeriodEnd(invoiceDate.plusMonths(1).minusDays(1))
                .dueDate(invoiceDate.plusDays(30))
                .currency("USD")
                .subtotalCents(99900) // $999.00
                .taxRate(0.0)
                .taxAmountCents(0)
                .totalCents(99900)
                .status(Invoice.InvoiceStatus.PAID)
                .build();
            invoice = invoiceRepository.save(invoice);

            // Create line item
            invoiceLineItemRepository.save(InvoiceLineItem.builder()
                .invoice(invoice)
                .description("Platform Subscription - Enterprise Plan")
                .quantity(1)
                .unitPriceCents(99900)
                .totalPriceCents(99900)
                .taxRate(0.0)
                .build());

            // Create payment attempts
            if (invoiceNum <= 2) {
                // First two invoices: successful payment on first attempt
                paymentAttemptRepository.save(PaymentAttempt.builder()
                    .organization(unitiumOrg)
                    .subscription(subscription)
                    .invoice(invoice)
                    .attemptNumber((short) 1)
                    .status(PaymentAttempt.AttemptStatus.SUCCEEDED)
                    .amountCents(99900)
                    .stripePaymentIntentId("pi_unitium_" + invoiceNum)
                    .build());
            } else {
                // Third invoice: initial failure, then successful retry
                paymentAttemptRepository.save(PaymentAttempt.builder()
                    .organization(unitiumOrg)
                    .subscription(subscription)
                    .invoice(invoice)
                    .attemptNumber((short) 1)
                    .status(PaymentAttempt.AttemptStatus.FAILED)
                    .amountCents(99900)
                    .stripePaymentIntentId("pi_unitium_" + invoiceNum + "_fail")
                    .failureCode("card_declined")
                    .failureMessage("Your card was declined. Please contact your card issuer.")
                    .nextRetryAt(invoiceDate.plusDays(3).atStartOfDay())
                    .build());

                paymentAttemptRepository.save(PaymentAttempt.builder()
                    .organization(unitiumOrg)
                    .subscription(subscription)
                    .invoice(invoice)
                    .attemptNumber((short) 2)
                    .status(PaymentAttempt.AttemptStatus.SUCCEEDED)
                    .amountCents(99900)
                    .stripePaymentIntentId("pi_unitium_" + invoiceNum + "_success")
                    .build());
            }

            invoiceNum++;
        }

        log.info("[UnitiumSeedService]   ✓ 3 invoices created with 4 payment attempts (3 successful, 1 failed + retry)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 15: Create Usage Quotas (7 snapshots for Time Machine)
    // ─────────────────────────────────────────────────────────────────────────

    private void step15_createUsageQuotas() {
        log.info("[UnitiumSeedService] Step 15: Creating usage quota snapshots...");

        Subscription subscription = subscriptionRepository.findAll().stream()
            .filter(s -> s.getOrganization().getId().equals(unitiumOrg.getId()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Subscription not found"));

        LocalDate[] snapshotDates = {
            LocalDate.of(2026, 3, 10),
            LocalDate.of(2026, 3, 17),
            LocalDate.of(2026, 3, 25),
            LocalDate.of(2026, 4, 5),
            LocalDate.of(2026, 4, 15),
            LocalDate.of(2026, 4, 22),
            LocalDate.of(2026, 4, 27)
        };

        int[] activeMembersProgress = {2, 3, 4, 5, 5, 5, 5};
        long[] mlInferencesProgress = {0, 0, 2, 5, 8, 12, 15};

        for (int i = 0; i < snapshotDates.length; i++) {
            usageQuotaRepository.save(UsageQuota.builder()
                .organization(unitiumOrg)
                .plan(subscription.getPlan())
                .metricDate(snapshotDates[i])
                .activeMembersCount(activeMembersProgress[i])
                .workspacesCount(1)
                .projectsCount(1)
                .storageUsedGb(0.35)
                .apiCallsCount(0L)
                .mlInferencesCount(mlInferencesProgress[i])
                .gradeExportsCount(0)
                .build());
        }

        log.info("[UnitiumSeedService]   ✓ 7 usage quota snapshots created (Time Machine ready)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Print Credentials Table
    // ─────────────────────────────────────────────────────────────────────────

    private void printCredentialsTable() {
        log.info("\n");
        log.info("[UnitiumSeedService] ╔═══════════════════════════════════╦═════════════════════════════════╦══════════════╗");
        log.info("[UnitiumSeedService] ║ Role                              ║ Email                           ║ Password     ║");
        log.info("[UnitiumSeedService] ╠═══════════════════════════════════╬═════════════════════════════════╬══════════════╣");
        log.info("[UnitiumSeedService] ║ Organization Owner (Admin)        ║ james.morgan@unitium.io         ║ Password123! ║");
        log.info("[UnitiumSeedService] ║ Employee 1                        ║ alice.dupont@unitium.io         ║ Password123! ║");
        log.info("[UnitiumSeedService] ║ Employee 2                        ║ marc.leroy@unitium.io           ║ Password123! ║");
        log.info("[UnitiumSeedService] ║ PO User (Product Owner)           ║ pooja.sharma@unitium.io         ║ Password123! ║");
        log.info("[UnitiumSeedService] ║ Manager                           ║ manager@unitium.io              ║ Password123! ║");
        log.info("[UnitiumSeedService] ╚═══════════════════════════════════╩═════════════════════════════════╩══════════════╝");
        log.info("\n");
    }
}
