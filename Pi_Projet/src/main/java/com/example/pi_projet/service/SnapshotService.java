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
import java.util.*;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class SnapshotService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> buildSnapshot(UUID workspaceId, Instant at) {
        Timestamp ts = Timestamp.from(at);
        String workspaceKey = workspaceId.toString();
        log.info("[SnapshotService] buildSnapshot called for workspace {} at instant {}, timestamp: {}", workspaceKey, at, ts);

        try {
            // Get workspace metadata
            Map<String, String> workspaceMetadata = readWorkspaceMetadata(workspaceKey);
            log.info("[SnapshotService] workspace metadata: {}", workspaceMetadata);
            if (workspaceMetadata == null) {
                throw new Module2Exception(Module2Exception.ErrorCode.NOT_FOUND, "Workspace not found: " + workspaceId);
            }

            String workspaceName = workspaceMetadata.get("name");
            String workspaceCreatedAt = workspaceMetadata.get("createdAt");

            // Build timeline
            List<Map<String, Object>> timelineCheckpoints = buildTimelineCheckpoints(workspaceKey);
            LinkedHashSet<String> suggestedDatesSet = new LinkedHashSet<>(buildSuggestedDates(timelineCheckpoints, workspaceCreatedAt));
            suggestedDatesSet.add(toEndOfDayIso(at));
            List<String> suggestedDates = new ArrayList<>(suggestedDatesSet);

            String memberRoleColumn = columnExists("workspace_members", "workspace_role") ? "workspace_role" : "role";

            // Query counts (UUIDs stored as CHAR, not binary)
            Integer totalProjects = queryInt("SELECT COUNT(*) FROM projects WHERE workspace_id = ? AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?)", workspaceKey, ts, ts);
            Integer memberCount = queryInt("SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ? AND (joined_at IS NULL OR joined_at <= ?) AND (deleted_at IS NULL OR deleted_at > ?)", workspaceKey, ts, ts);
            log.info("[SnapshotService] query results: totalProjects={}, memberCount={}", totalProjects, memberCount);

            // Query projects at this time
            List<Map<String, Object>> projects = queryProjects(workspaceKey, ts);
            log.info("[SnapshotService] found {} projects at {}", projects.size(), ts);

            // Query members at this time
            List<Map<String, Object>> members = queryMembers(workspaceKey, ts, memberRoleColumn);
            log.info("[SnapshotService] found {} members at {}", members.size(), ts);

            // Build response
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("workspaceId", workspaceId.toString());
            result.put("workspaceName", workspaceName);
            result.put("workspaceCreatedAt", workspaceCreatedAt);
            result.put("asOf", at.toString());
            result.put("totalProjects", totalProjects == null ? 0 : totalProjects);
            result.put("memberCount", memberCount == null ? 0 : memberCount);

            // Add historical data
            result.put("projects", projects);
            result.put("members", members);
            result.put("timelineCheckpoints", timelineCheckpoints);
            result.put("suggestedDates", suggestedDates);

            // Add pulse-like fields (empty for historical)
            result.put("openTaskCount", 0);
            result.put("overloadedMemberCount", 0);
            result.put("onTrackPercentage", calculateOnTrack(projects));
            result.put("memberWorkloads", buildMemberWorkloads(members));
            result.put("projectThroughputs", new ArrayList<>());
            result.put("collaborationEdges", new ArrayList<>());
            result.put("healthMatrix", buildHealthMatrix(projects));
            result.put("taskIntelligence", Map.of("available", false));
            result.put("milestoneTimeline", Map.of("available", false, "items", new ArrayList<>()));
            result.put("threeSignals", Map.of("available", false, "projectCity", projects, "milestoneOrbit", new ArrayList<>()));

            result.put("workspaceUnavailable", false);
            List<String> warnings = new ArrayList<>();
            warnings.add("📅 Viewing historical snapshot from " + formatDate(at));
            warnings.add("Live metrics (tasks, collaboration) are not available for past states.");
            result.put("dataWarnings", warnings);
            return result;

        } catch (Module2Exception ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[SnapshotService] Snapshot build failed for workspace {} at {}: {}", workspaceKey, at, ex.getMessage(), ex);
            return buildDegradedSnapshot(workspaceId, at, workspaceKey);
        }
    }

    private Integer queryInt(String sql, Object... args) {
        try {
            return jdbcTemplate.queryForObject(sql, args, Integer.class);
        } catch (Exception ex) {
            return 0;
        }
    }

    private List<Map<String, Object>> queryProjects(String workspaceKey, Timestamp ts) {
        // UUIDs stored as CHAR(36) per Hibernate config, so compare directly as strings
        String sql = "SELECT id, name, status, visibility, created_at FROM projects WHERE workspace_id = ? AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?) ORDER BY created_at DESC";
        try {
            return jdbcTemplate.query(sql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                String id = uuidToString(rs.getObject("id"));
                m.put("id", id);
                m.put("projectId", id);
                m.put("name", rs.getString("name"));
                m.put("status", rs.getString("status"));
                m.put("visibility", rs.getString("visibility"));
                Timestamp created = rs.getTimestamp("created_at");
                m.put("createdAt", created != null ? created.toInstant().toString() : null);
                return m;
            });
        } catch (Exception ex) {
            log.warn("Failed to query projects: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> queryMembers(String workspaceKey, Timestamp ts, String memberRoleColumn) {
        // UUIDs stored as CHAR(36) per Hibernate config, so compare directly as strings
        String sql = "SELECT wm.id, wm.user_id, wm." + memberRoleColumn + " AS workspace_role, wm.joined_at, u.full_name, u.email FROM workspace_members wm LEFT JOIN users u ON (u.id = wm.user_id OR CAST(u.id AS CHAR) = CAST(wm.user_id AS CHAR)) WHERE wm.workspace_id = ? AND (wm.joined_at IS NULL OR wm.joined_at <= ?) AND (wm.deleted_at IS NULL OR wm.deleted_at > ?) ORDER BY wm.joined_at DESC";
        try {
            return jdbcTemplate.query(sql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("memberId", (long) rowNum + 1);
                m.put("displayName", rs.getString("full_name"));
                m.put("email", rs.getString("email"));
                m.put("workspaceRole", rs.getString("workspace_role"));
                m.put("loadPercentage", 0);
                return m;
            });
        } catch (Exception ex) {
            log.warn("Failed to query members: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    private double calculateOnTrack(List<Map<String, Object>> projects) {
        if (projects.isEmpty()) return 0.0;
        long onTrack = projects.stream().filter(p -> {
            String status = (String) p.get("status");
            return "ACTIVE".equals(status) || "COMPLETED".equals(status);
        }).count();
        return Math.round((double) onTrack / projects.size() * 100.0);
    }

    private List<Map<String, Object>> buildMemberWorkloads(List<Map<String, Object>> members) {
        return new ArrayList<>(members);
    }

    private Map<String, Object> buildHealthMatrix(List<Map<String, Object>> projects) {
        Map<String, Object> matrix = new LinkedHashMap<>();
        List<String> names = new ArrayList<>();
        List<int[]> scores = new ArrayList<>();

        for (Map<String, Object> p : projects) {
            names.add((String) p.get("name"));
            String status = (String) p.get("status");
            int progress = "COMPLETED".equals(status) ? 100 : "ACTIVE".equals(status) ? 60 : "PLANNING".equals(status) ? 20 : 30;
            scores.add(new int[]{progress, 50, 60, 100 - progress});
        }

        matrix.put("projectNames", names);
        matrix.put("scores", scores.toArray(new int[0][]));
        return matrix;
    }

    private Map<String, String> readWorkspaceMetadata(String workspaceKey) {
        // UUIDs stored as CHAR(36), no need for UNHEX
        String sql = "SELECT name, created_at FROM workspaces WHERE id = ?";
        List<Map<String, String>> rows = jdbcTemplate.query(sql, new Object[]{workspaceKey}, (rs, rowNum) -> {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("name", rs.getString("name"));
            Timestamp created = rs.getTimestamp("created_at");
            row.put("createdAt", created != null ? created.toInstant().toString() : null);
            return row;
        });
        return rows.isEmpty() ? null : rows.get(0);
    }

    private List<Map<String, Object>> buildTimelineCheckpoints(String workspaceKey) {
        // UUIDs stored as CHAR(36), so use direct string comparison
        String timelineSql = "SELECT event_at, event_type, label FROM (" +
            " SELECT wm.joined_at AS event_at, 'MEMBER_JOINED' AS event_type, CONCAT('Member joined: ', COALESCE(u.full_name, 'User')) AS label FROM workspace_members wm LEFT JOIN users u ON (u.id = wm.user_id OR CAST(u.id AS CHAR) = CAST(wm.user_id AS CHAR)) WHERE wm.workspace_id = ? AND wm.joined_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT wm.deleted_at AS event_at, 'MEMBER_LEFT' AS event_type, 'Member left' AS label FROM workspace_members wm WHERE wm.workspace_id = ? AND wm.deleted_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT p.created_at AS event_at, 'PROJECT_CREATED' AS event_type, CONCAT('Project created: ', p.name) AS label FROM projects p WHERE p.workspace_id = ? AND p.created_at IS NOT NULL" +
            " UNION ALL" +
            " SELECT p.deleted_at AS event_at, 'PROJECT_REMOVED' AS event_type, CONCAT('Project removed: ', p.name) AS label FROM projects p WHERE p.workspace_id = ? AND p.deleted_at IS NOT NULL" +
            ") events WHERE event_at IS NOT NULL ORDER BY event_at DESC LIMIT 40";

        Object[] args = new Object[]{workspaceKey, workspaceKey, workspaceKey, workspaceKey};

        try {
            return jdbcTemplate.query(timelineSql, args, (rs, rowNum) -> {
                Timestamp eventAt = rs.getTimestamp("event_at");
                Instant instant = eventAt == null ? null : eventAt.toInstant();
                Map<String, Object> event = new LinkedHashMap<>();
                event.put("eventAt", instant == null ? null : instant.toString());
                event.put("at", instant == null ? null : toEndOfDayIso(instant));
                event.put("kind", rs.getString("event_type"));
                event.put("label", rs.getString("label"));
                return event;
            });
        } catch (Exception ex) {
            log.warn("Timeline query failed: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }

    private List<String> buildSuggestedDates(List<Map<String, Object>> checkpoints, String workspaceCreatedAt) {
        LinkedHashSet<String> uniqueDates = new LinkedHashSet<>();

        if (workspaceCreatedAt != null) {
            try {
                Instant createdAt = Instant.parse(workspaceCreatedAt);
                uniqueDates.add(toEndOfDayIso(createdAt));
            } catch (Exception ignored) {}
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
        return instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate().atTime(23, 59, 59).toInstant(java.time.ZoneId.systemDefault().getRules().getOffset(instant)).toString();
    }

    private String formatDate(Instant instant) {
        return instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString();
    }

    private boolean columnExists(String tableName, String columnName) {
        String sql = "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        try {
            Integer count = jdbcTemplate.queryForObject(sql, new Object[]{tableName, columnName}, Integer.class);
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
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

    private Map<String, Object> buildDegradedSnapshot(UUID workspaceId, Instant at, String workspaceKey) {
        Map<String, String> workspaceMetadata = null;
        try {
            workspaceMetadata = readWorkspaceMetadata(workspaceKey);
        } catch (Exception ex) {
            log.warn("Unable to read workspace metadata during fallback: {}", ex.getMessage());
        }

        String workspaceName = workspaceMetadata == null ? null : workspaceMetadata.get("name");
        String workspaceCreatedAt = workspaceMetadata == null ? null : workspaceMetadata.get("createdAt");

        List<Map<String, Object>> timelineCheckpoints;
        try {
            timelineCheckpoints = buildTimelineCheckpoints(workspaceKey);
        } catch (Exception ex) {
            log.warn("Unable to build timeline during fallback: {}", ex.getMessage());
            timelineCheckpoints = new ArrayList<>();
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
        fallback.put("projects", new ArrayList<>());
        fallback.put("members", new ArrayList<>());
        fallback.put("timelineCheckpoints", timelineCheckpoints);
        fallback.put("suggestedDates", suggestedDates);
        fallback.put("workspaceUnavailable", true);

        List<String> warnings = new ArrayList<>();
        warnings.add("⚠️ Unable to load snapshot data. Showing partial historical state.");
        warnings.add("Live metrics are not available for this time period.");
        fallback.put("dataWarnings", warnings);
        return fallback;
    }
}
