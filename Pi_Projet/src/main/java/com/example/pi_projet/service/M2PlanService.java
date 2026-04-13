package com.example.pi_projet.service;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

/**
 * Module-2 local plan adapter.
 * Uses hardcoded limits for test scenarios to avoid dependency on external modules.
 */
@Service
public class M2PlanService {

    public PlanLimits getPlanLimits(UUID orgId, String orgType) {
        if (orgType != null && "academic".equalsIgnoreCase(orgType)) {
            return new PlanLimits("ACADEMIC", 999, 999);
        }

        if (orgType != null && "enterprise".equalsIgnoreCase(orgType)) {
            return new PlanLimits("PROFESSIONAL", 10, 50);
        }

        return new PlanLimits("FREE", 1, 5);
    }

    public record PlanLimits(String planName, int maxWorkspaces, int maxMembersPerWorkspace) {
        public String normalizedPlanName() {
            return planName == null ? "UNKNOWN" : planName.toUpperCase(Locale.ROOT);
        }
    }
}
