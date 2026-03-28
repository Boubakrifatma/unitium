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

    public void writeAudit(Long userId, UUID orgId, String actionType, String entityType, String entityId, String ipAddress) {
        try {
            jdbcTemplate.update(
                "INSERT INTO audit_logs (user_id, org_id, action_type, entity_type, entity_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
                userId, orgId == null ? null : orgId.toString(), actionType, entityType, entityId, ipAddress
            );
        } catch (Exception e) {
            log.warn("Failed to write audit log: {}", e.getMessage());
        }
    }

    /**
     * Fetch recent audit log entries scoped to a specific org.
     * Includes workspace and workspace_member events ordered newest-first.
     */
    public List<Map<String, Object>> fetchOrgLogs(UUID orgId, int limit) {
        try {
            return jdbcTemplate.queryForList(
                "SELECT user_id, action_type, entity_type, entity_id, details_json, ip_address, created_at " +
                "FROM audit_logs WHERE org_id = ? " +
                "ORDER BY created_at DESC LIMIT ?",
                orgId.toString(), Math.min(limit, 100)
            );
        } catch (Exception e) {
            log.warn("Failed to fetch audit logs for org {}: {}", orgId, e.getMessage());
            return List.of();
        }
    }

    /**
     * Fetch recent audit log entries for a specific workspace (by entity_id or workspace member events).
     */
    public List<Map<String, Object>> fetchWorkspaceLogs(UUID orgId, UUID workspaceId, int limit) {
        try {
            return jdbcTemplate.queryForList(
                "SELECT user_id, action_type, entity_type, entity_id, details_json, ip_address, created_at " +
                "FROM audit_logs WHERE org_id = ? " +
                "AND (entity_type IN ('workspace_member', 'workspace', 'project') " +
                "  OR (entity_type = 'workspace' AND entity_id = ?)) " +
                "ORDER BY created_at DESC LIMIT ?",
                orgId.toString(), workspaceId.toString(), Math.min(limit, 100)
            );
        } catch (Exception e) {
            log.warn("Failed to fetch workspace audit logs: {}", e.getMessage());
            return List.of();
        }
    }
}
