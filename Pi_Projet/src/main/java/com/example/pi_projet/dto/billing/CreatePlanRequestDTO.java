package com.example.pi_projet.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreatePlanRequestDTO {

    @NotBlank(message = "Display name is required")
    private String displayName;

    @NotNull(message = "Monthly price is required")
    @Positive(message = "Monthly price must be positive")
    private Double priceMonthly;

    @NotNull(message = "Yearly price is required")
    @Positive(message = "Yearly price must be positive")
    private Double priceYearly;

    @NotNull(message = "Storage is required")
    @Positive(message = "Storage must be positive")
    private Long storageMb;

    private String mlTier; // NONE, BASIC, FULL, FULL_API
    private String supportTier; // COMMUNITY, EMAIL, PRIORITY, DEDICATED, ACADEMIC

    private Integer maxWorkspaces;
    private Integer maxMembersPerWs;
    private Integer maxActiveProjects;
    private Integer apiCallsPerMonth;
    private Boolean apiAccess;
    private Boolean ssoEnabled;
    private Boolean lmsIntegration;
    private Boolean gradeExport;
}
