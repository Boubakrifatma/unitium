package com.example.pi_projet.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Module-2 adapter to read lightweight organization properties from DB (Module 1)
 */
@Service
@RequiredArgsConstructor
public class M2OrganizationService {
    private final JdbcTemplate jdbcTemplate;

    public String getOrgType(UUID orgId) {
        if (orgId == null) {
            return "enterprise";
        }

        String asText = orgId.toString();

        try {
            String t = jdbcTemplate.queryForObject(
                "SELECT org_type FROM organizations WHERE id = ?",
                String.class,
                asText
            );
            if (t != null && !t.isBlank()) {
                return t;
            }
        } catch (Exception ignored) {
            // Try alternative UUID storage below.
        }

        try {
            String t = jdbcTemplate.queryForObject(
                "SELECT org_type FROM organizations WHERE id = UUID_TO_BIN(?)",
                String.class,
                asText
            );
            if (t != null && !t.isBlank()) {
                return t;
            }
        } catch (Exception ignored) {
            // Table/function may not exist here; fallback below.
        }

        // TODO [CROSS-MODULE DEPENDENCY] — Replace fallback with Module 1 OrganizationService
        return "enterprise";
    }
}
