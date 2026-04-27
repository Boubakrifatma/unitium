package com.example.pi_projet.service.readme;

import com.example.pi_projet.entity.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ReadmeSectionRenderer {

    public record MemberRow(Long userId, String fullName, String email, String role) {}

    public record PhaseRow(String key,
                           String name,
                           int durationDays,
                           int order,
                           boolean enabled,
                           LocalDate startDate,
                           LocalDate endDate) {}

    public record MilestoneRow(String key,
                               String name,
                               String status,
                               float completionPct,
                               LocalDate dueDate,
                               boolean enabled) {}

    public record TaskRow(String key,
                          String title,
                          String status,
                          String priority,
                          Float estimatedHours,
                          LocalDate dueDate,
                          boolean enabled) {}

    private static final DateTimeFormatter PRETTY_DATE = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH);

    private final ReadmeSanitizer sanitizer;
    private final ShieldsBadgeBuilder badgeBuilder;
    private final MermaidDiagramBuilder mermaidDiagramBuilder;

    public String render(Project project,
                         String mode,
                         String templateName,
                         List<MemberRow> members,
                         List<PhaseRow> phases,
                         List<MilestoneRow> milestones,
                         List<TaskRow> tasks,
                         Optional<String> aiSummary) {
        List<TaskRow> enabledTasks = tasks.stream().filter(TaskRow::enabled).toList();
        int totalTasks = enabledTasks.size();
        long doneTasks = enabledTasks.stream().filter(this::isDoneTask).count();
        double completionPct = totalTasks == 0 ? 0.0 : (doneTasks * 100.0) / totalTasks;

        StringBuilder out = new StringBuilder();

        String title = sanitizer.escapeMarkdown(project.getName());
        out.append("# ").append(title).append("\n\n");

        out.append(badgeBuilder.statusBadge(project.getStatus() == null ? "UNKNOWN" : project.getStatus().name())).append(" ")
            .append(badgeBuilder.visibilityBadge(project.getVisibility() == null ? "PRIVATE" : project.getVisibility().name())).append(" ")
            .append(badgeBuilder.membersBadge(members.size())).append(" ")
            .append(badgeBuilder.completionBadge(completionPct))
            .append("\n\n");

        List<String> sectionTitles = new ArrayList<>();
        sectionTitles.add("Overview");
        if (aiSummary.isPresent()) {
            sectionTitles.add("Executive Summary");
        }
        if (!members.isEmpty()) {
            sectionTitles.add("Team");
        }

        String roadmap = buildRoadmap(phases, milestones);
        if (!roadmap.isBlank()) {
            sectionTitles.add("Roadmap");
        }
        if (!milestones.isEmpty()) {
            sectionTitles.add("Milestones");
        }
        if (!enabledTasks.isEmpty()) {
            sectionTitles.add("Task Summary");
        }
        if (templateName != null && !templateName.isBlank()) {
            sectionTitles.add("Template Lineage");
        }

        if (!sectionTitles.isEmpty()) {
            out.append("## Table of Contents\n\n");
            for (String sectionTitle : sectionTitles) {
                out.append("- [")
                    .append(sectionTitle)
                    .append("](#")
                    .append(anchor(sectionTitle))
                    .append(")\n");
            }
            out.append("\n");
        }

        out.append("## Overview\n\n");
        if (project.getDescription() != null && !project.getDescription().isBlank()) {
            out.append(sanitizer.escapeMarkdown(project.getDescription())).append("\n\n");
        }

        out.append("- Status: **")
            .append(sanitizer.escapeMarkdown(project.getStatus() == null ? "Unknown" : project.getStatus().name()))
            .append("**\n");
        out.append("- Visibility: **")
            .append(sanitizer.escapeMarkdown(project.getVisibility() == null ? "PRIVATE" : project.getVisibility().name()))
            .append("**\n");
        out.append("- Start Date: **").append(formatDate(project.getStartDate())).append("**\n");
        out.append("- End Date: **").append(formatDate(project.getEndDate())).append("**\n");
        out.append("- Members: **").append(members.size()).append("**\n");
        out.append("- Tasks Completed: **").append(doneTasks).append(" / ").append(totalTasks).append("**\n\n");

        if (aiSummary.isPresent()) {
            out.append("## Executive Summary\n\n");
            out.append(aiSummary.get().trim()).append("\n\n");
        }

        if (!members.isEmpty()) {
            out.append("## Team\n\n");
            out.append("| Member | Role | Email |\n");
            out.append("| --- | --- | --- |\n");
            members.stream()
                .sorted(Comparator.comparing((MemberRow row) -> roleRank(row.role())).thenComparing(MemberRow::fullName, String.CASE_INSENSITIVE_ORDER))
                .forEach(member -> {
                    out.append("| ")
                        .append(sanitizer.escapeMarkdown(safe(member.fullName())))
                        .append(" | ")
                        .append(sanitizer.escapeMarkdown(safe(member.role())))
                        .append(" | ")
                        .append(sanitizer.escapeMarkdown(safe(member.email())))
                        .append(" |\n");
                });
            out.append("\n");
        }

        if (!roadmap.isBlank()) {
            out.append(roadmap);
        }

        if (!milestones.isEmpty()) {
            out.append("## Milestones\n\n");
            out.append("| Milestone | Status | Completion | Due Date |\n");
            out.append("| --- | --- | --- | --- |\n");
            milestones.stream()
                .filter(MilestoneRow::enabled)
                .sorted(Comparator.comparing(MilestoneRow::dueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(milestone -> {
                    out.append("| ")
                        .append(sanitizer.escapeMarkdown(safe(milestone.name())))
                        .append(" | ")
                        .append(sanitizer.escapeMarkdown(safe(milestone.status())))
                        .append(" | ")
                        .append(Math.round(Math.max(0f, Math.min(100f, milestone.completionPct()))))
                        .append("% | ")
                        .append(formatDate(milestone.dueDate()))
                        .append(" |\n");
                });
            out.append("\n");
        }

        if (!enabledTasks.isEmpty()) {
            out.append("## Task Summary\n\n");
            Map<String, Integer> byStatus = new LinkedHashMap<>();
            for (TaskRow task : enabledTasks) {
                String key = safe(task.status()).toUpperCase(Locale.ROOT);
                byStatus.put(key, byStatus.getOrDefault(key, 0) + 1);
            }
            for (Map.Entry<String, Integer> entry : byStatus.entrySet()) {
                out.append("- ")
                    .append(sanitizer.escapeMarkdown(entry.getKey()))
                    .append(": ")
                    .append(entry.getValue())
                    .append("\n");
            }
            out.append("\n");

            out.append("| Task | Status | Priority | Due Date | Est. Hours |\n");
            out.append("| --- | --- | --- | --- | --- |\n");
            List<TaskRow> orderedTasks = enabledTasks.stream()
                .sorted(Comparator.comparing(TaskRow::dueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(TaskRow::title, String.CASE_INSENSITIVE_ORDER))
                .toList();

            int displayLimit = Math.min(50, orderedTasks.size());
            for (int i = 0; i < displayLimit; i++) {
                TaskRow task = orderedTasks.get(i);
                out.append("| ")
                    .append(sanitizer.escapeMarkdown(safe(task.title())))
                    .append(" | ")
                    .append(sanitizer.escapeMarkdown(safe(task.status())))
                    .append(" | ")
                    .append(sanitizer.escapeMarkdown(safe(task.priority())))
                    .append(" | ")
                    .append(formatDate(task.dueDate()))
                    .append(" | ")
                    .append(task.estimatedHours() == null ? "-" : String.format(Locale.ENGLISH, "%.1f", task.estimatedHours()))
                    .append(" |\n");
            }

            if (orderedTasks.size() > displayLimit) {
                out.append("\n")
                    .append("_Showing ")
                    .append(displayLimit)
                    .append(" tasks out of ")
                    .append(orderedTasks.size())
                    .append("._\n");
            }
            out.append("\n");
        }

        if (templateName != null && !templateName.isBlank()) {
            out.append("## Template Lineage\n\n");
            out.append("This project was bootstrapped from template **")
                .append(sanitizer.escapeMarkdown(templateName))
                .append("**.\n\n");
        }

        out.append("---\n");
        out.append("Generated at: ")
            .append(Instant.now())
            .append("  ").append("\n");
        out.append("Generation mode: ")
            .append(sanitizer.escapeMarkdown(mode == null ? "fast" : mode))
            .append("\n");

        return out.toString();
    }

    private String buildRoadmap(List<PhaseRow> phases, List<MilestoneRow> milestones) {
        List<MermaidDiagramBuilder.PhaseTimeline> phaseTimeline = phases.stream()
            .map(phase -> new MermaidDiagramBuilder.PhaseTimeline(
                phase.name(),
                phase.startDate(),
                phase.endDate(),
                phase.enabled()
            ))
            .toList();

        List<MermaidDiagramBuilder.MilestoneTimeline> milestoneTimeline = milestones.stream()
            .map(milestone -> new MermaidDiagramBuilder.MilestoneTimeline(
                milestone.name(),
                milestone.dueDate(),
                milestone.status(),
                milestone.enabled()
            ))
            .toList();

        return mermaidDiagramBuilder.buildRoadmapSection(phaseTimeline, milestoneTimeline);
    }

    private int roleRank(String role) {
        String normalized = safe(role).toUpperCase(Locale.ROOT);
        if (normalized.equals("PROJECT_MANAGER") || normalized.equals("PROFESSOR")) {
            return 0;
        }
        if (normalized.equals("DEVELOPER")) {
            return 1;
        }
        if (normalized.equals("REVIEWER")) {
            return 2;
        }
        return 3;
    }

    private boolean isDoneTask(TaskRow task) {
        String status = safe(task.status()).toUpperCase(Locale.ROOT);
        return status.equals("DONE") || status.equals("COMPLETED") || status.equals("RESOLVED");
    }

    private String formatDate(LocalDate date) {
        return date == null ? "-" : PRETTY_DATE.format(date);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private String anchor(String sectionTitle) {
        return sectionTitle
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s-]", "")
            .trim()
            .replaceAll("\\s+", "-");
    }
}
