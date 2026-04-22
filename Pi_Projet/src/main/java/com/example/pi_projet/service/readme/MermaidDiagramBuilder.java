package com.example.pi_projet.service.readme;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MermaidDiagramBuilder {

    public record PhaseTimeline(String name, LocalDate startDate, LocalDate endDate, boolean enabled) {}

    public record MilestoneTimeline(String name, LocalDate dueDate, String status, boolean enabled) {}

    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ReadmeSanitizer sanitizer;

    public String buildRoadmapSection(List<PhaseTimeline> phases, List<MilestoneTimeline> milestones) {
        List<PhaseTimeline> safePhases = new ArrayList<>();
        for (PhaseTimeline phase : phases) {
            if (phase == null || !phase.enabled() || phase.startDate() == null || phase.endDate() == null) {
                continue;
            }
            if (phase.endDate().isBefore(phase.startDate())) {
                continue;
            }
            if (safePhases.size() >= 24) {
                break;
            }
            safePhases.add(phase);
        }

        List<MilestoneTimeline> safeMilestones = new ArrayList<>();
        for (MilestoneTimeline milestone : milestones) {
            if (milestone == null || !milestone.enabled() || milestone.dueDate() == null) {
                continue;
            }
            if (safeMilestones.size() >= 50) {
                break;
            }
            safeMilestones.add(milestone);
        }

        if (safePhases.isEmpty() && safeMilestones.isEmpty()) {
            return "";
        }

        StringBuilder out = new StringBuilder();
        out.append("## Roadmap\n\n");

        out.append("```mermaid\n");
        out.append("gantt\n");
        out.append("    title Project Timeline\n");
        out.append("    dateFormat  YYYY-MM-DD\n");
        out.append("    axisFormat  %b %d\n");

        int phaseIndex = 1;
        for (PhaseTimeline phase : safePhases) {
            String label = sanitizer.sanitizeMermaidLabel(phase.name());
            long duration = ChronoUnit.DAYS.between(phase.startDate(), phase.endDate()) + 1;
            if (duration < 1) {
                duration = 1;
            }
            out.append("    section ").append(label).append("\n");
            out.append("    ")
                .append(label)
                .append(" :p")
                .append(phaseIndex++)
                .append(", ")
                .append(DATE.format(phase.startDate()))
                .append(", ")
                .append(duration)
                .append("d\n");
        }

        if (!safeMilestones.isEmpty()) {
            out.append("    section Milestones\n");
            int milestoneIndex = 1;
            for (MilestoneTimeline milestone : safeMilestones) {
                String label = sanitizer.sanitizeMermaidLabel(milestone.name());
                out.append("    ")
                    .append(label)
                    .append(" :milestone, m")
                    .append(milestoneIndex++)
                    .append(", ")
                    .append(DATE.format(milestone.dueDate()))
                    .append(", 0d\n");
            }
        }
        out.append("```\n\n");

        if (safePhases.size() > 1) {
            out.append("```mermaid\n");
            out.append("flowchart LR\n");
            for (int i = 0; i < safePhases.size(); i++) {
                String nodeId = "P" + (i + 1);
                String label = sanitizer.sanitizeMermaidLabel(safePhases.get(i).name());
                out.append("    ").append(nodeId).append("[\"").append(label).append("\"]\n");
            }
            for (int i = 0; i < safePhases.size() - 1; i++) {
                out.append("    P").append(i + 1).append(" --> P").append(i + 2).append("\n");
            }
            out.append("```\n\n");
        }

        return out.toString();
    }
}
