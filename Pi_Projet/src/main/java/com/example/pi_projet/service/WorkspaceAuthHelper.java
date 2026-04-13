package com.example.pi_projet.service;

import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkspaceAuthHelper {

    private final JdbcTemplate jdbcTemplate;

    public boolean isOrgAdmin(UUID orgId, Long userId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM org_members WHERE organization_id = ? AND user_id = ? AND role IN ('ADMIN','OWNER') AND deleted_at IS NULL",
                Integer.class, orgId.toString(), userId);
            return count != null && count > 0;
        } catch (Exception ignored) {
            return false;
        }
    }

    @Nullable
    public String getWorkspaceRole(UUID workspaceId, Long userId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT r.name FROM workspace_members wm JOIN roles r ON r.id = wm.role_id WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.deleted_at IS NULL",
                String.class, workspaceId.toString(), userId);
        } catch (Exception e) {
            try {
                return jdbcTemplate.queryForObject(
                    "SELECT wm.role FROM workspace_members wm WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.deleted_at IS NULL",
                    String.class, workspaceId.toString(), userId);
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    public boolean isWorkspaceAdminOrManager(UUID workspaceId, Long userId) {
        String role = getWorkspaceRole(workspaceId, userId);
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase(Locale.ROOT);
        return "OWNER".equals(normalized)
            || "ADMIN".equals(normalized)
            || "MANAGER".equals(normalized);
    }

    public boolean isWorkspaceOwnerOrAdmin(UUID workspaceId, Long userId) {
        String role = getWorkspaceRole(workspaceId, userId);
        if (role == null) {
            return false;
        }

        String normalized = role.toUpperCase(Locale.ROOT);
        return "OWNER".equals(normalized) || "ADMIN".equals(normalized);
    }
}
