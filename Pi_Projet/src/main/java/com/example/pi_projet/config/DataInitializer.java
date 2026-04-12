package com.example.pi_projet.config;

import com.example.pi_projet.entity.Plan;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.PlanRepository;
import com.example.pi_projet.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Price;
import com.stripe.model.Product;
import com.stripe.param.PriceCreateParams;
import com.stripe.param.ProductCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Insère des utilisateurs et des plans de test au démarrage.
 * À supprimer en production.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final PlanRepository planRepository;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Override
    public void run(String... args) {
        // ── Users ────────────────────────────────────────────────────────────
        List<TestUser> users = List.of(
            new TestUser("superadmin@cmp.com",    "superadmin123",   "Super Admin",   User.RoleName.SUPER_ADMIN),
            new TestUser("evenixgroup@gmail.com", "Evenix1234",      "Admin User",    User.RoleName.ADMIN),
            new TestUser("manager@test.com",      "manager123",      "Manager User",  User.RoleName.MANAGER),
            new TestUser("tutor@test.com",        "tutor123",        "Tutor User",    User.RoleName.TUTOR),
            new TestUser("po@test.com",           "productowner123", "Product Owner", User.RoleName.PRODUCT_OWNER),
            new TestUser("student@test.com",      "student123",      "Student User",  User.RoleName.STUDENT),
            new TestUser("viewer@test.com",       "viewer123",       "Viewer User",   User.RoleName.VIEWER),
            new TestUser("employee@test.com",     "employee123",     "Employee User", User.RoleName.EMPLOYEE)
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
                System.out.println("[DataInitializer] Created user: " + u.email());
            }
        }

        // ── Plans ─────────────────────────────────────────────────────────────
        List<TestPlan> plans = List.of(
            new TestPlan("starter", "Starter",
                4900, 46800,
                3, 10, 5, 10240L,
                Plan.MlTier.BASIC, Plan.SupportTier.EMAIL,
                false, null, Plan.CustomIntegrations.NONE,
                false, false, false, "enterprise"),

            new TestPlan("pro", "Pro",
                14900, 142800,
                10, 25, 20, 51200L,
                Plan.MlTier.FULL, Plan.SupportTier.PRIORITY,
                true, 10000, Plan.CustomIntegrations.LIMITED,
                true, false, false, "enterprise"),

            new TestPlan("business", "Business",
                34900, 334800,
                null, null, null, 524288L,
                Plan.MlTier.FULL_API, Plan.SupportTier.DEDICATED,
                true, 100000, Plan.CustomIntegrations.FULL,
                true, false, false, "enterprise"),

            new TestPlan("academic-starter", "Academic Starter",
                2900, 27600,
                5, 30, 10, 20480L,
                Plan.MlTier.BASIC, Plan.SupportTier.ACADEMIC,
                false, null, Plan.CustomIntegrations.NONE,
                false, true, true, "academic"),

            new TestPlan("academic-faculty", "Faculty",
                3900, 37200,
                5, 100, 20, 20480L,
                Plan.MlTier.BASIC, Plan.SupportTier.ACADEMIC,
                false, null, Plan.CustomIntegrations.NONE,
                false, true, true, "academic"),

            new TestPlan("academic-institution", "Institution",
                9900, 94800,
                20, 100, 50, 204800L,
                Plan.MlTier.FULL, Plan.SupportTier.ACADEMIC,
                true, 20000, Plan.CustomIntegrations.LIMITED,
                true, true, true, "academic")
        );

        for (TestPlan p : plans) {
            Plan existing = planRepository.findByName(p.name()).orElse(null);
            Plan entity = existing != null ? existing : Plan.builder().name(p.name()).build();
            entity.setDisplayName(p.displayName());
            entity.setPriceMonthlyCents(p.priceMonthlyCents());
            entity.setPriceYearlyCents(p.priceYearlyCents());
            entity.setMaxWorkspaces(p.maxWorkspaces());
            entity.setMaxMembersPerWs(p.maxMembersPerWs());
            entity.setMaxActiveProjects(p.maxActiveProjects());
            entity.setStorageMb(p.storageMb());
            entity.setMlTier(p.mlTier());
            entity.setSupportTier(p.supportTier());
            entity.setApiAccess(p.apiAccess());
            entity.setApiCallsPerMonth(p.apiCallsPerMonth());
            entity.setCustomIntegrations(p.customIntegrations());
            entity.setSsoEnabled(p.ssoEnabled());
            entity.setLmsIntegration(p.lmsIntegration());
            entity.setGradeExport(p.gradeExport());
            entity.setOrgType(p.orgType());
            entity.setIsActive(true);

            // Create Stripe prices if not already set
            if (entity.getStripePriceIdMonthly() == null || entity.getStripePriceIdYearly() == null) {
                try {
                    Stripe.apiKey = stripeSecretKey;

                    // Create a Stripe Product for this plan
                    Product stripeProduct = Product.create(
                        ProductCreateParams.builder()
                            .setName(p.displayName())
                            .putMetadata("plan_name", p.name())
                            .build()
                    );

                    // Monthly price
                    Price monthlyPrice = Price.create(
                        PriceCreateParams.builder()
                            .setProduct(stripeProduct.getId())
                            .setUnitAmount((long) p.priceMonthlyCents())
                            .setCurrency("usd")
                            .setRecurring(PriceCreateParams.Recurring.builder()
                                .setInterval(PriceCreateParams.Recurring.Interval.MONTH)
                                .build())
                            .putMetadata("plan_name", p.name())
                            .build()
                    );

                    // Yearly price
                    Price yearlyPrice = Price.create(
                        PriceCreateParams.builder()
                            .setProduct(stripeProduct.getId())
                            .setUnitAmount((long) p.priceYearlyCents())
                            .setCurrency("usd")
                            .setRecurring(PriceCreateParams.Recurring.builder()
                                .setInterval(PriceCreateParams.Recurring.Interval.YEAR)
                                .build())
                            .putMetadata("plan_name", p.name())
                            .build()
                    );

                    entity.setStripePriceIdMonthly(monthlyPrice.getId());
                    entity.setStripePriceIdYearly(yearlyPrice.getId());
                    System.out.println("[DataInitializer] Stripe prices created for plan: " + p.name()
                        + " | monthly=" + monthlyPrice.getId()
                        + " | yearly=" + yearlyPrice.getId());

                } catch (StripeException e) {
                    System.err.println("[DataInitializer] Stripe error for plan " + p.name() + ": " + e.getMessage());
                }
            }

            planRepository.save(entity);
            System.out.println("[DataInitializer] Upserted plan: " + p.name());
        }
    }

    private record TestUser(String email, String password, String fullName, User.RoleName role) {}

    private record TestPlan(
        String name, String displayName,
        int priceMonthlyCents, int priceYearlyCents,
        Integer maxWorkspaces, Integer maxMembersPerWs, Integer maxActiveProjects,
        Long storageMb,
        Plan.MlTier mlTier, Plan.SupportTier supportTier,
        Boolean apiAccess, Integer apiCallsPerMonth, Plan.CustomIntegrations customIntegrations,
        Boolean ssoEnabled, Boolean lmsIntegration, Boolean gradeExport,
        String orgType
    ) {}
}
