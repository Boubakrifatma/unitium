package com.example.pi_projet.ml;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Configuration for the ML subsystem.
 * Enables Spring @Scheduled tasks (nightly batch + monthly retraining).
 * RestTemplate bean is provided by AppConfig.
 */
@Configuration
@EnableScheduling
public class MLConfig {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;
}
