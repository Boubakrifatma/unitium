package com.example.pi_projet.config;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.UserRepository;
import com.example.pi_projet.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final AuthService    authService;

    private static final String FRONTEND_URL = "http://localhost:4200";

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email   = oauth2User.getAttribute("email");
        String name    = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");

        // Find existing user or create a new one
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(name);
            newUser.setAvatarUrl(picture);
            newUser.setRole(User.RoleName.EMPLOYEE);
            newUser.setIsActive(true);
            newUser.setMustChangePassword(false);
            newUser.setMfaEnabled(false);
            return userRepository.save(newUser);
        });

        // Account disabled
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            response.sendRedirect(FRONTEND_URL + "/auth/login?error=account_disabled");
            return;
        }

        // Generate JWT and create session
        String token = authService.loginWithOAuth2(user, request);

        // Redirect to Angular callback page with token
        String redirectUrl = FRONTEND_URL + "/auth/oauth2-callback"
                + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                + "&userId=" + user.getId()
                + "&email=" + URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8)
                + "&fullName=" + URLEncoder.encode(user.getFullName() != null ? user.getFullName() : "", StandardCharsets.UTF_8)
                + "&role=" + user.getRole().name()
                + "&avatarUrl=" + URLEncoder.encode(user.getAvatarUrl() != null ? user.getAvatarUrl() : "", StandardCharsets.UTF_8);

        response.sendRedirect(redirectUrl);
    }
}
