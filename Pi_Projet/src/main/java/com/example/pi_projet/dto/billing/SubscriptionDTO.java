package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Subscription;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubscriptionDTO {
    private String id;
    private String status;
    private String billingCycle;
    private String planName;
    private String planDisplayName;
    private double planPriceMonthly;
    private double planPriceYearly;
    private String currentPeriodStart;
    private String currentPeriodEnd;
    private String createdAt;

    public static SubscriptionDTO from(Subscription s) {
        return SubscriptionDTO.builder()
            .id(s.getId())
            .status(s.getStatus() != null ? s.getStatus().name() : null)
            .billingCycle(s.getBillingCycle() != null ? s.getBillingCycle().name() : null)
            .planName(s.getPlan() != null ? s.getPlan().getName() : null)
            .planDisplayName(s.getPlan() != null ? s.getPlan().getDisplayName() : null)
            .planPriceMonthly(s.getPlan() != null ? s.getPlan().getPriceMonthlyCents() / 100.0 : 0)
            .planPriceYearly(s.getPlan() != null ? s.getPlan().getPriceYearlyCents() / 100.0 : 0)
            .currentPeriodStart(s.getCurrentPeriodStart() != null ? s.getCurrentPeriodStart().toString() : null)
            .currentPeriodEnd(s.getCurrentPeriodEnd() != null ? s.getCurrentPeriodEnd().toString() : null)
            .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
            .build();
    }
}
