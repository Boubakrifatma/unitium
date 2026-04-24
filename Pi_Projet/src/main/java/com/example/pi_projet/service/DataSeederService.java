package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.Workspace;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.TaskDependencyRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataSeederService implements CommandLineRunner {

    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final TaskDependencyRepository taskDependencyRepository;

    @Override
    public void run(String... args) {
        try {
            // Only seed if no milestones exist
            if (milestoneRepository.count() > 0) {
                log.info("Data already seeded, skipping.");
                return;
            }

            // 1. Find first workspace
            List<Workspace> workspaces = workspaceRepository.findAll();
            if (workspaces.isEmpty()) {
                log.warn("No workspaces found — skipping data seeding.");
                return;
            }
            Workspace workspace = workspaces.get(0);

            // 2. Find first project in that workspace
            List<Project> projects = projectRepository.findAllByWorkspaceIdAndDeletedAtIsNull(workspace.getId());
            if (projects.isEmpty()) {
                log.warn("No projects found in workspace '{}' — skipping data seeding.", workspace.getId());
                return;
            }
            Project project = projects.get(0);

            // 3. Find first user to assign tasks
            List<User> users = userRepository.findAll();
            User firstUser = users.isEmpty() ? null : users.get(0);

            LocalDate today = LocalDate.now();

            // ── Milestone 1: Sprint Alpha ───────────────────────────────────────
            Milestone sprintAlpha = milestoneRepository.save(
                    Milestone.builder()
                            .project(project)
                            .name("Sprint Alpha")
                            .description("Initial sprint covering core infrastructure setup and authentication.")
                            .status(Milestone.MilestoneStatus.in_progress)
                            .dueDate(today.plusDays(30))
                            .completionPct(35f)
                            .build()
            );

            // ── Milestone 2: Sprint Beta ────────────────────────────────────────
            Milestone sprintBeta = milestoneRepository.save(
                    Milestone.builder()
                            .project(project)
                            .name("Sprint Beta")
                            .description("Feature implementation sprint — main business logic and UI integration.")
                            .status(Milestone.MilestoneStatus.pending)
                            .dueDate(today.plusDays(60))
                            .completionPct(0f)
                            .build()
            );

            // ── Milestone 3: Release v1.0 ───────────────────────────────────────
            Milestone releaseV1 = milestoneRepository.save(
                    Milestone.builder()
                            .project(project)
                            .name("Release v1.0")
                            .description("Production release milestone — final QA, deployment and go-live.")
                            .status(Milestone.MilestoneStatus.at_risk)
                            .dueDate(today.plusDays(10))
                            .completionPct(70f)
                            .riskScore(75f)
                            .build()
            );

            // ── Tasks for Sprint Alpha ──────────────────────────────────────────
            Task t1 = saveTask("Setup CI/CD pipeline", Task.TaskStatus.done, Task.TaskPriority.high,
                    Task.TaskType.task, project, sprintAlpha, firstUser, today, sprintAlpha.getDueDate().minusDays(20), 8f, 8f);
            Task t2 = saveTask("Implement auth module", Task.TaskStatus.in_progress, Task.TaskPriority.critical,
                    Task.TaskType.story, project, sprintAlpha, firstUser, today, sprintAlpha.getDueDate().minusDays(10), 16f, 6f);
            Task t3 = saveTask("Write unit tests for auth", Task.TaskStatus.todo, Task.TaskPriority.medium,
                    Task.TaskType.task, project, sprintAlpha, firstUser, today, sprintAlpha.getDueDate().minusDays(5), 8f, 0f);
            Task t4 = saveTask("Configure Docker environment", Task.TaskStatus.done, Task.TaskPriority.high,
                    Task.TaskType.task, project, sprintAlpha, firstUser, today, sprintAlpha.getDueDate().minusDays(25), 4f, 4f);
            Task t5 = saveTask("Database schema migration", Task.TaskStatus.in_progress, Task.TaskPriority.high,
                    Task.TaskType.task, project, sprintAlpha, firstUser, today, sprintAlpha.getDueDate().minusDays(8), 6f, 3f);

            // ── Tasks for Sprint Beta ───────────────────────────────────────────
            Task t6 = saveTask("Design dashboard UI", Task.TaskStatus.todo, Task.TaskPriority.medium,
                    Task.TaskType.story, project, sprintBeta, firstUser, today, sprintBeta.getDueDate().minusDays(30), 12f, 0f);
            Task t7 = saveTask("Implement REST API endpoints", Task.TaskStatus.todo, Task.TaskPriority.high,
                    Task.TaskType.task, project, sprintBeta, firstUser, today, sprintBeta.getDueDate().minusDays(20), 16f, 0f);
            Task t8 = saveTask("Integrate payment gateway", Task.TaskStatus.blocked, Task.TaskPriority.critical,
                    Task.TaskType.task, project, sprintBeta, firstUser, today, sprintBeta.getDueDate().minusDays(10), 8f, 2f);
            Task t9 = saveTask("Write integration tests", Task.TaskStatus.todo, Task.TaskPriority.low,
                    Task.TaskType.task, project, sprintBeta, firstUser, today, sprintBeta.getDueDate().minusDays(5), 8f, 0f);

            // ── Tasks for Release v1.0 ──────────────────────────────────────────
            Task t10 = saveTask("Fix login bug on mobile", Task.TaskStatus.in_progress, Task.TaskPriority.critical,
                    Task.TaskType.bug, project, releaseV1, firstUser, today, releaseV1.getDueDate().minusDays(3), 4f, 3f);
            Task t11 = saveTask("Perform load testing", Task.TaskStatus.done, Task.TaskPriority.high,
                    Task.TaskType.task, project, releaseV1, firstUser, today, releaseV1.getDueDate().minusDays(5), 8f, 8f);
            Task t12 = saveTask("Finalize release notes", Task.TaskStatus.todo, Task.TaskPriority.medium,
                    Task.TaskType.task, project, releaseV1, firstUser, today, releaseV1.getDueDate().minusDays(1), 4f, 0f);
            Task t13 = saveTask("Deploy to production", Task.TaskStatus.todo, Task.TaskPriority.critical,
                    Task.TaskType.task, project, releaseV1, firstUser, today, releaseV1.getDueDate(), 6f, 0f);
            Task t14 = saveTask("Notify stakeholders", Task.TaskStatus.todo, Task.TaskPriority.low,
                    Task.TaskType.task, project, releaseV1, firstUser, today, releaseV1.getDueDate(), 2f, 0f);

            // ── Task Dependencies (finish_to_start) ─────────────────────────────
            // t2 depends on t1 (implement auth after CI/CD)
            taskDependencyRepository.save(
                    TaskDependency.builder()
                            .task(t2)
                            .dependsOnTask(t1)
                            .dependencyType(TaskDependency.DependencyType.finish_to_start)
                            .build()
            );
            // t3 depends on t2 (write tests after auth is implemented)
            taskDependencyRepository.save(
                    TaskDependency.builder()
                            .task(t3)
                            .dependsOnTask(t2)
                            .dependencyType(TaskDependency.DependencyType.finish_to_start)
                            .build()
            );
            // t7 depends on t6 (build API after UI design)
            taskDependencyRepository.save(
                    TaskDependency.builder()
                            .task(t7)
                            .dependsOnTask(t6)
                            .dependencyType(TaskDependency.DependencyType.finish_to_start)
                            .build()
            );
            // t13 depends on t11 (deploy after load testing)
            taskDependencyRepository.save(
                    TaskDependency.builder()
                            .task(t13)
                            .dependsOnTask(t11)
                            .dependencyType(TaskDependency.DependencyType.finish_to_start)
                            .build()
            );
            // t14 depends on t13 (notify after deploy)
            taskDependencyRepository.save(
                    TaskDependency.builder()
                            .task(t14)
                            .dependsOnTask(t13)
                            .dependencyType(TaskDependency.DependencyType.finish_to_start)
                            .build()
            );

            log.info("✅ Test data seeded successfully");

        } catch (Exception e) {
            log.error("Data seeding failed — application startup will continue normally.", e);
        }
    }

    private Task saveTask(String title, Task.TaskStatus status, Task.TaskPriority priority,
                          Task.TaskType taskType, Project project, Milestone milestone,
                          User assignedTo, LocalDate startDate, LocalDate dueDate,
                          Float estimatedHours, Float actualHours) {
        return taskRepository.save(
                Task.builder()
                        .title(title)
                        .taskType(taskType)
                        .status(status)
                        .priority(priority)
                        .project(project)
                        .milestone(milestone)
                        .assignedTo(assignedTo)
                        .startDate(startDate)
                        .dueDate(dueDate)
                        .estimatedHours(estimatedHours)
                        .actualHours(actualHours)
                        .build()
        );
    }
}
