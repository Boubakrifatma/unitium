package com.example.pi_projet.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Module-2 prefixed subscription adapter to read plan limits from DB (Module 6)
 * Falls back to defaults when tables or data not available.
 */
@Service
@RequiredArgsConstructor
public class M2SubscriptionService {
    private final JdbcTemplate jdbcTemplate;

    // Try to read from active subscription plan first, then legacy limits shape.
    public Integer getMaxWorkspacesForOrg(UUID orgId) {
        try {
            Integer v = jdbcTemplate.queryForObject(
                """
                SELECT p.max_workspaces
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.org_id = ?
                  AND s.status IN ('ACTIVE','TRIALING')
                ORDER BY s.created_at DESC
                LIMIT 1
                """,
                Integer.class,
                orgId.toString()
            );
            if (v != null && v > 0) {
                return v;
            }
        } catch (Exception ignored) {
            // fallback to legacy limits table
        }

        try {
            Integer v = jdbcTemplate.queryForObject(
                "SELECT max_workspaces FROM subscription_limits WHERE org_id = ?",
                Integer.class,
                orgId.toString());
            if (v != null && v > 0) {
                return v;
            }
        } catch (Exception ignored) {
            // no persisted limits available
        }
        return null;
    }

    public int getMaxProjectsForOrg(UUID orgId) {
        try {
            Integer v = jdbcTemplate.queryForObject(
                """
                SELECT p.max_active_projects
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.org_id = ?
                  AND s.status IN ('ACTIVE','TRIALING')
                ORDER BY s.created_at DESC
                LIMIT 1
                """,
                Integer.class,
                orgId.toString());
            if (v != null && v > 0) {
                return v;
            }
        } catch (Exception ignored) {
        }
        // TODO [CROSS-MODULE DEPENDENCY] — Replace fallback with Module 6 integration
        return 10;
    }

    public Integer getMaxMembersPerWorkspaceForOrg(UUID orgId) {
        try {
            Integer v = jdbcTemplate.queryForObject(
                """
                SELECT p.max_members_per_ws
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.org_id = ?
                  AND s.status IN ('ACTIVE','TRIALING')
                ORDER BY s.created_at DESC
                LIMIT 1
                """,
                Integer.class,
                orgId.toString()
            );
            if (v != null && v > 0) {
                return v;
            }
        } catch (Exception ignored) {
            // fallback to alternative shapes below
        }

        try {
            Integer v = jdbcTemplate.queryForObject(
                "SELECT max_members FROM subscription_limits WHERE org_id = ?",
                Integer.class,
                orgId.toString()
            );
            if (v != null && v > 0) {
                return v;
            }
        } catch (Exception ignored) {
            // fallback to subscription-plan join
        }

        return null;
    }

    public String getPlanNameForOrg(UUID orgId) {
        try {
            return jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(NULLIF(p.display_name, ''), p.name)
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.org_id = ?
                  AND s.status IN ('ACTIVE','TRIALING')
                ORDER BY s.created_at DESC
                LIMIT 1
                """,
                String.class,
                orgId.toString()
            );
        } catch (Exception ignored) {
            return null;
        }
    }
}
