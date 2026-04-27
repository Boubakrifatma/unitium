package com.example.pi_projet.ml.service;

import com.example.pi_projet.entity.*;
import com.example.pi_projet.ml.dto.ChurnFeaturesRequest;
import com.example.pi_projet.ml.dto.ChurnPredictionResponse;
import com.example.pi_projet.ml.repository.ChurnPredictionRepository;
import com.example.pi_projet.repository.OrganizationRepository;
import com.example.pi_projet.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Core ML orchestration service.
 * 1. Extract features → 2. Call FastAPI → 3. Persist → 4. Trigger retention action
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MLService {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate              restTemplate;
    private final FeatureExtractorService   featureExtractor;
    private final ChurnPredictionRepository churnPredictionRepository;
    private final OrganizationRepository    organizationRepository;
    private final SubscriptionRepository    subscriptionRepository;
    private final MLRetentionService        retentionService;

    // ── Public API ─────────────────────────────────────────────────────────────

    public Optional<ChurnPrediction> predictChurn(UUID orgId) {
        try {
            Organization org = organizationRepository.findById(orgId)
                    .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

            Subscription subscription = subscriptionRepository
                    .findTopByOrganizationIdAndStatusOrderByCreatedAtDesc(
                            orgId, Subscription.SubscriptionStatus.ACTIVE)
                    .orElse(null);

            if (subscription == null) {
                log.debug("No active subscription for org {}, skipping", orgId);
                return Optional.empty();
            }

            // Skip if already predicted today
            if (churnPredictionRepository.existsByOrganizationIdAndPredictionDate(orgId, LocalDate.now())) {
                log.debug("Prediction already exists today for org {}", orgId);
                return Optional.empty();
            }

            ChurnFeaturesRequest features = featureExtractor.extract(org, subscription);
            ChurnPredictionResponse response = callPredictChurn(features);
            if (response == null) return Optional.empty();

            ChurnPrediction prediction = buildEntity(org, subscription, features, response);
            churnPredictionRepository.save(prediction);
            triggerRetentionAction(orgId, response);

            log.info("Churn prediction for org {}: score={} action={}",
                    orgId, response.getChurnScore(), response.getAction());
            return Optional.of(prediction);

        } catch (Exception e) {
            log.error("ML prediction failed for org {}: {}", orgId, e.getMessage(), e);
            return Optional.empty();
        }
    }

    public void resendRetentionAction(UUID orgId, ChurnPrediction prediction) {
        switch (prediction.getActionTriggered()) {
            case DISCOUNT_OFFER -> retentionService.createAndSendRetentionCoupon(orgId, 30);
            case EMAIL          -> retentionService.sendChurnRetentionEmail(orgId);
            case CS_CALL        -> log.warn("MANAGER ALERT resend – org {} churn risk", orgId);
            default             -> log.info("No retention action to resend for org {}", orgId);
        }
    }

    public String triggerTraining() {
        try {
            return restTemplate.postForObject(mlServiceUrl + "/train", null, String.class);
        } catch (RestClientException e) {
            log.error("Training request failed: {}", e.getMessage());
            return "ERROR: " + e.getMessage();
        }
    }

    public String getMLServiceHealth() {
        try {
            return restTemplate.getForObject(mlServiceUrl + "/health", String.class);
        } catch (RestClientException e) {
            return "{\"status\":\"unreachable\",\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    // ── Private ────────────────────────────────────────────────────────────────

    private ChurnPredictionResponse callPredictChurn(ChurnFeaturesRequest features) {
        try {
            return restTemplate.postForObject(
                    mlServiceUrl + "/predict/churn", features, ChurnPredictionResponse.class);
        } catch (RestClientException e) {
            log.error("FastAPI unreachable: {}", e.getMessage());
            return null;
        }
    }

    private ChurnPrediction buildEntity(Organization org, Subscription sub,
                                        ChurnFeaturesRequest f, ChurnPredictionResponse r) {
        ChurnPrediction.RiskSegment riskSegment = switch (r.getRiskLevel()) {
            case "CRITICAL", "HIGH" -> ChurnPrediction.RiskSegment.HIGH_RISK;
            case "MEDIUM"           -> ChurnPrediction.RiskSegment.MEDIUM_RISK;
            default                 -> ChurnPrediction.RiskSegment.STABLE;
        };
        ChurnPrediction.ActionTriggered action = switch (r.getAction()) {
            case "URGENT_COUPON_30" -> ChurnPrediction.ActionTriggered.DISCOUNT_OFFER;
            case "RETENTION_EMAIL"  -> ChurnPrediction.ActionTriggered.EMAIL;
            case "MANAGER_ALERT"    -> ChurnPrediction.ActionTriggered.CS_CALL;
            default                 -> ChurnPrediction.ActionTriggered.NONE;
        };

        return ChurnPrediction.builder()
                .organization(org)
                .subscription(sub)
                .predictionDate(LocalDate.now())
                .churnProbability(BigDecimal.valueOf(r.getChurnScore()))
                .riskSegment(riskSegment)
                .wauRatio(BigDecimal.valueOf(f.getWauRatio()))
                .mlUsageRate(BigDecimal.valueOf(f.getMlUsageRate()))
                .supportTicketCount((short)(int) f.getSupportTicketCount())
                .lastLoginDeltaDays((int) f.getLastLoginDeltaDays())
                .planUtilizationPct(BigDecimal.valueOf(f.getPlanUtilizationPct()))
                .paymentFailuresCount((short)(int) f.getPaymentFailuresCount())
                .tenureMonths((short)(int) f.getTenureMonths())
                .actionTriggered(action)
                .actionTriggeredAt(action != ChurnPrediction.ActionTriggered.NONE ? LocalDateTime.now() : null)
                .modelVersion(r.getModelVersion() != null ? r.getModelVersion() : "telco-xgb-v1")
                .build();
    }

    private void triggerRetentionAction(UUID orgId, ChurnPredictionResponse r) {
        switch (r.getAction()) {
            case "URGENT_COUPON_30" -> retentionService.createAndSendRetentionCoupon(orgId, 30);
            case "RETENTION_EMAIL"  -> retentionService.sendChurnRetentionEmail(orgId);
            case "MANAGER_ALERT"    ->
                log.warn("MANAGER ALERT – org {} churn risk={}", orgId, r.getChurnScore());
            default -> {}
        }
    }
}
