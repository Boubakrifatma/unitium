package com.example.pi_projet.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Pi Projet API")
                        .description("""
                                REST API for Pi Projet.

                                **Authentication:**
                                1. Call `POST /api/auth/login` with your credentials.
                                2. Copy the `token` from the response.
                                3. Click **Authorize** (top right), enter: `Bearer <token>`.
                                4. All endpoints marked with 🔒 require this token.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Pi Projet Team")
                                .email("contact@piprojet.com")))
                .components(new Components()
                        .addSecuritySchemes("Bearer Authentication",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("UUID")
                                        .description("Enter the token obtained from POST /api/auth/login")));
    }
}
