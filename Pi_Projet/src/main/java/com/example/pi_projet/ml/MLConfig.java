package com.example.pi_projet.ml;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for the ML subsystem.
 * <p>
 * - Registers a {@link RestTemplate} bean used to call FastAPI.
 * - Enables Spring @Scheduled tasks (nightly batch + monthly retraining).
 */
@Configuration
@EnableScheduling
public class MLConfig {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
