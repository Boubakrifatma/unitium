package com.example.pi_projet.ml.controller;

import com.example.pi_projet.entity.ChurnPrediction;
import com.example.pi_projet.ml.repository.ChurnPredictionRepository;
import com.example.pi_projet.ml.service.MLService;
import com.example.pi_projet.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
@Tag(name = "ML – Churn Prediction", description = "XGBoost churn prediction & retention actions")
public class MLController {

    private final MLService                 mlService;
    private final ChurnPredictionRepository churnPredictionRepository;
    private final OrganizationRepository    organizationRepository;

    private Map<String, Object> toMap(ChurnPrediction p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                  p.getId());
        m.put("churnProbability",    p.getChurnProbability());
        m.put("riskSegment",         p.getRiskSegment());
        m.put("actionTriggered",     p.getActionTriggered());
        m.put("wauRatio",            p.getWauRatio());
        m.put("lastLoginDeltaDays",  p.getLastLoginDeltaDays());
        m.put("tenureMonths",        p.getTenureMonths());
        m.put("paymentFailuresCount",p.getPaymentFailuresCount());
        m.put("predictionDate",      p.getPredictionDate());
        m.put("modelVersion",        p.getModelVersion());
        if (p.getOrganization() != null) {
            Map<String, Object> org = new LinkedHashMap<>();
            org.put("id",   p.getOrganization().getId());
            org.put("name", p.getOrganization().getName());
            org.put("slug", p.getOrganization().getSlug());
            m.put("organization", org);
        }
        return m;
    }

    @PostMapping("/predict/{orgId}")
    @Operation(summary = "Run churn prediction for a single organization")
    public ResponseEntity<?> predictForOrg(@PathVariable UUID orgId) {
        return mlService.predictChurn(orgId)
                .map(p -> ResponseEntity.ok(toMap(p)))
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/predictions/{orgId}/latest")
    @Operation(summary = "Get the latest churn prediction for an organization")
    public ResponseEntity<?> getLatestPrediction(@PathVariable UUID orgId) {
        return organizationRepository.findById(orgId)
                .flatMap(churnPredictionRepository::findFirstByOrganizationOrderByPredictionDateDesc)
                .map(p -> ResponseEntity.ok(toMap(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/predictions/{orgId}/history")
    @Operation(summary = "Get full prediction history for an organization")
    public ResponseEntity<List<Map<String, Object>>> getPredictionHistory(@PathVariable UUID orgId) {
        return organizationRepository.findById(orgId)
                .map(org -> ResponseEntity.ok(
                        churnPredictionRepository
                                .findByOrganizationOrderByPredictionDateDesc(org)
                                .stream().map(this::toMap).toList()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/predictions/high-risk/today")
    @Operation(summary = "Get all HIGH_RISK organizations predicted today")
    public List<Map<String, Object>> getHighRiskToday() {
        return churnPredictionRepository
                .findByPredictionDateAndRiskSegmentOrderByChurnProbabilityDesc(
                        LocalDate.now(),
                        ChurnPrediction.RiskSegment.HIGH_RISK)
                .stream()
                .map(this::toMap)
                .toList();
    }

    @PostMapping("/retention/resend/{orgId}")
    @Operation(summary = "Resend retention email for the latest prediction of an org")
    public ResponseEntity<Map<String, String>> resendRetentionEmail(@PathVariable UUID orgId) {
        return organizationRepository.findById(orgId)
                .flatMap(churnPredictionRepository::findFirstByOrganizationOrderByPredictionDateDesc)
                .map(p -> {
                    mlService.resendRetentionAction(orgId, p);
                    return ResponseEntity.ok(Map.of(
                            "status", "sent",
                            "action", p.getActionTriggered().name(),
                            "org", orgId.toString()
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/train")
    @Operation(summary = "Trigger model retraining on the Python ML service")
    public ResponseEntity<Map<String, String>> triggerTraining() {
        return ResponseEntity.ok(Map.of("result", mlService.triggerTraining()));
    }

    @GetMapping("/health")
    @Operation(summary = "Check ML Python service health")
    public ResponseEntity<String> mlHealth() {
        return ResponseEntity.ok(mlService.getMLServiceHealth());
    }
}
