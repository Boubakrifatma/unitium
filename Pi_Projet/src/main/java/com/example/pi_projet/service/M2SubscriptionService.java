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

    private static final String ACTIVE_OR_TRIALING = "'ACTIVE','TRIALING'";

    // Try to read from active subscription plan first, then legacy limits shape.
    public Integer getMaxWorkspacesForOrg(UUID orgId) {
        Integer fromSubscription = queryPlanLimitForOrg(orgId, "max_workspaces");
        if (fromSubscription != null && fromSubscription > 0) {
            return fromSubscription;
        }

        Integer fromLimits = querySubscriptionLimit(orgId, "max_workspaces");
        if (fromLimits != null && fromLimits > 0) {
            return fromLimits;
        }

        return null;
    }

    public int getMaxProjectsForOrg(UUID orgId) {
        Integer fromSubscription = queryPlanLimitForOrg(orgId, "max_active_projects");
        if (fromSubscription != null && fromSubscription > 0) {
            return fromSubscription;
        }

        Integer fromLimits = querySubscriptionLimit(orgId, "max_active_projects");
        if (fromLimits != null && fromLimits > 0) {
            return fromLimits;
        }

        // Legacy deployments may keep this name in the limits table.
        Integer fromLegacyLimits = querySubscriptionLimit(orgId, "max_projects");
        if (fromLegacyLimits != null && fromLegacyLimits > 0) {
            return fromLegacyLimits;
        }

        // TODO [CROSS-MODULE DEPENDENCY] — Replace fallback with Module 6 integration
        return 10;
    }

    public Integer getMaxMembersPerWorkspaceForOrg(UUID orgId) {
        Integer fromSubscription = queryPlanLimitForOrg(orgId, "max_members_per_ws");
        if (fromSubscription != null && fromSubscription > 0) {
            return fromSubscription;
        }

        Integer fromLimits = querySubscriptionLimit(orgId, "max_members_per_ws");
        if (fromLimits != null && fromLimits > 0) {
            return fromLimits;
        }

        Integer fromLegacyLimits = querySubscriptionLimit(orgId, "max_members");
        if (fromLegacyLimits != null && fromLegacyLimits > 0) {
            return fromLegacyLimits;
        }

        return null;
    }

    public String getPlanNameForOrg(UUID orgId) {
        String planName = queryPlanNameForOrg(orgId, "organization_id");
        if (planName != null && !planName.isBlank()) return planName;

        planName = queryPlanNameForOrg(orgId, "org_id");
        if (planName != null && !planName.isBlank()) return planName;

        return null;
    }

    private Integer queryPlanLimitForOrg(UUID orgId, String planColumn) {
        Integer value = queryPlanLimitForOrg(orgId, planColumn, "organization_id");
        if (value != null && value > 0) return value;

        value = queryPlanLimitForOrg(orgId, planColumn, "org_id");
        if (value != null && value > 0) return value;

        return null;
    }

    private Integer queryPlanLimitForOrg(UUID orgId, String planColumn, String subscriptionOrgColumn) {
        String sql = """
            SELECT p.%s
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.%s = ?
              AND s.status IN (%s)
            ORDER BY s.created_at DESC
            LIMIT 1
            """.formatted(planColumn, subscriptionOrgColumn, ACTIVE_OR_TRIALING);
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, orgId.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer querySubscriptionLimit(UUID orgId, String limitColumn) {
        Integer value = querySubscriptionLimit(orgId, limitColumn, "organization_id");
        if (value != null && value > 0) return value;

        value = querySubscriptionLimit(orgId, limitColumn, "org_id");
        if (value != null && value > 0) return value;

        return null;
    }

    private Integer querySubscriptionLimit(UUID orgId, String limitColumn, String limitsOrgColumn) {
        String sql = "SELECT " + limitColumn + " FROM subscription_limits WHERE " + limitsOrgColumn + " = ?";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, orgId.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private String queryPlanNameForOrg(UUID orgId, String subscriptionOrgColumn) {
        String sql = """
            SELECT COALESCE(NULLIF(p.display_name, ''), p.name)
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.%s = ?
              AND s.status IN (%s)
            ORDER BY s.created_at DESC
            LIMIT 1
            """.formatted(subscriptionOrgColumn, ACTIVE_OR_TRIALING);
        try {
            return jdbcTemplate.queryForObject(sql, String.class, orgId.toString());
        } catch (Exception ignored) {
            return null;
        }
    }
}
