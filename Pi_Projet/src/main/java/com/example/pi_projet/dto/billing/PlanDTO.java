package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Plan;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlanDTO {
    private String  id;
    private String  name;
    private String  displayName;
    private double  priceMonthly;
    private double  priceYearly;
    private Integer maxWorkspaces;
    private Integer maxMembersPerWs;
    private Integer maxActiveProjects;
    private Long    storageMb;
    private String  mlTier;
    private String  supportTier;
    private Boolean apiAccess;
    private Boolean ssoEnabled;
    private Boolean isActive;

    public static PlanDTO from(Plan p) {
        return PlanDTO.builder()
            .id(p.getId())
            .name(p.getName())
            .displayName(p.getDisplayName())
            .priceMonthly(p.getPriceMonthlyCents() / 100.0)
            .priceYearly(p.getPriceYearlyCents() / 100.0)
            .maxWorkspaces(p.getMaxWorkspaces())
            .maxMembersPerWs(p.getMaxMembersPerWs())
            .maxActiveProjects(p.getMaxActiveProjects())
            .storageMb(p.getStorageMb())
            .mlTier(p.getMlTier() != null ? p.getMlTier().name() : null)
            .supportTier(p.getSupportTier() != null ? p.getSupportTier().name() : null)
            .apiAccess(p.getApiAccess())
            .ssoEnabled(p.getSsoEnabled())
            .isActive(p.getIsActive())
            .build();
    }
}
