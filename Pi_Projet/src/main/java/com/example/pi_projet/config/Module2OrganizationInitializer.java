package com.example.pi_projet.config;

import com.example.pi_projet.service.M2DevSeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(2)
@Slf4j
public class Module2OrganizationInitializer implements CommandLineRunner {

    private final M2DevSeedService m2DevSeedService;

    @Value("${app.seed.module2.scenario.enabled:true}")
    private boolean scenarioEnabled;

    @Override
    public void run(String... args) {
        try {
            m2DevSeedService.seed();
            log.info("[Module2OrganizationInitializer] Module 2 startup scenario applied.");
        } catch (Exception ex) {
            log.error("[Module2OrganizationInitializer] Failed to apply Module 2 startup scenario", ex);
        }
    }
}
