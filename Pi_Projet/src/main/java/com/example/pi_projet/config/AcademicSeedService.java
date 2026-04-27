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
 * Production-quality academic showcase seed for an academic organization.
 * Demonstrates educational modules: Tutors, Students, Courses, Assignments, Discussions.
 *
 * Runs at @Order(4) after DataInitializer (1) and UnitiumSeedService (3). Module2OrganizationInitializer runs at @Order(5) after this.
 * Fully idempotent — safe to run multiple times.
 */
@Component
@Order(4)
@RequiredArgsConstructor
@Slf4j
public class AcademicSeedService implements CommandLineRunner {

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
    private final DeliverableRepository deliverableRepository;
    private final DeliverableVersionRepository deliverableVersionRepository;
    private final DeliverableReviewRepository deliverableReviewRepository;
    private final PoDecisionRepository poDecisionRepository;
    private final UsageQuotaRepository usageQuotaRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;

    // ── Seed Constants ──────────────────────────────────────────────────────
    private static final String SEED_ORG_SLUG = "academy-hub";
    private static final String SEED_WORKSPACE_SLUG = "cs-101-semester";
    private static final LocalDate WORKSPACE_CREATED_DATE = LocalDate.of(2026, 1, 15);
    private static final String PLAINTEXT_PASSWORD = "Password123!";

    // ── Data holders populated during seed ──────────────────────────────────
    private User admin, tutor1, tutor2, tutor3, student1, student2, student3, student4;
    private Organization academyOrg;
    private Workspace courseWorkspace;
    private Project courseProject;
    private Milestone module1, module2, module3;
    private Task task11, task12, task13;
    private Task task21, task22, task23;
    private Task task31, task32;
    private ChatRoom classroomChat, announcements;

