package com.example.pi_projet.config;

import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Insère des utilisateurs de test au démarrage.
 * Must run before Module2OrganizationInitializer (@Order(2)).
 * À supprimer en production.
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        List<TestUser> users = List.of(
            // ── Core roles ──────────────────────────────────────────────────
            new TestUser("superadmin@cmp.com",  "superadmin123",    "Super Admin",     User.RoleName.SUPER_ADMIN),
            new TestUser("admin@test.com",       "admin123",         "Admin User",      User.RoleName.ADMIN),
            new TestUser("manager@test.com",     "manager123",       "Morgan Manager",  User.RoleName.MANAGER),
            new TestUser("tutor@test.com",       "tutor123",         "Taylor Tutor",    User.RoleName.TUTOR),
            new TestUser("po@test.com",          "productowner123",  "Product Owner",   User.RoleName.PRODUCT_OWNER),
            new TestUser("student@test.com",     "student123",       "Sam Student",     User.RoleName.STUDENT),
            new TestUser("viewer@test.com",      "viewer123",        "Victoria Viewer", User.RoleName.VIEWER),
            new TestUser("employee@test.com",    "employee123",      "Emma Employee",   User.RoleName.EMPLOYEE),
            // ── Module 2 extended team ───────────────────────────────────────
            new TestUser("manager2@test.com",    "manager123",       "Maxwell Rivera",  User.RoleName.MANAGER),
            new TestUser("tutor2@test.com",      "tutor123",         "Thomas Chen",     User.RoleName.TUTOR),
            new TestUser("dev1@test.com",        "dev123",           "Liam Dev",        User.RoleName.EMPLOYEE),
            new TestUser("dev2@test.com",        "dev123",           "Nora Dev",        User.RoleName.EMPLOYEE),
            new TestUser("dev3@test.com",        "dev123",           "Owen Dev",        User.RoleName.EMPLOYEE),
            new TestUser("analyst@test.com",     "analyst123",       "Aria Analyst",    User.RoleName.EMPLOYEE),
            new TestUser("student1@test.com",    "student123",       "Sofia Ramirez",   User.RoleName.STUDENT),
            new TestUser("student2@test.com",    "student123",       "Sean Kim",        User.RoleName.STUDENT),
            new TestUser("student3@test.com",    "student123",       "Sophia Webb",     User.RoleName.STUDENT),
            new TestUser("ta@test.com",          "ta123",            "Alex TA",         User.RoleName.TUTOR)
        );

        for (TestUser u : users) {
            if (!userRepository.existsByEmail(u.email())) {
                userRepository.save(User.builder()
                    .email(u.email())
                    .passwordHash(passwordEncoder.encode(u.password()))
                    .fullName(u.fullName())
                    .role(u.role())
                    .isActive(true)
                    .isVerified(true)
                    .build());
                System.out.println("[DataInitializer] Created: " + u.email() + " / " + u.password());
            }
        }
    }

    private record TestUser(String email, String password, String fullName, User.RoleName role) {}
}
