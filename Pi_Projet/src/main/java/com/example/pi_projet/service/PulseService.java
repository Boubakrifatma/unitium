package com.example.pi_projet.service;

import com.example.pi_projet.entity.Project;
import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.port.TaskDataPort;
import com.example.pi_projet.port.WorkloadDataPort;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.ProjectRepository;
import com.example.pi_projet.repository.WorkspaceMemberRepository;
import com.example.pi_projet.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PulseService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskDataPort taskDataPort;
    private final WorkloadDataPort workloadDataPort;

    public Map<String, Object> buildSnapshot(UUID workspaceId) {
        var workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND,
                "Workspace not found: " + workspaceId));

        List<String> warnings = new ArrayList<>();

        long totalProjects = projectRepository.countByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        long memberCount   = workspaceMemberRepository.countByWorkspaceIdAndDeletedAtIsNull(workspaceId);

        var openTasks = taskDataPort.getOpenTasksByWorkspace(workspaceId);
        if (openTasks.isEmpty()) warnings.add("Task data unavailable — open task count shows 0");

        var workloads = workloadDataPort.getLatestWorkloadByWorkspace(workspaceId);
        if (workloads.isEmpty()) warnings.add("Workload snapshots not yet populated — member load shows estimated values");

        List<WorkspaceMember> members = workspaceMemberRepository.findAllByWorkspaceId(workspaceId);
        Map<Long, String> displayNames = members.stream()
            .filter(m -> m.getDeletedAt() == null)
            .collect(Collectors.toMap(WorkspaceMember::getUserId, m -> "User-" + m.getUserId(), (a, b) -> a));

        List<Map<String, Object>> memberWorkloads = buildMemberWorkloads(workloads, displayNames);
        int overloadedCount = (int) memberWorkloads.stream()
            .filter(m -> (int) m.get("loadPercentage") > 85).count();

        List<Project> projects = projectRepository.findAllByWorkspaceIdAndDeletedAtIsNull(workspaceId);
        double onTrackPct = 0.0;
        if (!projects.isEmpty()) {
            long onTrack = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.ACTIVE
                          || p.getStatus() == Project.ProjectStatus.COMPLETED)
                .count();
            onTrackPct = (double) onTrack / projects.size() * 100.0;
        }

        List<Map<String, Object>> throughputs = projects.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("projectId", p.getId());
            m.put("name", p.getName());
            m.put("last10DayCompletions", Collections.nCopies(10, 0));
            return m;
        }).toList();

        List<Object[]> rawEdges = projectMemberRepository.findCollaborationEdgesRaw(workspaceId);
        List<Map<String, Object>> collaborationEdges = rawEdges.stream().map(row -> {
            Long aId = ((Number) row[0]).longValue();
            Long bId = ((Number) row[1]).longValue();
            long cnt = ((Number) row[2]).longValue();
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("memberAId", aId);
            e.put("nameA", displayNames.getOrDefault(aId, "User-" + aId));
            e.put("memberBId", bId);
            e.put("nameB", displayNames.getOrDefault(bId, "User-" + bId));
            e.put("sharedProjectCount", cnt);
            return e;
        }).toList();

        List<String> projectNames = projects.stream().map(Project::getName).toList();
        int[][] scores = buildHealthScores(projects);

        Map<String, Object> healthMatrix = new LinkedHashMap<>();
        healthMatrix.put("projectNames", projectNames);
        healthMatrix.put("scores", scores);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("workspaceName", workspace.getName());
        result.put("totalProjects", totalProjects);
        result.put("openTaskCount", openTasks.size());
        result.put("memberCount", memberCount);
        result.put("onTrackPercentage", Math.round(onTrackPct * 10.0) / 10.0);
        result.put("overloadedMemberCount", overloadedCount);
        result.put("memberWorkloads", memberWorkloads);
        result.put("projectThroughputs", throughputs);
        result.put("collaborationEdges", collaborationEdges);
        result.put("healthMatrix", healthMatrix);
        result.put("dataWarnings", warnings);
        return result;
    }

    public List<Map<String, Object>> buildHeatmap(UUID workspaceId, int weeks) {
        var completions = taskDataPort.getCompletionsByDay(workspaceId, weeks);
        if (!completions.isEmpty()) {
            return completions.stream()
                .sorted(Comparator.comparing(TaskDataPort.DailyCompletionCount::date))
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", c.date().toString());
                    m.put("completions", c.completions());
                    m.put("overdueCount", c.overdueCount());
                    return m;
                }).toList();
        }
        List<Map<String, Object>> empty = new ArrayList<>();
        LocalDate start = LocalDate.now().minusWeeks(weeks);
        for (int i = 0; i < weeks * 7; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", start.plusDays(i).toString());
            m.put("completions", 0);
            m.put("overdueCount", 0);
            empty.add(m);
        }
        return empty;
    }

    private List<Map<String, Object>> buildMemberWorkloads(
            List<WorkloadDataPort.MemberLoadSummary> workloads,
            Map<Long, String> displayNames) {
        if (workloads.isEmpty()) {
            return displayNames.entrySet().stream().map(e -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("memberId", e.getKey());
                m.put("displayName", e.getValue());
                m.put("loadPercentage", 50);
                return m;
            }).toList();
        }
        return workloads.stream().map(w -> {
            long id = w.memberId().getMostSignificantBits() ^ w.memberId().getLeastSignificantBits();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("memberId", id);
            m.put("displayName", displayNames.getOrDefault(id, "Unknown"));
            m.put("loadPercentage", w.loadPercentage());
            return m;
        }).toList();
    }

    private int[][] buildHealthScores(List<Project> projects) {
        int[][] scores = new int[projects.size()][4];
        for (int i = 0; i < projects.size(); i++) {
            Project p = projects.get(i);
            scores[i][0] = switch (p.getStatus()) {
                case COMPLETED, ARCHIVED -> 100;
                case ACTIVE   -> 60;
                case PLANNING -> 20;
                case ON_HOLD  -> 30;
                case CANCELLED -> 0;
            };
            long daysSince = ChronoUnit.DAYS.between(p.getCreatedAt(), java.time.Instant.now());
            scores[i][1] = (int) Math.max(0, 100 - daysSince);
            long projMembers = projectMemberRepository.findAllByProjectId(p.getId()).stream()
                .filter(pm -> pm.getDeletedAt() == null).count();
            scores[i][2] = (int) Math.min(100, projMembers * 20);
            scores[i][3] = 100 - scores[i][0];
        }
        return scores;
    }
}
