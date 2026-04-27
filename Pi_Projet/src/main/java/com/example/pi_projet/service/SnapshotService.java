package com.example.pi_projet.service;

import com.example.pi_projet.exception.Module2Exception;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class SnapshotService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> buildSnapshot(UUID workspaceId, Instant at) {
        Timestamp ts = Timestamp.from(at);
        String workspaceKey = workspaceId.toString();

        try {
            Map<String, String> workspaceMetadata = readWorkspaceMetadata(workspaceKey);
            if (workspaceMetadata == null) {
                throw new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, "Workspace not found: " + workspaceId);
            }

            String workspaceName = workspaceMetadata.get("name");
            String workspaceCreatedAt = workspaceMetadata.get("createdAt");

            List<Map<String, Object>> timelineCheckpoints = buildTimelineCheckpoints(workspaceKey);
            LinkedHashSet<String> suggestedDatesSet = new LinkedHashSet<>(buildSuggestedDates(timelineCheckpoints, workspaceCreatedAt));
            suggestedDatesSet.add(toEndOfDayIso(at));
            List<String> suggestedDates = new ArrayList<>(suggestedDatesSet);

            String memberRoleColumn = columnExists("workspace_members", "workspace_role") ? "workspace_role" : "role";

            // Query historical state at the specified timestamp
            Integer totalProjects = queryInt("SELECT COUNT(*) FROM projects WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?)", workspaceKey, ts, ts);
            Integer memberCount = queryInt("SELECT COUNT(*) FROM workspace_members WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND (joined_at IS NULL OR joined_at <= ?) AND (deleted_at IS NULL OR deleted_at > ?)", workspaceKey, ts, ts);

            // Projects with enhanced data
            List<Map<String, Object>> projects = queryProjects(workspaceKey, ts);

            // Members with enhanced data
            List<Map<String, Object>> members = queryMembers(workspaceKey, ts, memberRoleColumn);

            // Empty state check
            if (totalProjects == null || totalProjects == 0) {
                return buildEmptySnapshot(workspaceId, workspaceName, workspaceCreatedAt, at, timelineCheckpoints, suggestedDates);
            }

            // Build complete response with UI-friendly data
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("workspaceId", workspaceId.toString());
            result.put("workspaceName", workspaceName);
            result.put("workspaceCreatedAt", workspaceCreatedAt);
            result.put("asOf", at.toString());
            result.put("totalProjects", totalProjects == null ? 0 : totalProjects);
            result.put("memberCount", memberCount == null ? 0 : memberCount);

            // Mock pulse data based on historical state (shows what existed at that time)
            result.put("openTaskCount", 0);
            result.put("onTrackPercentage", calculateOnTrackPercentage(projects));
            result.put("overloadedMemberCount", 0);
            result.put("memberWorkloads", buildMemberWorkloads(members));
            result.put("projectThroughputs", Collections.emptyList()); // No historical task data
            result.put("collaborationEdges", Collections.emptyList()); // No historical collaboration data
            result.put("healthMatrix", buildHealthMatrix(projects));
            result.put("taskIntelligence", buildTaskIntelligence());
            result.put("milestoneTimeline", buildMilestoneTimeline());
            result.put("threeSignals", buildThreeSignals(projects));

            // Historical fields
            result.put("projects", projects);
            result.put("members", members);
            result.put("timelineCheckpoints", timelineCheckpoints);
            result.put("suggestedDates", suggestedDates);
            result.put("workspaceUnavailable", false);

            List<String> warnings = new ArrayList<>();
            warnings.add("Viewing historical snapshot from " + toReadableDate(at) + ". Live metrics are not available for past states.");
            result.put("dataWarnings", warnings);
            return result;

        } catch (Module2Exception ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[SnapshotService] Snapshot build failed for workspace {} at {}: {}", workspaceKey, at, ex.getMessage(), ex);
            return buildDegradedSnapshot(workspaceId, at, workspaceKey);
        }
    }

    private Map<String, Object> buildEmptySnapshot(UUID workspaceId, String workspaceName, String workspaceCreatedAt, Instant at, List<Map<String, Object>> timelineCheckpoints, List<String> suggestedDates) {
        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("workspaceId", workspaceId.toString());
        empty.put("workspaceName", workspaceName);
        empty.put("workspaceCreatedAt", workspaceCreatedAt);
        empty.put("asOf", at.toString());
        empty.put("totalProjects", 0);
        empty.put("memberCount", 0);
        empty.put("openTaskCount", 0);
        empty.put("onTrackPercentage", 0.0);
        empty.put("overloadedMemberCount", 0);
        empty.put("memberWorkloads", Collections.emptyList());
        empty.put("projectThroughputs", Collections.emptyList());
        empty.put("collaborationEdges", Collections.emptyList());
        empty.put("healthMatrix", Map.of("projectNames", Collections.emptyList(), "scores", Collections.emptyList()));
        empty.put("projects", Collections.emptyList());
        empty.put("members", Collections.emptyList());
        empty.put("timelineCheckpoints", timelineCheckpoints);
        empty.put("suggestedDates", suggestedDates);
        empty.put("workspaceUnavailable", true);
        List<String> warnings = new ArrayList<>();
        warnings.add("No projects existed at the selected date (" + toReadableDate(at) + ").");
        empty.put("dataWarnings", warnings);
        return empty;
    }

    private Integer queryInt(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, args, Integer.class);
    }

    private List<Map<String, Object>> queryProjects(String workspaceKey, Timestamp ts) {
        String sql = "SELECT id, name, status, visibility, created_at FROM projects WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?) ORDER BY created_at";
        return jdbcTemplate.query(sql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", uuidToString(rs.getObject("id")));
            m.put("name", rs.getString("name"));
            m.put("status", rs.getString("status"));
            m.put("visibility", rs.getString("visibility"));
            Timestamp created = rs.getTimestamp("created_at");
            m.put("createdAt", created != null ? created.toInstant().toString() : null);
            m.put("projectId", uuidToString(rs.getObject("id")));
            return m;
        });
    }

    private List<Map<String, Object>> queryMembers(String workspaceKey, Timestamp ts, String memberRoleColumn) {
        String sql = "SELECT wm.id, wm.user_id, wm." + memberRoleColumn + " AS workspace_role, wm.joined_at, u.full_name, u.email FROM workspace_members wm LEFT JOIN users u ON (u.id = wm.user_id OR CAST(u.id AS CHAR) = CAST(wm.user_id AS CHAR)) WHERE wm.workspace_id = UNHEX(REPLACE(?, '-', '')) AND (wm.joined_at IS NULL OR wm.joined_at <= ?) AND (wm.deleted_at IS NULL OR wm.deleted_at > ?) ORDER BY wm.joined_at";
        return jdbcTemplate.query(sql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("memberId", queryMemberId(workspaceKey, uuidToString(rs.getObject("user_id"))));
            m.put("displayName", rs.getString("full_name"));
            m.put("email", rs.getString("email"));
            m.put("loadPercentage", 0);
            return m;
        });
    }

    private Long queryMemberId(String workspaceKey, String userId) {
        try {
            return jdbcTemplate.queryForObject("SELECT id FROM users WHERE id = ? OR id = UNHEX(REPLACE(?, '-', ''))", new Object[]{userId, userId}, Long.class);
        } catch (Exception e) {
            return null;
        }
    }

    private double calculateOnTrackPercentage(List<Map<String, Object>> projects) {
        if (projects.isEmpty()) return 0.0;
        long onTrack = projects.stream()
            .filter(p -> {
                String status = (String) p.get("status");
                return "ACTIVE".equals(status) || "COMPLETED".equals(status);
            }).count();
        return Math.round((double) onTrack / projects.size() * 1000) / 10.0;
    }

    private List<Map<String, Object>> buildMemberWorkloads(List<Map<String, Object>> members) {
        return members.stream().limit(10).collect(Collectors.toList());
    }

    private Map<String, Object> buildHealthMatrix(List<Map<String, Object>> projects) {
        Map<String, Object> matrix = new LinkedHashMap<>();
        List<String> projectNames = projects.stream().map(p -> (String) p.get("name")).collect(Collectors.toList());
        matrix.put("projectNames", projectNames);

        int[][] scores = new int[projects.size()][4];
        for (int i = 0; i < projects.size(); i++) {
            String status = (String) projects.get(i).get("status");
            scores[i][0] = "COMPLETED".equals(status) ? 100 : "ACTIVE".equals(status) ? 60 : "PLANNING".equals(status) ? 20 : 30;
            scores[i][1] = 50;
            scores[i][2] = 60;
            scores[i][3] = 100 - scores[i][0];
        }
        matrix.put("scores", scores);
        return matrix;
    }

    private Map<String, Object> buildTaskIntelligence() {
        Map<String, Object> intel = new LinkedHashMap<>();
        intel.put("available", false);
        intel.put("message", "Task data not available for historical snapshots");
        return intel;
    }

    private Map<String, Object> buildMilestoneTimeline() {
        Map<String, Object> timeline = new LinkedHashMap<>();
        timeline.put("available", false);
        timeline.put("items", Collections.emptyList());
        return timeline;
    }

    private Map<String, Object> buildThreeSignals(List<Map<String, Object>> projects) {
        Map<String, Object> signals = new LinkedHashMap<>();
        signals.put("available", !projects.isEmpty());
        signals.put("projectCity", projects);
        signals.put("milestoneOrbit", Collections.emptyList());
        return signals;
    }

    private String toReadableDate(Instant instant) {
        return instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString();
    }

    private Map<String, Object> buildDegradedSnapshot(UUID workspaceId, Instant at, String workspaceKey) {
        Map<String, String> workspaceMetadata = null;
        try {
            workspaceMetadata = readWorkspaceMetadata(workspaceKey);
        } catch (Exception ex) {
            log.warn("[SnapshotService] Unable to read workspace metadata during fallback for workspace {}: {}", workspaceKey, ex.getMessage());
        }

        String workspaceName = workspaceMetadata == null ? null : workspaceMetadata.get("name");
        String workspaceCreatedAt = workspaceMetadata == null ? null : workspaceMetadata.get("createdAt");

        List<Map<String, Object>> timelineCheckpoints;
        try {
            timelineCheckpoints = buildTimelineCheckpoints(workspaceKey);
        } catch (Exception ex) {
            log.warn("[SnapshotService] Unable to build timeline during fallback for workspace {}: {}", workspaceKey, ex.getMessage());
            timelineCheckpoints = Collections.emptyList();
        }
        LinkedHashSet<String> suggestedDatesSet = new LinkedHashSet<>(buildSuggestedDates(timelineCheckpoints, workspaceCreatedAt));
        suggestedDatesSet.add(toEndOfDayIso(at));
        List<String> suggestedDates = new ArrayList<>(suggestedDatesSet);

        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("workspaceId", workspaceId.toString());
        fallback.put("workspaceName", workspaceName);
        fallback.put("workspaceCreatedAt", workspaceCreatedAt);
        fallback.put("asOf", at.toString());
        fallback.put("totalProjects", 0);
        fallback.put("memberCount", 0);
        fallback.put("projects", Collections.emptyList());
        fallback.put("members", Collections.emptyList());
        fallback.put("timelineCheckpoints", timelineCheckpoints);
        fallback.put("suggestedDates", suggestedDates);
        fallback.put("workspaceUnavailable", true);

        List<String> warnings = new ArrayList<>();
        warnings.add("Snapshot data is partially unavailable. Showing fallback historical state.");
        warnings.add("Open task and workload metrics are not available for historical snapshots.");
        fallback.put("dataWarnings", warnings);
        return fallback;
    }

    private Map<String, String> readWorkspaceMetadata(String workspaceKey) {
        String sql = "SELECT name, created_at FROM workspaces WHERE (id = ? OR id = UNHEX(REPLACE(?, '-', '')))";
        List<Map<String, String>> rows = jdbcTemplate.query(sql, new Object[]{workspaceKey, workspaceKey}, (rs, rowNum) -> {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("name", rs.getString("name"));
            Timestamp created = rs.getTimestamp("created_at");
            row.put("createdAt", created != null ? created.toInstant().toString() : null);
            return row;
        });
        return rows.isEmpty() ? null : rows.get(0);
    }

    private List<Map<String, Object>> buildTimelineCheckpoints(String workspaceKey) {
        String timelineSql = "SELECT event_at, event_type, label FROM (" +
            " SELECT wm.joined_at AS event_at, 'MEMBER_JOINED' AS event_type, 'Member joined' AS label" +
            "   FROM workspace_members wm" +
            "  WHERE wm.workspace_id = UNHEX(REPLACE(?, '-', '')) AND wm.joined_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT wm.deleted_at AS event_at, 'MEMBER_LEFT' AS event_type, 'Member left' AS label" +
            "   FROM workspace_members wm" +
            "  WHERE wm.workspace_id = UNHEX(REPLACE(?, '-', '')) AND wm.deleted_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT p.created_at AS event_at, 'PROJECT_CREATED' AS event_type, 'Project created' AS label" +
            "   FROM projects p" +
            "  WHERE p.workspace_id = UNHEX(REPLACE(?, '-', '')) AND p.created_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT p.deleted_at AS event_at, 'PROJECT_REMOVED' AS event_type, 'Project removed' AS label" +
            "   FROM projects p" +
            "  WHERE p.workspace_id = UNHEX(REPLACE(?, '-', '')) AND p.deleted_at IS NOT NULL" +
            ") events WHERE event_at IS NOT NULL ORDER BY event_at LIMIT 40";

        Object[] args = new Object[] {
            workspaceKey,
            workspaceKey,
            workspaceKey,
            workspaceKey
        };

        try {
            return mapTimelineEvents(timelineSql, args);
        } catch (Exception ex) {
            log.warn("[SnapshotService] Timeline query failed for workspace {}: {}", workspaceKey, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> mapTimelineEvents(String sql, Object[] args) {
        return jdbcTemplate.query(sql, args, (rs, rowNum) -> {
            Timestamp eventAt = rs.getTimestamp("event_at");
            Instant instant = eventAt == null ? null : eventAt.toInstant();
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventAt", instant == null ? null : instant.toString());
            event.put("at", instant == null ? null : toEndOfDayIso(instant));
            event.put("kind", rs.getString("event_type"));
            event.put("label", rs.getString("label"));
            return event;
        });
    }

    private List<String> buildSuggestedDates(List<Map<String, Object>> checkpoints, String workspaceCreatedAt) {
        LinkedHashSet<String> uniqueDates = new LinkedHashSet<>();

        if (workspaceCreatedAt != null) {
            try {
                Instant createdAt = Instant.parse(workspaceCreatedAt);
                String beforeLaunch = createdAt.atZone(java.time.ZoneOffset.UTC)
                    .toLocalDate()
                    .minusDays(1)
                    .atTime(23, 59, 59)
                    .toInstant(java.time.ZoneOffset.UTC)
                    .toString();
                uniqueDates.add(beforeLaunch);
            } catch (RuntimeException ignored) {
                // ignore malformed values in legacy datasets
            }
        }

        for (Map<String, Object> checkpoint : checkpoints) {
            Object at = checkpoint.get("at");
            if (at != null) {
                uniqueDates.add(String.valueOf(at));
            }
        }

        List<String> all = new ArrayList<>(uniqueDates);
        if (all.size() <= 6) {
            return all;
        }

        List<String> picks = new ArrayList<>();
        picks.add(all.get(0));
        picks.add(all.get(Math.max(1, all.size() / 4)));
        picks.add(all.get(Math.max(2, all.size() / 2)));
        picks.add(all.get(Math.max(3, (all.size() * 3) / 4)));
        picks.add(all.get(all.size() - 2));
        picks.add(all.get(all.size() - 1));

        return new ArrayList<>(new LinkedHashSet<>(picks));
    }

    private String toEndOfDayIso(Instant instant) {
        return instant.atZone(java.time.ZoneOffset.UTC)
            .toLocalDate()
            .atTime(23, 59, 59)
            .toInstant(java.time.ZoneOffset.UTC)
            .toString();
    }

    private boolean columnExists(String tableName, String columnName) {
        String sql = "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        Integer count = jdbcTemplate.queryForObject(sql, new Object[]{tableName, columnName}, Integer.class);
        return count != null && count > 0;
    }

    private String uuidToString(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof UUID uuid) {
            return uuid.toString();
        }
        if (raw instanceof byte[] bytes) {
            if (bytes.length == 16) {
                ByteBuffer bb = ByteBuffer.wrap(bytes);
                long high = bb.getLong();
                long low = bb.getLong();
                return new UUID(high, low).toString();
            }
            return new String(bytes);
        }
        return String.valueOf(raw);
    }
}
