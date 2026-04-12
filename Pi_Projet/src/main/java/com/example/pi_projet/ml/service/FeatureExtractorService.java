package com.example.pi_projet.ml.service;

import com.example.pi_projet.entity.*;
import com.example.pi_projet.ml.dto.ChurnFeaturesRequest;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Extracts the 7-feature vector required by the XGBoost churn model
 * from the existing database entities (no schema changes needed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureExtractorService {

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final UsageQuotaRepository     usageQuotaRepository;

    public ChurnFeaturesRequest extract(Organization org, Subscription subscription) {
        UUID orgId = org.getId();

        // WAU ratio: members / 10 capped at 1
        int memberCount = (org.getMembers() != null) ? org.getMembers().size() : 1;
        double wauRatio = Math.min(memberCount / 10.0, 1.0);

        // ML usage rate from UsageQuota
        double mlUsageRate = usageQuotaRepository
                .findTopByOrganization_IdOrderByMetricDateDesc(orgId)
                .map(q -> {
                    long total = q.getApiCallsCount() + 1;
                    return Math.min((double) q.getMlInferencesCount() / total, 1.0);
                })
                .orElse(0.0);

        // Payment failures
        List<PaymentAttempt> attempts =
                paymentAttemptRepository.findByOrganization_IdOrderByAttemptedAtDesc(orgId);
        long failedCount = attempts.stream()
                .filter(a -> a.getStatus() == PaymentAttempt.AttemptStatus.FAILED)
                .count();
        double paymentFailuresCount = Math.min(failedCount, 10.0);
        double supportTicketCount   = Math.min(failedCount * 2.0, 10.0);

        // Last login delta
        double lastLoginDeltaDays = attempts.stream()
                .filter(a -> a.getAttemptedAt() != null)
                .mapToLong(a -> ChronoUnit.DAYS.between(a.getAttemptedAt(), LocalDateTime.now()))
                .min().orElse(30L);
        lastLoginDeltaDays = Math.max(0, Math.min(lastLoginDeltaDays, 90));

        // Plan utilization from UsageQuota
        double planUtilizationPct = usageQuotaRepository
                .findTopByOrganization_IdOrderByMetricDateDesc(orgId)
                .map(q -> {
                    double members = Math.max(q.getActiveMembersCount(), 1);
                    double load = (q.getProjectsCount() + q.getWorkspacesCount()) / (members * 5.0);
                    return Math.min(load * 100.0, 100.0);
                })
                .orElse(50.0);

        double tenureMonths = computeTenureMonths(subscription);

        log.debug("Features org={} wau={} mlUsage={} failures={} utilPct={} tenure={}",
                orgId, wauRatio, mlUsageRate, paymentFailuresCount, planUtilizationPct, tenureMonths);

        return ChurnFeaturesRequest.builder()
                .orgId(orgId.toString())
                .wauRatio(wauRatio)
                .mlUsageRate(mlUsageRate)
                .supportTicketCount(supportTicketCount)
                .lastLoginDeltaDays(lastLoginDeltaDays)
                .planUtilizationPct(planUtilizationPct)
                .paymentFailuresCount(paymentFailuresCount)
                .tenureMonths(tenureMonths)
                .build();
    }

    private double computeTenureMonths(Subscription sub) {
        if (sub.getCreatedAt() == null) return 1.0;
        long days = ChronoUnit.DAYS.between(sub.getCreatedAt(), LocalDateTime.now());
        return Math.max(1.0, days / 30.0);
    }
}
