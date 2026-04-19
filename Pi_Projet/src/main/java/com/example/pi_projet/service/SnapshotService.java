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

        try {

        // Workspace visible at requested time
        String wsSql = "SELECT id, name, created_at FROM workspaces WHERE (id = ? OR id = UNHEX(REPLACE(?, '-', ''))) AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?)";
        List<Map<String, String>> wsRows = jdbcTemplate.query(wsSql, new Object[]{workspaceKey, workspaceKey, ts, ts}, (rs, rowNum) -> {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("name", rs.getString("name"));
            Timestamp created = rs.getTimestamp("created_at");
            row.put("createdAt", created != null ? created.toInstant().toString() : null);
            return row;
        });

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

        if (wsRows.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("workspaceId", workspaceId.toString());
            empty.put("workspaceName", workspaceName);
            empty.put("workspaceCreatedAt", workspaceCreatedAt);
            empty.put("asOf", at.toString());
            empty.put("totalProjects", 0);
            empty.put("memberCount", 0);
            empty.put("projects", Collections.emptyList());
            empty.put("members", Collections.emptyList());
            empty.put("timelineCheckpoints", timelineCheckpoints);
            empty.put("suggestedDates", suggestedDates);
            empty.put("workspaceUnavailable", true);

            List<String> warnings = new ArrayList<>();
            warnings.add("Workspace is not active at the selected date. Showing empty historical state.");
            warnings.add("Open task and workload metrics are not available for historical snapshots.");
            empty.put("dataWarnings", warnings);
            return empty;
        }

        String memberRoleColumn = columnExists("workspace_members", "workspace_role") ? "workspace_role" : "role";

        // Counts
        String countProjectsSql = "SELECT COUNT(*) FROM projects WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?)";
        Integer totalProjects = jdbcTemplate.queryForObject(countProjectsSql, new Object[]{workspaceKey, ts, ts}, Integer.class);

        String membersCountSql = "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND (joined_at IS NULL OR joined_at <= ?) AND (deleted_at IS NULL OR deleted_at > ?)";
        Integer memberCount = jdbcTemplate.queryForObject(membersCountSql, new Object[]{workspaceKey, ts, ts}, Integer.class);

        // Projects list (basic fields)
        String projectsSql = "SELECT id, name, status, visibility, created_at FROM projects WHERE workspace_id = UNHEX(REPLACE(?, '-', '')) AND created_at <= ? AND (deleted_at IS NULL OR deleted_at > ?) ORDER BY created_at";
        List<Map<String, Object>> projects = jdbcTemplate.query(projectsSql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            Object idObj = rs.getObject("id");
            m.put("id", uuidToString(idObj));
            m.put("name", rs.getString("name"));
            m.put("status", rs.getString("status"));
            m.put("visibility", rs.getString("visibility"));
            Timestamp created = rs.getTimestamp("created_at");
            m.put("createdAt", created != null ? created.toInstant().toString() : null);
            return m;
        });

        // Members list (basic fields + identity)
        String membersSql = "SELECT wm.id, " +
            "CASE WHEN OCTET_LENGTH(wm.user_id) = 16 THEN BIN_TO_UUID(wm.user_id) ELSE CAST(wm.user_id AS CHAR) END AS user_id_label, " +
            "wm." + memberRoleColumn + " AS workspace_role, wm.joined_at, u.full_name, u.email, u.avatar_url " +
            "FROM workspace_members wm " +
            "LEFT JOIN users u ON CAST(u.id AS CHAR) = " +
            "CASE WHEN OCTET_LENGTH(wm.user_id) = 16 THEN BIN_TO_UUID(wm.user_id) ELSE CAST(wm.user_id AS CHAR) END " +
            "WHERE wm.workspace_id = UNHEX(REPLACE(?, '-', '')) AND (wm.joined_at IS NULL OR wm.joined_at <= ?) AND (wm.deleted_at IS NULL OR wm.deleted_at > ?) " +
            "ORDER BY wm.joined_at";
        List<Map<String, Object>> members = jdbcTemplate.query(membersSql, new Object[]{workspaceKey, ts, ts}, (rs, rowNum) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            Object idObj = rs.getObject("id");
            m.put("id", uuidToString(idObj));
            m.put("userId", rs.getString("user_id_label"));
            m.put("workspaceRole", rs.getString("workspace_role"));
            m.put("fullName", rs.getString("full_name"));
            m.put("email", rs.getString("email"));
            m.put("avatarUrl", rs.getString("avatar_url"));
            Timestamp joined = rs.getTimestamp("joined_at");
            m.put("joinedAt", joined != null ? joined.toInstant().toString() : null);
            return m;
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("workspaceId", workspaceId.toString());
        result.put("workspaceName", workspaceName);
        result.put("workspaceCreatedAt", workspaceCreatedAt);
        result.put("asOf", at.toString());
        result.put("totalProjects", totalProjects == null ? 0 : totalProjects);
        result.put("memberCount", memberCount == null ? 0 : memberCount);
        result.put("projects", projects);
        result.put("members", members);
        result.put("timelineCheckpoints", timelineCheckpoints);
        result.put("suggestedDates", suggestedDates);
        result.put("workspaceUnavailable", false);
        List<String> warnings = new ArrayList<>();
        warnings.add("Open task and workload metrics are not available for historical snapshots.");
        result.put("dataWarnings", warnings);
        return result;
        } catch (Module2Exception ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[SnapshotService] Snapshot build failed for workspace {} at {}: {}", workspaceKey, at, ex.getMessage(), ex);
            return buildDegradedSnapshot(workspaceId, at, workspaceKey);
        }
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
