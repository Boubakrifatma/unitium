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
            .exposedHeaders("Content-Disposition", "ETag", "Last-Modified", "X-Readme-Mode")
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
                .addPathPatterns("/api/**", "/api/ai/**")
                .excludePathPatterns(
                    "/api/auth/login",                    // login public
                    "/api/auth/face-login",               // face login public
                    "/api/auth/change-password",          // changement mot de passe 1er login
                    "/api/auth/2fa/verify",               // vérification code 2FA (avant JWT)
                    "/api/auth/magic-link",               // envoi du magic link (public)
                    "/api/auth/magic-link/verify",        // vérification du magic link (public)
                    "/api/invitations/respond",           // réponse à une invitation (public — GET redirect)
                    "/api/billing/create-payment-intent", // création PaymentIntent Stripe public
                    "/api/billing/payment",               // soumission paiement public
                    "/api/billing/payment/*",             // statut paiement public
                    "/api/billing/plans",                 // liste plans publique
                    "/api/billing/coupons/validate/*",   // validation coupon publique
                    "/api/billing/coupons/active",       // coupons actifs pour home page (public)
                    "/api/files/**",                     // deliverable file download (public by URL)
                    "/api/deliverable-notifications/stream", // SSE — EventSource cannot send JWT header
                    "/api/billing/invoices/integrity-check",         // invoice integrity check (super-admin/test)
                    "/api/billing/invoices/*/verify",                // single invoice verify (super-admin/test)
                    "/api/billing/security/alerts",                  // security alerts dashboard
                    "/api/billing/invoices/resign-all",              // re-sign after test
                    "/api/billing/invoices/trigger-integrity-check", // manual trigger for testing
                    "/api/ml/predict/*",                             // churn prediction (test)
                    "/api/ml/predictions/**",                        // prediction results (test)
                    "/api/ml/health",                                // ML health check
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                );
    }
}
