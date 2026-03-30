package com.example.pi_projet.config;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SessionInterceptor implements HandlerInterceptor {

    private final AuthService authService;

    /**
     * Permet de désactiver temporairement la vérification de session/token (tests Postman).
     * IMPORTANT: ne pas laisser à false en production.
     */
    @Value("${session.interceptor.enabled:true}")
    private boolean sessionInterceptorEnabled;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!sessionInterceptorEnabled) {
            return true;
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;

        String token = extractToken(request);
        Optional<User> userOpt = authService.getUserFromToken(token);

        if (userOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Invalid or expired session.\"}");
            return false;
        }

        request.setAttribute("currentUser", userOpt.get());
        return true;
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
