package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Plan;
import com.example.pi_projet.entity.UsageQuota;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UsageQuotaDTO {
    private String id;
    private String orgId;
    private String orgName;
    private String planId;
    private String planName;
    private String metricDate;

    // Usage values
    private Integer activeMembersCount;
    private Integer workspacesCount;
    private Integer projectsCount;
    private Double storageUsedGb;
    private Long apiCallsCount;
    private Long mlInferencesCount;

    // Plan limits (for % calculation)
    private Integer maxMembers;
    private Integer maxWorkspaces;
    private Integer maxProjects;
    private Double maxStorageGb;

    // Percentages (computed)
    private double membersPct;
    private double workspacesPct;
    private double projectsPct;
    private double storagePct;

    // Alert flags
    private boolean alert80Sent;
    private boolean alert100Sent;
    private String updatedAt;

    public static UsageQuotaDTO from(UsageQuota uq) {
        Plan plan = uq.getPlan();

        // Compute limits from plan
        Integer maxMembers    = plan != null ? plan.getMaxMembersPerWs() : null;
        Integer maxWs         = plan != null ? plan.getMaxWorkspaces() : null;
        Integer maxProjects   = plan != null ? plan.getMaxActiveProjects() : null;
        Double  maxStorageGb  = plan != null ? plan.getStorageMb() / 1024.0 : null;

        // Compute percentages safely
        double memPct  = (maxMembers != null && maxMembers > 0)
            ? Math.min(100.0, uq.getActiveMembersCount() * 100.0 / maxMembers) : 0;
        double wsPct   = (maxWs != null && maxWs > 0)
            ? Math.min(100.0, uq.getWorkspacesCount() * 100.0 / maxWs) : 0;
        double projPct = (maxProjects != null && maxProjects > 0)
            ? Math.min(100.0, uq.getProjectsCount() * 100.0 / maxProjects) : 0;
        double stoPct  = (maxStorageGb != null && maxStorageGb > 0)
            ? Math.min(100.0, uq.getStorageUsedGb() * 100.0 / maxStorageGb) : 0;

        return UsageQuotaDTO.builder()
            .id(uq.getId())
            .orgId(uq.getOrganization() != null ? uq.getOrganization().getId().toString() : null)
            .orgName(uq.getOrganization() != null ? uq.getOrganization().getName() : null)
            .planId(plan != null ? plan.getId() : null)
            .planName(plan != null ? plan.getDisplayName() : null)
            .metricDate(uq.getMetricDate() != null ? uq.getMetricDate().toString() : null)
            .activeMembersCount(uq.getActiveMembersCount())
            .workspacesCount(uq.getWorkspacesCount())
            .projectsCount(uq.getProjectsCount())
            .storageUsedGb(uq.getStorageUsedGb())
            .apiCallsCount(uq.getApiCallsCount())
            .mlInferencesCount(uq.getMlInferencesCount())
            .maxMembers(maxMembers)
            .maxWorkspaces(maxWs)
            .maxProjects(maxProjects)
            .maxStorageGb(maxStorageGb)
            .membersPct(memPct)
            .workspacesPct(wsPct)
            .projectsPct(projPct)
            .storagePct(stoPct)
            .alert80Sent(uq.getQuotaAlert80SentAt() != null)
            .alert100Sent(uq.getQuotaAlert100SentAt() != null)
            .updatedAt(uq.getUpdatedAt() != null ? uq.getUpdatedAt().toString() : null)
            .build();
    }
}
