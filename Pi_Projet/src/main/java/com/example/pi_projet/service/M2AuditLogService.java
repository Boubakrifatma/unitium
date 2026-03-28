package com.example.pi_projet.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class M2AuditLogService {
    private final JdbcTemplate jdbcTemplate;

    /** Basic overload — no entity name or workspace scoping in details_json. */
    public void writeAudit(Long userId, UUID orgId, String actionType, String entityType, String entityId, String ipAddress) {
        try {
            jdbcTemplate.update(
                "INSERT INTO m2_audit_logs (user_id, org_id, action_type, entity_type, entity_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
                userId, orgId == null ? null : orgId.toString(), actionType, entityType, entityId, ipAddress
            );
        } catch (Exception e) {
            log.warn("Failed to write audit log: {}", e.getMessage());
        }
    }

    /**
     * Enriched overload — stores entity name and workspace_id in details_json so the
     * activity feed can show readable sentences and scope events per-workspace.
     */
    public void writeAudit(Long userId, UUID orgId, String actionType,
                           String entityType, String entityId,
                           String entityName, UUID workspaceId, String ipAddress) {
        String detailsJson = buildDetailsJson(entityName, workspaceId);
        try {
            jdbcTemplate.update(
                "INSERT INTO m2_audit_logs (user_id, org_id, action_type, entity_type, entity_id, details_json, ip_address, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                userId, orgId == null ? null : orgId.toString(),
                actionType, entityType, entityId, detailsJson, ipAddress
            );
        } catch (Exception e) {
            log.warn("Failed to write audit log: {}", e.getMessage());
        }
    }

    private String buildDetailsJson(String name, UUID workspaceId) {
        StringBuilder sb = new StringBuilder("{");
        boolean hasEntry = false;
        if (name != null) {
            sb.append("\"name\":\"").append(name.replace("\"", "\\\"")).append("\"");
            hasEntry = true;
        }
        if (workspaceId != null) {
            if (hasEntry) sb.append(",");
            sb.append("\"workspace_id\":\"").append(workspaceId).append("\"");
        }
        sb.append("}");
        return sb.toString();
    }

    /**
     * Fetch recent audit log entries scoped to a specific org.
     */
    public List<Map<String, Object>> fetchOrgLogs(UUID orgId, int limit) {
        try {
            return jdbcTemplate.queryForList(
                "SELECT user_id, action_type, entity_type, entity_id, details_json, ip_address, created_at " +
                "FROM m2_audit_logs WHERE org_id = ? " +
                "ORDER BY created_at DESC LIMIT ?",
                orgId.toString(), Math.min(limit, 100)
            );
        } catch (Exception e) {
            log.warn("Failed to fetch audit logs for org {}: {}", orgId, e.getMessage());
            return List.of();
        }
    }

    /**
     * Fetch workspace-scoped activity with full_name from users table.
     * Matches workspace events by entity_id = workspaceId, and all other events
     * by workspace_id stored in details_json.
     */
    public List<Map<String, Object>> fetchWorkspaceLogs(UUID orgId, UUID workspaceId, int limit) {
        try {
            String wsId = workspaceId.toString();
            return jdbcTemplate.queryForList(
                "SELECT a.user_id, u.full_name, a.action_type, a.entity_type, " +
                "       a.entity_id, a.details_json, a.created_at " +
                "FROM m2_audit_logs a " +
                "LEFT JOIN users u ON u.id = a.user_id " +
                "WHERE a.org_id = ? " +
                "  AND (" +
                "       (a.entity_type = 'workspace' AND a.entity_id = ?) " +
                "    OR a.details_json LIKE CONCAT('%\"workspace_id\":\"', ?, '\"%')" +
                "  ) " +
                "ORDER BY a.created_at DESC LIMIT ?",
                orgId.toString(), wsId, wsId, Math.min(limit, 100)
            );
        } catch (Exception e) {
            log.warn("Failed to fetch workspace audit logs: {}", e.getMessage());
            return List.of();
        }
    }
}
