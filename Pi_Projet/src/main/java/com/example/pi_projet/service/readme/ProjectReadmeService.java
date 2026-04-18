package com.example.pi_projet.service.readme;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.TaskRepository;
import com.example.pi_projet.service.ProjectService;
import com.example.pi_projet.service.ProjectTemplateService;
import com.example.pi_projet.service.TemplateStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.example.pi_projet.exception.Module2Exception.ErrorCode.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectReadmeService {

    public record GeneratedReadme(String markdown,
                                  String fileName,
                                  Instant lastModified,
                                  String mode,
                                  UUID orgId,
                                  String projectName) {}

    private final ProjectService projectService;
    private final ProjectTemplateService projectTemplateService;
    private final ProjectMemberRepository projectMemberRepository;
    private final com.example.pi_projet.repository.UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;
    private final TemplateStructureService templateStructureService;
    private final ReadmeSectionRenderer readmeSectionRenderer;
    private final ReadmeSanitizer readmeSanitizer;
    private final ReadmeAiEnhancerService readmeAiEnhancerService;

    public GeneratedReadme generate(UUID workspaceId,
                                    UUID projectId,
                                    Long requesterId,
                                    String requestedMode) {
        String mode = normalizeMode(requestedMode);

        Project project = projectService.getById(projectId, requesterId);
        if (project.getWorkspace() == null || !workspaceId.equals(project.getWorkspace().getId())) {
            throw new Module2Exception(NOT_FOUND, "Project not found in this workspace");
        }

        Optional<ProjectTemplate> template = Optional.empty();
        if (project.getTemplateId() != null) {
            template = projectTemplateService.getById(project.getTemplateId());
        }

        TemplateStructureService.NormalizedTemplateStructure structure = parseStructure(project, template);

        List<ReadmeSectionRenderer.MemberRow> members = buildMemberRows(projectId);
        List<ReadmeSectionRenderer.PhaseRow> phases = buildPhaseRows(project, structure);
        List<Milestone> liveMilestones = milestoneRepository.findByProject_Id(projectId);
        List<ReadmeSectionRenderer.MilestoneRow> milestones = buildMilestoneRows(project, structure, liveMilestones);

        List<Task> liveTasks = taskRepository.findByProject_Id(projectId);
        List<ReadmeSectionRenderer.TaskRow> tasks = buildTaskRows(project, structure, liveTasks);

        long doneTasks = tasks.stream()
            .filter(ReadmeSectionRenderer.TaskRow::enabled)
            .map(ReadmeSectionRenderer.TaskRow::status)
            .filter(this::isDoneStatus)
            .count();

        Optional<String> aiSummary = Optional.empty();
        if ("enhanced".equals(mode)) {
            List<String> phaseNames = phases.stream()
                .filter(ReadmeSectionRenderer.PhaseRow::enabled)
                .map(ReadmeSectionRenderer.PhaseRow::name)
                .limit(8)
                .toList();
            aiSummary = readmeAiEnhancerService.generateExecutiveSummary(
                project.getName(),
                project.getDescription(),
                project.getStatus() == null ? "UNKNOWN" : project.getStatus().name(),
                members.size(),
                tasks.size(),
                (int) doneTasks,
                phaseNames
            );
        }

        String templateName = template.map(ProjectTemplate::getName).orElse(null);
        String markdown = readmeSectionRenderer.render(
            project,
            mode,
            templateName,
            members,
            phases,
            milestones,
            tasks,
            aiSummary
        );

        String fileName = readmeSanitizer.slugifyFileName(project.getName())
            + "-readme-"
            + mode
            + "-"
            + LocalDate.now()
            + ".md";

        UUID orgId = project.getWorkspace() != null
            && project.getWorkspace().getOrganization() != null
            ? project.getWorkspace().getOrganization().getId()
            : null;

        return new GeneratedReadme(
            markdown,
            fileName,
            computeLastModified(project, template.orElse(null), liveTasks, liveMilestones),
            mode,
            orgId,
            project.getName()
        );
    }

    private List<ReadmeSectionRenderer.MemberRow> buildMemberRows(UUID projectId) {
        List<ProjectMember> memberships = projectMemberRepository.findAllByProjectId(projectId);
        if (memberships.isEmpty()) {
            return List.of();
        }

        Set<Long> userIds = memberships.stream()
            .map(ProjectMember::getUserId)
            .collect(Collectors.toSet());

        Map<Long, User> usersById = new LinkedHashMap<>();
        userRepository.findAllById(userIds)
            .forEach(user -> usersById.put(user.getId(), user));

        List<ReadmeSectionRenderer.MemberRow> rows = new ArrayList<>();
        for (ProjectMember membership : memberships) {
            User user = usersById.get(membership.getUserId());
            String fullName = user != null && user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName().trim()
                : "User #" + membership.getUserId();
            String email = user != null ? user.getEmail() : "-";
            String role = membership.getRole() == null ? "DEVELOPER" : membership.getRole().name();
            rows.add(new ReadmeSectionRenderer.MemberRow(membership.getUserId(), fullName, email, role));
        }

        rows.sort(Comparator.comparing(ReadmeSectionRenderer.MemberRow::role).thenComparing(ReadmeSectionRenderer.MemberRow::fullName));
        return rows;
    }

    private List<ReadmeSectionRenderer.PhaseRow> buildPhaseRows(Project project,
                                                                TemplateStructureService.NormalizedTemplateStructure structure) {
        LocalDate cursor = project.getStartDate() != null ? project.getStartDate() : LocalDate.now();
        List<TemplateStructureService.PhaseSpec> sorted = structure.phases().stream()
            .sorted(Comparator.comparingInt(TemplateStructureService.PhaseSpec::order))
            .toList();

        List<ReadmeSectionRenderer.PhaseRow> rows = new ArrayList<>();
        for (TemplateStructureService.PhaseSpec phase : sorted) {
            int durationDays = Math.max(1, phase.durationDays());
            LocalDate start = cursor;
            LocalDate end = cursor.plusDays(durationDays - 1L);
            rows.add(new ReadmeSectionRenderer.PhaseRow(
                phase.key(),
                phase.name(),
                durationDays,
                phase.order(),
                phase.enabled(),
                start,
                end
            ));
            if (phase.enabled()) {
                cursor = end.plusDays(1);
            }
        }
        return rows;
    }

    private List<ReadmeSectionRenderer.MilestoneRow> buildMilestoneRows(Project project,
                                                                        TemplateStructureService.NormalizedTemplateStructure structure,
                                                                        List<Milestone> liveMilestones) {
        if (liveMilestones != null && !liveMilestones.isEmpty()) {
            return liveMilestones.stream()
                .map(milestone -> new ReadmeSectionRenderer.MilestoneRow(
                    "m-" + milestone.getId(),
                    safe(milestone.getName(), "Milestone " + milestone.getId()),
                    milestone.getStatus() == null ? "pending" : milestone.getStatus().name(),
                    milestone.getCompletionPct() == null ? 0f : milestone.getCompletionPct(),
                    milestone.getDueDate(),
                    true
                ))
                .sorted(Comparator.comparing(ReadmeSectionRenderer.MilestoneRow::dueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        }

        LocalDate baseDate = project.getStartDate() != null ? project.getStartDate() : LocalDate.now();
        return structure.milestones().stream()
            .map(milestone -> new ReadmeSectionRenderer.MilestoneRow(
                milestone.key(),
                milestone.name(),
                milestone.status(),
                milestone.completionPct(),
                baseDate.plusDays(Math.max(0, milestone.offsetDays())),
                milestone.enabled()
            ))
            .toList();
    }

    private List<ReadmeSectionRenderer.TaskRow> buildTaskRows(Project project,
                                                              TemplateStructureService.NormalizedTemplateStructure structure,
                                                              List<Task> liveTasks) {
        if (liveTasks != null && !liveTasks.isEmpty()) {
            return liveTasks.stream()
                .map(task -> new ReadmeSectionRenderer.TaskRow(
                    "t-" + task.getId(),
                    safe(task.getTitle(), "Task " + task.getId()),
                    task.getStatus() == null ? "todo" : task.getStatus().name(),
                    task.getPriority() == null ? "medium" : task.getPriority().name(),
                    task.getEstimatedHours(),
                    task.getDueDate(),
                    true
                ))
                .toList();
        }

        LocalDate baseDate = project.getStartDate() != null ? project.getStartDate() : LocalDate.now();
        return structure.tasks().stream()
            .map(task -> {
                Integer dueOffset = task.dueOffsetDays();
                LocalDate dueDate = dueOffset == null ? null : baseDate.plusDays(Math.max(0, dueOffset));
                return new ReadmeSectionRenderer.TaskRow(
                    task.key(),
                    task.title(),
                    task.status(),
                    task.priority(),
                    task.estimatedHours(),
                    dueDate,
                    task.enabled()
                );
            })
            .toList();
    }

    private TemplateStructureService.NormalizedTemplateStructure parseStructure(Project project,
                                                                                Optional<ProjectTemplate> template) {
        String phasesJson = firstNonBlank(
            project.getPhasesJson(),
            template.map(ProjectTemplate::getDefaultPhasesJson).orElse(null)
        );
        String milestonesJson = template.map(ProjectTemplate::getDefaultMilestonesJson).orElse(null);
        String tasksJson = template.map(ProjectTemplate::getDefaultTasksJson).orElse(null);

        try {
            return templateStructureService.normalizeTemplateStructure(
                phasesJson,
                milestonesJson,
                tasksJson,
                "README generation"
            );
        } catch (Module2Exception ex) {
            return new TemplateStructureService.NormalizedTemplateStructure(
                null,
                null,
                null,
                List.of(),
                List.of(),
                List.of()
            );
        }
    }

    private Instant computeLastModified(Project project,
                                        ProjectTemplate template,
                                        List<Task> liveTasks,
                                        List<Milestone> liveMilestones) {
        Instant latest = project.getUpdatedAt() != null
            ? project.getUpdatedAt()
            : project.getCreatedAt();

        if (latest == null) {
            latest = Instant.now();
        }

        if (template != null && template.getUpdatedAt() != null && template.getUpdatedAt().isAfter(latest)) {
            latest = template.getUpdatedAt();
        }

        for (Task task : liveTasks) {
            Instant candidate = toInstant(task.getUpdatedAt());
            if (candidate == null) {
                candidate = toInstant(task.getCreatedAt());
            }
            if (candidate != null && candidate.isAfter(latest)) {
                latest = candidate;
            }
        }

        for (Milestone milestone : liveMilestones) {
            Instant candidate = toInstant(milestone.getUpdatedAt());
            if (candidate == null) {
                candidate = toInstant(milestone.getCreatedAt());
            }
            if (candidate != null && candidate.isAfter(latest)) {
                latest = candidate;
            }
        }

        return latest != null ? latest : Instant.now();
    }

    private Instant toInstant(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneId.systemDefault()).toInstant();
    }

    private String normalizeMode(String requestedMode) {
        if (requestedMode == null) {
            return "fast";
        }
        String normalized = requestedMode.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("enhanced") ? "enhanced" : "fast";
    }

    private boolean isDoneStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return normalized.equals("DONE") || normalized.equals("COMPLETED") || normalized.equals("RESOLVED");
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    private String safe(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