    @Override
    @Transactional
    public void run(String... args) {
        // ── Idempotency guard ───────────────────────────────────────────────
        if (organizationRepository.findBySlug(SEED_ORG_SLUG).isPresent()) {
            log.info("[AcademicSeedService] Already seeded — skipping.");
            return;
        }

        log.info("[AcademicSeedService] ═══════════════════════════════════════════════════════");
        log.info("[AcademicSeedService] Starting Academic showcase seed (Order 4)...");
        log.info("[AcademicSeedService] ═══════════════════════════════════════════════════════");

        try {
            step01_createUsers();
            step02_createOrganization();
            step03_createSubscription();
            step04_createWorkspace();
            step05_createProject();
            step06_createMilestones();
            step07_createTasks();
            step08_createTaskDependencies();
            step09_createChatRooms();
            step10_createMessages();
            step11_createDeliverables();
            step12_createUsageQuotas();

            printCredentialsTable();
            log.info("[AcademicSeedService] ═══════════════════════════════════════════════════════");
            log.info("[AcademicSeedService] Seed completed successfully!");
            log.info("[AcademicSeedService] ═══════════════════════════════════════════════════════");
        } catch (Exception e) {
            log.error("[AcademicSeedService] Seed failed", e);
            throw new RuntimeException("AcademicSeedService failed", e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 1: Create Users (Admin, Tutors, Students)
    // ─────────────────────────────────────────────────────────────────────────

    private void step01_createUsers() {
        log.info("[AcademicSeedService] Step 1: Creating 8 users (1 admin, 3 tutors, 4 students)...");
        String hashedPwd = passwordEncoder.encode(PLAINTEXT_PASSWORD);

        admin = userRepository.save(User.builder()
            .email("admin@academy.edu")
            .fullName("Dr. Academic Admin")
            .passwordHash(hashedPwd)
            .role(User.RoleName.ADMIN)
            .isActive(true)
            .isVerified(true)
            .build());

        tutor1 = userRepository.save(User.builder()
            .email("tutor1@academy.edu")
            .fullName("Prof. Sarah Johnson")
            .passwordHash(hashedPwd)
            .role(User.RoleName.TUTOR)
            .isActive(true)
            .isVerified(true)
            .build());

        tutor2 = userRepository.save(User.builder()
            .email("tutor2@academy.edu")
            .fullName("Dr. Michael Chen")
            .passwordHash(hashedPwd)
            .role(User.RoleName.TUTOR)
            .isActive(true)
            .isVerified(true)
            .build());

        tutor3 = userRepository.save(User.builder()
            .email("tutor3@academy.edu")
            .fullName("Ms. Olivia Carter")
            .passwordHash(hashedPwd)
            .role(User.RoleName.TUTOR)
            .isActive(true)
            .isVerified(true)
            .build());

        student1 = userRepository.save(User.builder()
            .email("student1@academy.edu")
            .fullName("Emma Williams")
            .passwordHash(hashedPwd)
            .role(User.RoleName.STUDENT)
            .isActive(true)
            .isVerified(true)
            .build());

        student2 = userRepository.save(User.builder()
            .email("student2@academy.edu")
            .fullName("James Brown")
            .passwordHash(hashedPwd)
            .role(User.RoleName.STUDENT)
            .isActive(true)
            .isVerified(true)
            .build());

        student3 = userRepository.save(User.builder()
            .email("student3@academy.edu")
            .fullName("Sophia Martinez")
            .passwordHash(hashedPwd)
            .role(User.RoleName.STUDENT)
            .isActive(true)
            .isVerified(true)
            .build());

        student4 = userRepository.save(User.builder()
            .email("student4@academy.edu")
            .fullName("Lucas Anderson")
            .passwordHash(hashedPwd)
            .role(User.RoleName.STUDENT)
            .isActive(true)
            .isVerified(true)
            .build());

        // Set last login times via JdbcTemplate
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 25, 10, 0)), admin.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 24, 14, 30)), tutor1.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 25, 9, 0)), tutor2.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 26, 11, 0)), tutor3.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 27, 8, 0)), student1.getId());
        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            Timestamp.valueOf(LocalDateTime.of(2026, 4, 26, 20, 0)), student2.getId());

        log.info("[AcademicSeedService]   ✓ 8 users created: Admin, 3 Tutors, 4 Students");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 2: Create Academic Organization
    // ─────────────────────────────────────────────────────────────────────────

    private void step02_createOrganization() {
        log.info("[AcademicSeedService] Step 2: Creating organization 'Academy Hub'...");

        academyOrg = organizationRepository.save(Organization.builder()
            .name("Academy Hub")
            .slug(SEED_ORG_SLUG)
            .ownerId(admin.getId())
            .orgType(Organization.OrgType.ACADEMIC)
            .billingEmail("billing@academy.edu")
            .build());

        // Create org members
        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(admin.getId())
            .role(OrganizationMember.OrganizationRole.OWNER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(tutor1.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(tutor2.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(tutor3.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(student1.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(student2.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(student3.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        organizationMemberRepository.save(OrganizationMember.builder()
            .organization(academyOrg)
            .userId(student4.getId())
            .role(OrganizationMember.OrganizationRole.MEMBER)
            .build());

        log.info("[AcademicSeedService]   ✓ Academic organization created with 8 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 3: Create Subscription
    // ─────────────────────────────────────────────────────────────────────────

    private void step03_createSubscription() {
        log.info("[AcademicSeedService] Step 3: Creating subscription...");

        Plan academicPlan = planRepository.findByName("academic-institution")
            .orElseThrow(() -> new IllegalStateException("Plan 'academic-institution' not found"));

        Subscription subscription = subscriptionRepository.save(Subscription.builder()
            .organization(academyOrg)
            .plan(academicPlan)
            .status(Subscription.SubscriptionStatus.ACTIVE)
            .billingCycle(Subscription.BillingCycle.ANNUAL)
            .currentPeriodStart(LocalDateTime.of(2026, 1, 1, 0, 0))
            .currentPeriodEnd(LocalDateTime.of(2027, 1, 1, 0, 0))
            .stripeSubscriptionId("sub_academy_2026")
            .build());

        log.info("[AcademicSeedService]   ✓ Subscription created (ACTIVE, ANNUAL)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 4: Create Workspace (Course)
    // ─────────────────────────────────────────────────────────────────────────

    private void step04_createWorkspace() {
        log.info("[AcademicSeedService] Step 4: Creating workspace (course)...");

        UUID workspaceId = UUID.nameUUIDFromBytes(
            (SEED_ORG_SLUG + ":" + SEED_WORKSPACE_SLUG).getBytes(StandardCharsets.UTF_8));

        courseWorkspace = workspaceRepository.save(Workspace.builder()
            .id(workspaceId)
            .name("CS-101: Introduction to Computer Science")
            .slug(SEED_WORKSPACE_SLUG)
            .ownerId(admin.getId())
            .organization(academyOrg)
            .orgType("academic")
            .build());

        // Patch created_at to 2026-01-15 00:00:00 UTC
        jdbcTemplate.update("UPDATE workspaces SET created_at = ? WHERE id = ?",
            Timestamp.from(WORKSPACE_CREATED_DATE.atStartOfDay(ZoneId.of("UTC")).toInstant()),
            workspaceId.toString());

        // Create workspace members
        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(admin.getId())
            .role(WorkspaceMember.WorkspaceRole.OWNER)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(tutor1.getId())
            .role(WorkspaceMember.WorkspaceRole.ADMIN)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(tutor2.getId())
            .role(WorkspaceMember.WorkspaceRole.ADMIN)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(tutor3.getId())
            .role(WorkspaceMember.WorkspaceRole.ADMIN)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(student1.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(student2.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(student3.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
            .workspace(courseWorkspace)
            .userId(student4.getId())
            .role(WorkspaceMember.WorkspaceRole.EMPLOYEE)
            .build());

        log.info("[AcademicSeedService]   ✓ Workspace created (createdAt: 2026-01-15) + 8 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 5: Create Project (Course Coursework)
    // ─────────────────────────────────────────────────────────────────────────

    private void step05_createProject() {
        log.info("[AcademicSeedService] Step 5: Creating project...");

        courseProject = projectRepository.save(Project.builder()
            .workspace(courseWorkspace)
            .createdBy(admin.getId())
            .name("Spring 2026 Coursework & Assessments")
            .description("Complete coursework for CS-101 spring semester including lectures, " +
                "assignments, quizzes, and final project deliverables.")
            .startDate(LocalDate.of(2026, 1, 15))
            .endDate(LocalDate.of(2026, 5, 10))
            .status(Project.ProjectStatus.ACTIVE)
            .visibility(Project.Visibility.PRIVATE)
            .build());

        // Create project members
        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(admin.getId())
            .role(ProjectMember.ProjectRole.PROJECT_MANAGER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(tutor1.getId())
            .role(ProjectMember.ProjectRole.DEVELOPER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(tutor2.getId())
            .role(ProjectMember.ProjectRole.DEVELOPER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(tutor3.getId())
            .role(ProjectMember.ProjectRole.DEVELOPER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(student1.getId())
            .role(ProjectMember.ProjectRole.OBSERVER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(student2.getId())
            .role(ProjectMember.ProjectRole.OBSERVER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(student3.getId())
            .role(ProjectMember.ProjectRole.OBSERVER)
            .build());

        projectMemberRepository.save(ProjectMember.builder()
            .project(courseProject)
            .userId(student4.getId())
            .role(ProjectMember.ProjectRole.OBSERVER)
            .build());

        log.info("[AcademicSeedService]   ✓ Project created + 8 members");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 6: Create Milestones (Course Modules)
    // ─────────────────────────────────────────────────────────────────────────

    private void step06_createMilestones() {
        log.info("[AcademicSeedService] Step 6: Creating milestones (course modules)...");

        module1 = milestoneRepository.save(Milestone.builder()
            .project(courseProject)
            .name("Module 1: Fundamentals & Algorithms")
            .description("Introduction to computer science concepts, algorithms, and complexity analysis")
            .startDate(LocalDate.of(2026, 1, 15))
            .dueDate(LocalDate.of(2026, 2, 15))
            .status(Milestone.MilestoneStatus.completed)
            .completionPct(100.0f)
            .build());

        module2 = milestoneRepository.save(Milestone.builder()
            .project(courseProject)
            .name("Module 2: Data Structures & Implementation")
            .description("Study of data structures including arrays, lists, trees, and graphs")
            .startDate(LocalDate.of(2026, 2, 16))
            .dueDate(LocalDate.of(2026, 3, 31))
            .status(Milestone.MilestoneStatus.in_progress)
            .completionPct(65.0f)
            .build());

        module3 = milestoneRepository.save(Milestone.builder()
            .project(courseProject)
            .name("Module 3: Advanced Topics & Project")
            .description("Advanced algorithms, optimization techniques, and capstone project")
            .startDate(LocalDate.of(2026, 4, 1))
            .dueDate(LocalDate.of(2026, 5, 10))
            .status(Milestone.MilestoneStatus.pending)
            .completionPct(0.0f)
            .build());

        log.info("[AcademicSeedService]   ✓ 3 milestones created");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 7: Create Tasks (Assignments, Quizzes, Labs)
    // ─────────────────────────────────────────────────────────────────────────

    private void step07_createTasks() {
        log.info("[AcademicSeedService] Step 7: Creating 8 tasks (assignments, quizzes)...");

        // ── Module 1 Tasks (all DONE) ──
        task11 = taskRepository.save(Task.builder()
            .milestone(module1)
            .project(courseProject)
            .title("1.1 Assignment: Algorithm Design & Analysis")
            .description("Analyze and design algorithms for sorting problems")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor1)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(8f)
            .actualHours(7.5f)
            .startDate(LocalDate.of(2026, 1, 15))
            .dueDate(LocalDate.of(2026, 1, 29))
            .completedAt(LocalDateTime.of(2026, 1, 29, 17, 0))
            .createdBy(admin)
            .build());

        task12 = taskRepository.save(Task.builder()
            .milestone(module1)
            .project(courseProject)
            .title("1.2 Quiz: Computational Complexity")
            .description("Online quiz covering Big O notation and complexity analysis")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor1)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.easy)
            .estimatedHours(2f)
            .actualHours(1.5f)
            .startDate(LocalDate.of(2026, 2, 1))
            .dueDate(LocalDate.of(2026, 2, 5))
            .completedAt(LocalDateTime.of(2026, 2, 5, 18, 0))
            .createdBy(admin)
            .build());

        task13 = taskRepository.save(Task.builder()
            .milestone(module1)
            .project(courseProject)
            .title("1.3 Lab: Implementation Practice")
            .description("Implement 3 sorting algorithms in Python")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor2)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.medium)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(6f)
            .actualHours(6f)
            .startDate(LocalDate.of(2026, 2, 8))
            .dueDate(LocalDate.of(2026, 2, 15))
            .completedAt(LocalDateTime.of(2026, 2, 15, 16, 0))
            .createdBy(admin)
            .build());

        // ── Module 2 Tasks (2 DONE, 1 IN_PROGRESS) ──
        task21 = taskRepository.save(Task.builder()
            .milestone(module2)
            .project(courseProject)
            .title("2.1 Assignment: Binary Search Trees")
            .description("Design and implement a balanced binary search tree")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor2)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.critical)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(10f)
            .actualHours(10.5f)
            .startDate(LocalDate.of(2026, 2, 16))
            .dueDate(LocalDate.of(2026, 3, 5))
            .completedAt(LocalDateTime.of(2026, 3, 5, 15, 0))
            .createdBy(admin)
            .build());

        task22 = taskRepository.save(Task.builder()
            .milestone(module2)
            .project(courseProject)
            .title("2.2 Assignment: Graph Algorithms")
            .description("Implement BFS, DFS, and Dijkstra's algorithm")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor1)
            .status(Task.TaskStatus.done)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(12f)
            .actualHours(11.5f)
            .startDate(LocalDate.of(2026, 3, 8))
            .dueDate(LocalDate.of(2026, 3, 22))
            .completedAt(LocalDateTime.of(2026, 3, 22, 14, 0))
            .createdBy(admin)
            .build());

        task23 = taskRepository.save(Task.builder()
            .milestone(module2)
            .project(courseProject)
            .title("2.3 Quiz: Data Structures Review")
            .description("Comprehensive quiz on arrays, linked lists, trees, and graphs")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor2)
            .status(Task.TaskStatus.in_progress)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.medium)
            .estimatedHours(2f)
            .actualHours(0.5f)
            .startDate(LocalDate.of(2026, 3, 23))
            .dueDate(LocalDate.of(2026, 3, 31))
            .completedAt(null)
            .createdBy(admin)
            .build());

        // ── Module 3 Tasks (TODO) ──
        task31 = taskRepository.save(Task.builder()
            .milestone(module3)
            .project(courseProject)
            .title("3.1 Assignment: Advanced Algorithms")
            .description("Implement dynamic programming and greedy algorithms")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor1)
            .status(Task.TaskStatus.todo)
            .priority(Task.TaskPriority.high)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(14f)
            .actualHours(0f)
            .startDate(LocalDate.of(2026, 4, 1))
            .dueDate(LocalDate.of(2026, 4, 20))
            .completedAt(null)
            .createdBy(admin)
            .build());

        task32 = taskRepository.save(Task.builder()
            .milestone(module3)
            .project(courseProject)
            .title("3.2 Final Project: Data Analysis System")
            .description("Design and implement a complete data analysis application")
            .taskType(Task.TaskType.task)
            .assignedTo(tutor2)
            .status(Task.TaskStatus.todo)
            .priority(Task.TaskPriority.critical)
            .difficulty(Task.TaskDifficulty.hard)
            .estimatedHours(30f)
            .actualHours(0f)
            .startDate(LocalDate.of(2026, 4, 21))
            .dueDate(LocalDate.of(2026, 5, 10))
            .completedAt(null)
            .createdBy(admin)
            .build());

        log.info("[AcademicSeedService]   ✓ 8 tasks created (3 M1 DONE, 2 M2 DONE, 1 IN_PROGRESS, 2 TODO)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 8: Create Task Dependencies
    // ─────────────────────────────────────────────────────────────────────────

    private void step08_createTaskDependencies() {
        log.info("[AcademicSeedService] Step 8: Creating task dependencies...");

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task12)
            .dependsOnTask(task11)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task13)
            .dependsOnTask(task12)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task21)
            .dependsOnTask(task13)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task22)
            .dependsOnTask(task21)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task23)
            .dependsOnTask(task22)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task31)
            .dependsOnTask(task23)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        taskDependencyRepository.save(TaskDependency.builder()
            .task(task32)
            .dependsOnTask(task31)
            .dependencyType(TaskDependency.DependencyType.finish_to_start)
            .createdBy(admin)
            .build());

        log.info("[AcademicSeedService]   ✓ 7 dependencies created");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 9: Create Chat Rooms (Course Discussions)
    // ─────────────────────────────────────────────────────────────────────────

    private void step09_createChatRooms() {
        log.info("[AcademicSeedService] Step 9: Creating chat rooms...");

        classroomChat = chatRoomRepository.save(ChatRoom.builder()
            .project(courseProject)
            .createdBy(admin)
            .name("Classroom Discussion")
            .roomType(RoomType.general)
            .description("General course discussion and Q&A")
            .build());

        announcements = chatRoomRepository.save(ChatRoom.builder()
            .project(courseProject)
            .createdBy(admin)
            .name("Course Announcements")
            .roomType(RoomType.general)
            .description("Important course announcements and updates")
            .build());

        // Add all users to both rooms
        for (User user : Arrays.asList(admin, tutor1, tutor2, tutor3, student1, student2, student3, student4)) {
            roomMemberRepository.save(RoomMember.builder()
                .room(classroomChat)
                .user(user)
                .build());
            roomMemberRepository.save(RoomMember.builder()
                .room(announcements)
                .user(user)
                .build());
        }

        log.info("[AcademicSeedService]   ✓ 2 chat rooms created + 16 memberships");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 10: Create Messages
    // ─────────────────────────────────────────────────────────────────────────

    private void step10_createMessages() {
        log.info("[AcademicSeedService] Step 10: Creating messages...");

        // ── Announcements (10 messages — official, stern, encouraging, warning) ──
        insertMessage(announcements.getId(), admin.getId(),
            "Welcome to CS-101! This channel is for official course updates only. All coursework lives in the project modules.",
            "2026-01-15 09:00");
        insertMessage(announcements.getId(), tutor1.getId(),
            "Module 1 is live! Algorithm design assignment due Jan 29. Office hours: Tue/Thu 3-4pm. Don't wait until the last day.",
            "2026-01-20 10:00");
        insertMessage(announcements.getId(), admin.getId(),
            "Reminder: All submissions must go through the portal. Late work incurs a 10% daily penalty. No exceptions will be made.",
            "2026-01-25 08:00");
        insertMessage(announcements.getId(), admin.getId(),
            "Module 1 is complete. Strong results overall. Module 2 starts Feb 16 — data structures are significantly harder. Prepare accordingly.",
            "2026-02-16 08:00");
        insertMessage(announcements.getId(), tutor2.getId(),
            "BST assignment due Mar 5. This is the most challenging task of the semester. Start early — I cannot grant extensions.",
            "2026-02-20 09:00");
        insertMessage(announcements.getId(), tutor1.getId(),
            "Several students have not attended any office hours yet. If you are struggling, please come — that's what office hours are for.",
            "2026-03-01 10:00");
        insertMessage(announcements.getId(), tutor2.getId(),
            "Module 2 Assignment 1 (BSTs) solutions posted. Graph algorithms assignment is next, due Mar 22.",
            "2026-03-08 14:00");
        insertMessage(announcements.getId(), tutor1.getId(),
            "Module 2 quiz is open through Mar 31. It covers everything from the last 6 weeks. Study your notes.",
            "2026-03-23 09:00");
        insertMessage(announcements.getId(), tutor3.getId(),
            "I will host extra study sessions every Wednesday 5-6pm for Module 3 topics. Dynamic programming and greedy algorithms covered first.",
            "2026-04-03 11:00");
        insertMessage(announcements.getId(), admin.getId(),
            "Final project guidelines posted. Teams of 2-4. Compositions due Apr 5. Presentations on May 10. No solo projects accepted.",
            "2026-04-01 10:00");

        // ── Classroom Discussion (17 messages — positive, negative, frustrated, supportive, conflict) ──
        insertMessage(classroomChat.getId(), student1.getId(),
            "Hi everyone! So excited to finally start CS-101. Has anyone started the algorithm assignment yet?",
            "2026-01-16 17:00");
        insertMessage(classroomChat.getId(), student2.getId(),
            "Just read through it. Looks doable but I'm a bit nervous about the complexity analysis part.",
            "2026-01-16 17:30");
        insertMessage(classroomChat.getId(), tutor1.getId(),
            "Don't be nervous — complexity analysis is a skill you build over time. Post specific questions here anytime.",
            "2026-01-17 09:00");
        insertMessage(classroomChat.getId(), student3.getId(),
            "I've been stuck on the BST assignment for 3 days. I literally cannot figure out the rebalancing logic. This is brutal.",
            "2026-02-28 20:00");
        insertMessage(classroomChat.getId(), tutor2.getId(),
            "What specifically is failing — insertion, deletion, or rotation? Share your approach and I'll guide you through it.",
            "2026-03-01 09:15");
        insertMessage(classroomChat.getId(), student3.getId(),
            "It's the left-right rotation after insertion. My tree is correct before but wrong after the rotation.",
            "2026-03-01 10:00");
        insertMessage(classroomChat.getId(), tutor2.getId(),
            "Classic issue. Your rotation is likely updating the parent pointer but forgetting the grandparent. Check lines 40-55 carefully.",
            "2026-03-01 10:30");
        insertMessage(classroomChat.getId(), student4.getId(),
            "Is anyone else finding this course way harder than advertised? The workload is really hitting me.",
            "2026-03-10 19:00");
        insertMessage(classroomChat.getId(), student1.getId(),
            "It's hard for sure, but I'm genuinely learning more here than in any other course. Worth it.",
            "2026-03-10 19:30");
        insertMessage(classroomChat.getId(), admin.getId(),
            "The difficulty is intentional. CS fundamentals require struggle. If it feels hard, you're engaging with the material correctly.",
            "2026-03-11 08:00");
        insertMessage(classroomChat.getId(), student2.getId(),
            "Got my Module 1 grade back — 92%! I didn't expect that at all. So relieved and happy!",
            "2026-02-18 16:00");
        insertMessage(classroomChat.getId(), tutor1.getId(),
            "Outstanding result, James. That score reflects real effort. Keep that same discipline for Module 2.",
            "2026-02-19 09:00");
        insertMessage(classroomChat.getId(), student3.getId(),
            "I got a 68 on Module 1. Really disappointed — I thought I understood the material.",
            "2026-02-18 17:00");
        insertMessage(classroomChat.getId(), tutor1.getId(),
            "68 is a passing grade. Come to my office hours this week — we'll go through exactly where marks were lost and how to improve.",
            "2026-02-19 09:15");
        insertMessage(classroomChat.getId(), student3.getId(),
            "Can we work in groups for the final project? I really need teammates who are motivated.",
            "2026-04-05 14:00");
        insertMessage(classroomChat.getId(), admin.getId(),
            "Yes — teams of 2-4 are strongly encouraged. Submit your team composition via the portal by end of day today.",
            "2026-04-05 15:00");
        insertMessage(classroomChat.getId(), tutor3.getId(),
            "Wednesday study sessions are on! Bring your toughest questions on dynamic programming. See you there.",
            "2026-04-11 09:00");

        log.info("[AcademicSeedService]   ✓ 27 messages created (10 Announcements, 17 Classroom — mixed sentiments)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 11: Create Deliverables (Student Submissions)
    // ─────────────────────────────────────────────────────────────────────────

    private void step11_createDeliverables() {
        log.info("[AcademicSeedService] Step 11: Creating deliverables (student submissions)...");

        // Assignment 1 submission from student1
        Deliverable assignment1 = deliverableRepository.save(Deliverable.builder()
            .task(task11)
            .project(courseProject)
            .submittedBy(student1)
            .title("Assignment 1.1 Submission - Emma Williams")
            .description("Algorithm Design & Analysis assignment solution")
            .currentVersion(1)
            .fileUrl("/uploads/academy/assignment-1-1-emma.zip")
            .fileType("application/zip")
            .fileSizeKb(250L)
            .status(Deliverable.DeliverableStatus.validated)
            .poDecisionField(Deliverable.PoDecisionField.validated)
            .build());

        DeliverableVersion v1 = deliverableVersionRepository.save(DeliverableVersion.builder()
            .deliverable(assignment1)
            .versionNumber(1)
            .fileUrl("/uploads/academy/assignment-1-1-emma.zip")
            .fileSizeKb(250L)
            .changeSummary("Final submission")
            .submittedBy(student1)
            .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(assignment1)
            .version(v1)
            .reviewer(tutor1)
            .reviewerRole(DeliverableReview.ReviewerRole.MANAGER)
            .score(4.7f)
            .feedbackText("Excellent solution. Good algorithm analysis and clear implementation. A++")
            .decision(DeliverableReview.ReviewDecision.ACCEPTED)
            .build());

        poDecisionRepository.save(PoDecision.builder()
            .deliverable(assignment1)
            .po(tutor1)
            .manager(tutor1)
            .decision(PoDecision.PoDecisionType.validated)
            .finalComments("Outstanding work. Keep it up!")
            .build());

        // Lab 1 submission from student2
        Deliverable lab1 = deliverableRepository.save(Deliverable.builder()
            .task(task13)
            .project(courseProject)
            .submittedBy(student2)
            .title("Lab 1.3 Submission - James Brown")
            .description("Sorting algorithms implementation in Python")
            .currentVersion(1)
            .fileUrl("/uploads/academy/lab-1-3-james.zip")
            .fileType("application/zip")
            .fileSizeKb(180L)
            .status(Deliverable.DeliverableStatus.validated)
            .poDecisionField(Deliverable.PoDecisionField.validated)
            .build());

        DeliverableVersion v2 = deliverableVersionRepository.save(DeliverableVersion.builder()
            .deliverable(lab1)
            .versionNumber(1)
            .fileUrl("/uploads/academy/lab-1-3-james.zip")
            .fileSizeKb(180L)
            .changeSummary("Final submission")
            .submittedBy(student2)
            .virusScanStatus(DeliverableVersion.VirusScanStatus.clean)
            .build());

        deliverableReviewRepository.save(DeliverableReview.builder()
            .deliverable(lab1)
            .version(v2)
            .reviewer(tutor2)
            .reviewerRole(DeliverableReview.ReviewerRole.MANAGER)
            .score(4.5f)
            .feedbackText("All three sorting algorithms correctly implemented. Well-structured code.")
            .decision(DeliverableReview.ReviewDecision.ACCEPTED)
            .build());

        poDecisionRepository.save(PoDecision.builder()
            .deliverable(lab1)
            .po(tutor2)
            .manager(tutor2)
            .decision(PoDecision.PoDecisionType.validated)
            .finalComments("Great implementation. Ready for next module.")
            .build());

        log.info("[AcademicSeedService]   ✓ 2 deliverables created (both validated)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Step 12: Create Usage Quotas (Student Progress Snapshots)
    // ─────────────────────────────────────────────────────────────────────────

    private void step12_createUsageQuotas() {
        log.info("[AcademicSeedService] Step 12: Creating usage quota snapshots...");

        Subscription subscription = subscriptionRepository.findAll().stream()
            .filter(s -> s.getOrganization().getId().equals(academyOrg.getId()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Subscription not found"));

        LocalDate[] snapshotDates = {
            LocalDate.of(2026, 1, 15),
            LocalDate.of(2026, 2, 1),
            LocalDate.of(2026, 2, 28),
            LocalDate.of(2026, 3, 15),
            LocalDate.of(2026, 4, 1),
            LocalDate.of(2026, 4, 27)
        };

        int[] activeMembersProgress = {3, 5, 7, 7, 7, 7};
        long[] mlInferencesProgress = {0, 0, 1, 2, 3, 4};

        for (int i = 0; i < snapshotDates.length; i++) {
            usageQuotaRepository.save(UsageQuota.builder()
                .organization(academyOrg)
                .plan(subscription.getPlan())
                .metricDate(snapshotDates[i])
                .activeMembersCount(activeMembersProgress[i])
                .workspacesCount(1)
                .projectsCount(1)
                .storageUsedGb(0.25)
                .apiCallsCount(0L)
                .mlInferencesCount(mlInferencesProgress[i])
                .gradeExportsCount(0)
                .build());
        }

        log.info("[AcademicSeedService]   ✓ 6 usage quota snapshots created");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Print Credentials Table
    // ─────────────────────────────────────────────────────────────────────────

    private void printCredentialsTable() {
        log.info("\n");
        log.info("[AcademicSeedService] ╔═══════════════════════════════════╦═════════════════════════════════╦══════════════╗");
        log.info("[AcademicSeedService] ║ Role                              ║ Email                           ║ Password     ║");
        log.info("[AcademicSeedService] ╠═══════════════════════════════════╬═════════════════════════════════╬══════════════╣");
        log.info("[AcademicSeedService] ║ Organization Admin                ║ admin@academy.edu               ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Tutor 1 (Prof. Sarah Johnson)     ║ tutor1@academy.edu              ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Tutor 2 (Dr. Michael Chen)        ║ tutor2@academy.edu              ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Tutor 3 (Ms. Olivia Carter)       ║ tutor3@academy.edu              ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Student 1 (Emma Williams)         ║ student1@academy.edu            ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Student 2 (James Brown)           ║ student2@academy.edu            ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Student 3 (Sophia Martinez)       ║ student3@academy.edu            ║ Password123! ║");
        log.info("[AcademicSeedService] ║ Student 4 (Lucas Anderson)        ║ student4@academy.edu            ║ Password123! ║");
        log.info("[AcademicSeedService] ╚═══════════════════════════════════╩═════════════════════════════════╩══════════════╝");
        log.info("\n");
    }

    private void insertMessage(Long roomId, Long senderId, String text, String createdAt) {
        jdbcTemplate.update(
            "INSERT INTO messages (room_id, sender_id, content_text, content_type, is_system_message, is_pinned, is_deleted, created_at) " +
            "VALUES (?, ?, ?, 'text', false, false, false, ?)",
            roomId, senderId, text, createdAt);
    }
}
