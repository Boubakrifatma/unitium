package com.example.pi_projet.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

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
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadsPath = Paths.get("uploads/avatars/").toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(uploadsPath);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/auth/login",            // login public
                    "/api/auth/face-login",        // face login public
                    "/api/auth/change-password",   // changement mot de passe 1er login
                    "/api/billing/payment",        // soumission paiement public
                    "/api/billing/payment/*",      // statut paiement public
                    "/api/billing/plans",          // liste plans publique
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                );
    }
}
