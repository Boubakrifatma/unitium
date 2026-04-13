package com.example.pi_projet.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final SessionInterceptor sessionInterceptor;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/auth/login",
                    "/api/auth/change-password",
                    "/api/billing/payment",
                    "/api/billing/payment/*",
                    "/api/billing/plans",
                    "/api/files/**",
                    "/api/deliverable-notifications/stream", // SSE : EventSource ne peut pas envoyer Bearer
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                );
    }
}
