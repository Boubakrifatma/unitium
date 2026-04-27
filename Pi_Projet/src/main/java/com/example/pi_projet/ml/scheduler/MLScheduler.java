package com.example.pi_projet.ml.scheduler;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.ml.service.MLService;
import com.example.pi_projet.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Nightly batch job that runs churn predictions for all active organizations.
 *
 * Schedule: every day at 02:00 (server local time).
 * Enable scheduling by adding @EnableScheduling on your main class or a @Configuration.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MLScheduler {

    private final MLService              mlService;
    private final OrganizationRepository organizationRepository;

    /**
     * Runs every night at 02:00.
     * Iterates over all non-deleted organizations and triggers churn prediction.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void runNightlyChurnPredictions() {
        log.info("=== [ML Scheduler] Starting nightly churn prediction batch ===");
        long startMs = System.currentTimeMillis();

        List<Organization> orgs = organizationRepository.findAll();
        AtomicInteger success = new AtomicInteger(0);
        AtomicInteger skipped = new AtomicInteger(0);
        AtomicInteger errors  = new AtomicInteger(0);

        for (Organization org : orgs) {
            try {
                boolean predicted = mlService.predictChurn(org.getId()).isPresent();
                if (predicted) success.incrementAndGet();
                else           skipped.incrementAndGet();
            } catch (Exception e) {
                errors.incrementAndGet();
                log.error("[ML Scheduler] Error processing org {}: {}", org.getId(), e.getMessage());
            }
        }

        long elapsedMs = System.currentTimeMillis() - startMs;
        log.info("=== [ML Scheduler] Batch complete in {}ms — success={} skipped={} errors={} ===",
                elapsedMs, success.get(), skipped.get(), errors.get());
    }

    /**
     * Monthly model retraining: first Sunday of every month at 03:00.
     */
    @Scheduled(cron = "0 0 3 ? * SUN#1")
    public void runMonthlyModelRetraining() {
        log.info("[ML Scheduler] Monthly model retraining triggered");
        String result = mlService.triggerTraining();
        log.info("[ML Scheduler] Retraining result: {}", result);
    }
}
