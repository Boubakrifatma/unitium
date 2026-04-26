package com.example.pi_projet.service;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.exception.Module2Exception;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin-only cross-entity queries.
 * SUPER_ADMIN → platform-wide (all orgs).
 * ADMIN       → scoped to their own organization.
 */
@Service
@RequiredArgsConstructor
public class M2AdminService {

    private final JdbcTemplate jdbc;

    // ── Stats ──────────────────────────────────────────────────────────────

    public Map<String, Object> getStats(User user) {
        UUID orgId = resolveAdminOrgId(user);
        Map<String, Object> stats = new LinkedHashMap<>();

        if (orgId == null) {
            // SUPER_ADMIN: global counts
            stats.put("totalWorkspaces",    count("SELECT COUNT(*) FROM workspaces WHERE deleted_at IS NULL"));
            stats.put("totalProjects",      count("SELECT COUNT(*) FROM projects   WHERE deleted_at IS NULL"));
            stats.put("publishedTemplates", count("SELECT COUNT(*) FROM project_templates WHERE deleted_at IS NULL AND status = 'APPROVED'"));
            stats.put("pendingTemplates",   count("SELECT COUNT(*) FROM project_templates WHERE deleted_at IS NULL AND status = 'PENDING_APPROVAL'"));
            stats.put("totalOrgs",          count("SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL"));
            stats.put("quotaAlerts",        countQuotaAlerts(null));
        } else {
            // ADMIN: org-scoped counts
            String oid = orgId.toString();
            stats.put("totalWorkspaces", jdbc.queryForObject(
                "SELECT COUNT(*) FROM workspaces WHERE deleted_at IS NULL AND organization_id = ?",
                Long.class, oid));
            stats.put("totalProjects", jdbc.queryForObject(
                "SELECT COUNT(*) FROM projects pr JOIN workspaces w ON pr.workspace_id = w.id WHERE pr.deleted_at IS NULL AND w.organization_id = ?",
                Long.class, oid));
            stats.put("publishedTemplates", count("SELECT COUNT(*) FROM project_templates WHERE deleted_at IS NULL AND status = 'APPROVED'"));
            stats.put("pendingTemplates",   count("SELECT COUNT(*) FROM project_templates WHERE deleted_at IS NULL AND status = 'PENDING_APPROVAL'"));
            stats.put("totalOrgs",   1L);
            stats.put("quotaAlerts", countQuotaAlerts(orgId));
        }
        return stats;
    }

    private long count(String sql) {
        Long v = jdbc.queryForObject(sql, Long.class);
        return v == null ? 0L : v;
    }

