package com.example.pi_projet.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2SuccessHandler oauth2SuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — REST API uses JWT
            .csrf(AbstractHttpConfigurer::disable)
            // Allow all requests — auth is handled by SessionInterceptor
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            // Enable Google OAuth2 login
            .oauth2Login(oauth2 -> oauth2.successHandler(oauth2SuccessHandler));

        return http.build();
    }
}