    private long countQuotaAlerts(UUID filterOrgId) {
        try {
            String orgFilter = filterOrgId != null ? " AND o.id = '" + filterOrgId + "'" : "";
            Long v = jdbc.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT o.id,
                           COALESCE(p.max_workspaces, 1) AS max_ws,
                           (SELECT COUNT(*) FROM workspaces w2
                            WHERE w2.organization_id = o.id AND w2.deleted_at IS NULL) AS ws_count
                    FROM organizations o
                    LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status IN ('ACTIVE','TRIALING')
                    LEFT JOIN plans p ON p.id = s.plan_id
                    WHERE o.deleted_at IS NULL
                """ + orgFilter + """
                ) sub
                WHERE sub.ws_count >= sub.max_ws
                """, Long.class);
            return v == null ? 0L : v;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    // ── Workspaces (admin view) ────────────────────────────────────────────

    public List<Map<String, Object>> getAdminWorkspaces(User user) {
        UUID orgId = resolveAdminOrgId(user);
        String orgFilter = orgId != null ? " WHERE w.organization_id = '" + orgId + "'" : "";
        return jdbc.queryForList("""
            SELECT
                w.id,
                w.name,
                w.slug,
                w.org_type,
                w.created_at,
                w.deleted_at,
                o.name        AS org_name,
                o.org_type    AS organization_type,
                COALESCE(p.display_name, 'No Plan')  AS plan_name,
                COALESCE(p.max_workspaces, 1)         AS max_workspaces,
                COALESCE(p.max_members_per_ws, 5)     AS max_members_per_ws,
                COALESCE(p.max_active_projects, 5)    AS max_active_projects,
                (SELECT COUNT(*) FROM workspace_members wm
                 WHERE wm.workspace_id = w.id AND wm.deleted_at IS NULL)  AS member_count,
                (SELECT COUNT(*) FROM projects pr
                 WHERE pr.workspace_id = w.id AND pr.deleted_at IS NULL)  AS project_count,
                (SELECT COUNT(*) FROM workspaces w2
                 WHERE w2.organization_id = w.organization_id
                   AND w2.deleted_at IS NULL) AS org_ws_count
            FROM workspaces w
            JOIN organizations o ON o.id = w.organization_id
            LEFT JOIN subscriptions s
                ON s.organization_id = o.id AND s.status IN ('ACTIVE','TRIALING')
            LEFT JOIN plans p ON p.id = s.plan_id
            """ + orgFilter + """
            ORDER BY w.created_at DESC
            """);
    }

    public void adminSoftDeleteWorkspace(UUID workspaceId, User user) {
        requireWorkspaceBelongsToAdminOrg(workspaceId, user);
        jdbc.update("UPDATE workspaces SET deleted_at = NOW() WHERE id = ?", workspaceId.toString());
    }

    public Map<String, Object> adminRestoreWorkspace(UUID workspaceId, User user) {
        requireWorkspaceBelongsToAdminOrg(workspaceId, user);
        jdbc.update("UPDATE workspaces SET deleted_at = NULL WHERE id = ?", workspaceId.toString());
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, name, slug, created_at, deleted_at FROM workspaces WHERE id = ?",
            workspaceId.toString());
        return rows.isEmpty() ? Map.of("id", workspaceId.toString()) : rows.get(0);
    }

    // ── Projects (admin view) ──────────────────────────────────────────────

    public List<Map<String, Object>> getAdminProjects(User user) {
        UUID orgId = resolveAdminOrgId(user);
        String orgFilter = orgId != null ? " WHERE w.organization_id = '" + orgId + "'" : "";
        return jdbc.queryForList("""
            SELECT
                pr.id,
                pr.name,
                pr.status,
                pr.visibility,
                pr.created_at,
                pr.deleted_at,
                pr.start_date,
                pr.end_date,
                w.name   AS workspace_name,
                w.id     AS workspace_id,
                o.name   AS org_name,
                o.org_type,
                (SELECT COUNT(*) FROM project_members pm
                 WHERE pm.project_id = pr.id AND pm.deleted_at IS NULL) AS member_count
            FROM projects pr
            JOIN workspaces w  ON w.id  = pr.workspace_id
            JOIN organizations o ON o.id = w.organization_id
            """ + orgFilter + """
            ORDER BY pr.created_at DESC
            """);
    }

    public Map<String, Object> adminToggleProjectVisibility(UUID projectId, User user) {
        requireProjectBelongsToAdminOrg(projectId, user);
        jdbc.update("""
            UPDATE projects
               SET visibility = CASE WHEN visibility = 'PUBLIC' THEN 'PRIVATE' ELSE 'PUBLIC' END
             WHERE id = ?
            """, projectId.toString());
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, name, visibility FROM projects WHERE id = ?", projectId.toString());
        return rows.isEmpty() ? Map.of("id", projectId.toString()) : rows.get(0);
    }

    public void adminSoftDeleteProject(UUID projectId, User user) {
        requireProjectBelongsToAdminOrg(projectId, user);
        jdbc.update("UPDATE projects SET deleted_at = NOW() WHERE id = ?", projectId.toString());
    }

    // ── Org quota summary ─────────────────────────────────────────────────

    public List<Map<String, Object>> getOrgQuotaSummary(User user) {
        UUID orgId = resolveAdminOrgId(user);
        String orgFilter = orgId != null ? " AND o.id = '" + orgId + "'" : "";
        return jdbc.queryForList("""
            SELECT
                o.id,
                o.name,
                o.org_type,
                COALESCE(p.display_name, 'No Plan')  AS plan_name,
                COALESCE(p.max_workspaces, 1)         AS max_workspaces,
                COALESCE(p.max_members_per_ws, 5)     AS max_members_per_ws,
                COALESCE(p.max_active_projects, 5)    AS max_active_projects,
                (SELECT COUNT(*) FROM workspaces w
                 WHERE w.organization_id = o.id AND w.deleted_at IS NULL)  AS ws_count,
                (SELECT COUNT(*) FROM projects pr
                 JOIN workspaces w2 ON pr.workspace_id = w2.id
                                 WHERE w2.organization_id = o.id
                                     AND pr.deleted_at IS NULL
                                     AND UPPER(pr.status) = 'ACTIVE') AS project_count
            FROM organizations o
            LEFT JOIN subscriptions s
                ON s.organization_id = o.id AND s.status IN ('ACTIVE','TRIALING')
            LEFT JOIN plans p ON p.id = s.plan_id
            WHERE o.deleted_at IS NULL
            """ + orgFilter + """
            ORDER BY o.name
            """);
    }

    // ── Template ratings & favorites ──────────────────────────────────────

    public List<Map<String, Object>> getTemplateRatings() {
        return jdbc.queryForList("""
            SELECT
                pt.id,
                pt.name,
                pt.template_type,
                pt.usage_count,
                pt.rating,
                pt.rating_count,
                pt.is_featured,
                pt.is_trending,
                pt.is_recommended,
                (SELECT COUNT(*) FROM template_favorites tf
                 WHERE tf.template_id = pt.id) AS favorite_count,
                COALESCE(o.name, 'Global') AS org_name
            FROM project_templates pt
            LEFT JOIN organizations o ON o.id = pt.organization_id
            WHERE pt.deleted_at IS NULL AND pt.status = 'APPROVED'
            ORDER BY pt.rating DESC, pt.usage_count DESC
            LIMIT 50
            """);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Returns the organization UUID that should be used to filter queries.
     * Returns null for SUPER_ADMIN (no filter = see everything).
     */
    private UUID resolveAdminOrgId(User user) {
        if (user == null || user.getRole() == User.RoleName.SUPER_ADMIN) return null;
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT organization_id FROM organization_members WHERE user_id = ? AND deleted_at IS NULL LIMIT 1",
            user.getId());
        if (rows.isEmpty()) return null;
        Object raw = rows.get(0).get("organization_id");
        if (raw == null) return null;
        try { return UUID.fromString(raw.toString()); } catch (Exception e) { return null; }
    }

    private void requireWorkspaceBelongsToAdminOrg(UUID workspaceId, User user) {
        UUID orgId = resolveAdminOrgId(user);
        if (orgId == null) return; // SUPER_ADMIN: no restriction
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspaces WHERE id = ? AND organization_id = ?",
            Integer.class, workspaceId.toString(), orgId.toString());
        if (count == null || count == 0) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Workspace does not belong to your organization");
        }
    }

    private void requireProjectBelongsToAdminOrg(UUID projectId, User user) {
        UUID orgId = resolveAdminOrgId(user);
        if (orgId == null) return; // SUPER_ADMIN: no restriction
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM projects pr JOIN workspaces w ON pr.workspace_id = w.id WHERE pr.id = ? AND w.organization_id = ?",
            Integer.class, projectId.toString(), orgId.toString());
        if (count == null || count == 0) {
            throw new Module2Exception(Module2Exception.ErrorCode.FORBIDDEN,
                "Project does not belong to your organization");
        }
    }
}
