package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.*;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.repository.*;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${upload.dir}")
    private String uploadDir;

    private final PendingPaymentRepository  pendingPaymentRepository;
    private final UserRepository            userRepository;
    private final OrganizationRepository    organizationRepository;
    private final PlanRepository            planRepository;
    private final SubscriptionRepository    subscriptionRepository;
    private final InvoiceRepository         invoiceRepository;
    private final InvoiceLineItemRepository invoiceLineItemRepository;
    private final PaymentAttemptRepository  paymentAttemptRepository;
    private final UsageQuotaRepository      usageQuotaRepository;
    private final BCryptPasswordEncoder     passwordEncoder;
    private final EmailService              emailService;

    // ── Plan prices in cents (USD) ─────────────────────────────────────────
    private static final java.util.Map<String, int[]> PLAN_PRICES = java.util.Map.of(
        "starter",              new int[]{4900,  3900},
        "pro",                  new int[]{14900, 11900},
        "business",             new int[]{34900, 27900},
        "academic-starter",     new int[]{2900,  2300},
        "academic-institution", new int[]{9900,  7900}
    );

    private static final java.util.Map<String, String> PLAN_DISPLAY_NAMES = java.util.Map.of(
        "starter",              "Starter",
        "pro",                  "Pro",
        "business",             "Business",
        "enterprise",           "Enterprise",
        "academic-starter",     "Academic Starter",
        "academic-institution", "Institution",
        "academic-campus",      "Campus"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE STRIPE PAYMENT INTENT
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> createPaymentIntent(String planId, String billingCycle) {
        try {
            Stripe.apiKey = stripeSecretKey;

            int[] prices = PLAN_PRICES.get(planId);
            int amountCents = 0;
            if (prices != null) {
                amountCents = "annual".equalsIgnoreCase(billingCycle) ? prices[1] * 12 : prices[0];
            }
            int taxCents   = (int) Math.round(amountCents * 0.19);
            int totalCents = amountCents + taxCents;

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount((long) totalCents)
                .setCurrency("usd")
                .addPaymentMethodType("card")
                .build();

            PaymentIntent intent = PaymentIntent.create(params);
            log.info("Stripe PaymentIntent created: {} for plan '{}' amount={} cents", intent.getId(), planId, totalCents);

            return Map.of(
                "clientSecret",      intent.getClientSecret(),
                "paymentIntentId",   intent.getId(),
                "amount",            totalCents
            );
        } catch (StripeException e) {
            log.error("Stripe PaymentIntent creation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Stripe error: " + e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUBMIT PAYMENT
    // Creates: User + Organization + Plan + Subscription + Invoice +
    //          InvoiceLineItem + PaymentAttempt + UsageQuota
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public PaymentResponseDTO submitPayment(PaymentRequestDTO req) {

        String paymentId    = generatePaymentId();
        String tempPassword = generatePassword();
        String planName     = PLAN_DISPLAY_NAMES.getOrDefault(req.getPlanId(), req.getPlanId());

        int[] prices    = PLAN_PRICES.get(req.getPlanId());
        int amountCents = 0;
        if (prices != null) {
            amountCents = "annual".equalsIgnoreCase(req.getBillingCycle())
                ? prices[1] * 12 : prices[0];
        }
        double amount = amountCents / 100.0;

        String cardLast4 = req.getCardNumber() != null && req.getCardNumber().length() >= 4
            ? req.getCardNumber().replaceAll("\\s", "")
                  .substring(req.getCardNumber().replaceAll("\\s","").length() - 4)
            : "****";

        // ── 1. User ──────────────────────────────────────────────────────────
        User orgAdmin;
        if (userRepository.existsByEmail(req.getAdminEmail())) {
            orgAdmin = userRepository.findByEmail(req.getAdminEmail()).orElseThrow();
            orgAdmin.setPasswordHash(passwordEncoder.encode(tempPassword));
            orgAdmin.setMustChangePassword(true);
            orgAdmin = userRepository.save(orgAdmin);
        } else {
            orgAdmin = User.builder()
                .email(req.getAdminEmail())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .fullName(req.getAdminName())
                .role(User.RoleName.ADMIN)
                .isActive(true)
                .isVerified(true)
                .mustChangePassword(true)
                .build();
            orgAdmin = userRepository.save(orgAdmin);
        }

        // ── 2. Organization ───────────────────────────────────────────────────
        final User finalOrgAdmin = orgAdmin;
        Organization organization = organizationRepository
            .findByOwnerIdOrderByCreatedAtDesc(orgAdmin.getId())
            .stream().findFirst()
            .orElseGet(() -> {
                String slug = generateSlug(req.getOrgName());
                return organizationRepository.save(Organization.builder()
                    .name(req.getOrgName())
                    .slug(slug)
                    .ownerId(finalOrgAdmin.getId())
                    .orgType("ACADEMIC".equalsIgnoreCase(req.getOrgType())
                        ? Organization.OrgType.ACADEMIC : Organization.OrgType.ENTERPRISE)
                    .billingEmail(req.getAdminEmail())
                    .vatNumber(req.getVatNumber())
                    .build());
            });

        // ── 3. Plan ───────────────────────────────────────────────────────────
        Plan plan = planRepository.findByName(req.getPlanId()).orElseGet(() -> {
            int[] p = PLAN_PRICES.getOrDefault(req.getPlanId(), new int[]{0, 0});
            return planRepository.save(Plan.builder()
                .name(req.getPlanId())
                .displayName(planName)
                .priceMonthlyCents(p[0])
                .priceYearlyCents(p[1])
                .storageMb(10240L)
                .mlTier(Plan.MlTier.BASIC)
                .supportTier(Plan.SupportTier.EMAIL)
                .apiAccess(false)
                .ssoEnabled(false)
                .lmsIntegration(false)
                .gradeExport(false)
                .customIntegrations(Plan.CustomIntegrations.NONE)
                .isActive(true)
                .build());
        });

        // ── 4. Subscription ───────────────────────────────────────────────────
        Subscription.BillingCycle cycle = "annual".equalsIgnoreCase(req.getBillingCycle())
            ? Subscription.BillingCycle.ANNUAL : Subscription.BillingCycle.MONTHLY;
        LocalDateTime periodStart = LocalDateTime.now();
        LocalDateTime periodEnd   = "annual".equalsIgnoreCase(req.getBillingCycle())
            ? periodStart.plusYears(1) : periodStart.plusMonths(1);

        Subscription subscription = subscriptionRepository.save(Subscription.builder()
            .organization(organization)
            .plan(plan)
            .status(Subscription.SubscriptionStatus.ACTIVE)
            .billingCycle(cycle)
            .currentPeriodStart(periodStart)
            .currentPeriodEnd(periodEnd)
            .cancelAtPeriodEnd(false)
            .build());

        // ── 5. Invoice ────────────────────────────────────────────────────────
        int taxCents   = (int) Math.round(amountCents * 0.19);
        int totalCents = amountCents + taxCents;

        Invoice invoice = invoiceRepository.save(Invoice.builder()
            .organization(organization)
            .subscription(subscription)
            .invoiceNumber("INV-" + paymentId)
            .status(Invoice.InvoiceStatus.PAID)
            .subtotalCents(amountCents)
            .taxRate(19.0)
            .taxAmountCents(taxCents)
            .totalCents(totalCents)
            .currency("USD")
            .billingPeriodStart(periodStart.toLocalDate())
            .billingPeriodEnd(periodEnd.toLocalDate())
            .dueDate(LocalDate.now())
            .paidAt(LocalDateTime.now())
            .build());

        // ── 6. Invoice Line Items (détail de la facture) ──────────────────────
        // Line 1 : abonnement principal
        invoiceLineItemRepository.save(InvoiceLineItem.builder()
            .invoice(invoice)
            .description(planName + " Plan – " + (cycle == Subscription.BillingCycle.ANNUAL ? "Annual" : "Monthly") + " Subscription")
            .quantity(1)
            .unitPriceCents(amountCents)
            .totalPriceCents(amountCents)
            .taxRate(0.0)
            .periodStart(periodStart.toLocalDate())
            .periodEnd(periodEnd.toLocalDate())
            .build());

        // Line 2 : TVA
        invoiceLineItemRepository.save(InvoiceLineItem.builder()
            .invoice(invoice)
            .description("VAT 19%")
            .quantity(1)
            .unitPriceCents(taxCents)
            .totalPriceCents(taxCents)
            .taxRate(19.0)
            .periodStart(periodStart.toLocalDate())
            .periodEnd(periodEnd.toLocalDate())
            .build());

        log.info("Created 2 invoice line items for invoice {}", invoice.getInvoiceNumber());

        // ── 7. Payment Attempt (SUCCEEDED) ────────────────────────────────────
        // If a real Stripe PaymentIntent ID is provided, verify it with Stripe
        String resolvedStripeId;
        if (req.getStripePaymentIntentId() != null && !req.getStripePaymentIntentId().isBlank()) {
            try {
                Stripe.apiKey = stripeSecretKey;
                PaymentIntent intent = PaymentIntent.retrieve(req.getStripePaymentIntentId());
                if (!"succeeded".equals(intent.getStatus())) {
                    throw new RuntimeException("Payment not confirmed by Stripe. Status: " + intent.getStatus());
                }
                resolvedStripeId = intent.getId();
                log.info("Stripe payment verified: {} status={}", resolvedStripeId, intent.getStatus());
            } catch (StripeException e) {
                log.error("Stripe verification failed: {}", e.getMessage());
                throw new RuntimeException("Stripe verification error: " + e.getMessage(), e);
            }
        } else {
            // Fallback: simulated ID (for testing without Stripe keys)
            resolvedStripeId = "pi_sim_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            log.warn("No Stripe PaymentIntent ID provided — using simulated ID: {}", resolvedStripeId);
        }

        paymentAttemptRepository.save(PaymentAttempt.builder()
            .organization(organization)
            .subscription(subscription)
            .invoice(invoice)
            .attemptNumber((short) 1)
            .status(PaymentAttempt.AttemptStatus.SUCCEEDED)
            .amountCents(totalCents)
            .stripePaymentIntentId(resolvedStripeId)
            .build());

        log.info("Created payment attempt SUCCEEDED for org '{}'", req.getOrgName());

        // ── 8. Usage Quota (snapshot initial) — upsert to avoid duplicate (org_id, metric_date) ──
        UsageQuota existingQuota = usageQuotaRepository
            .findByOrganizationAndMetricDate(organization, LocalDate.now())
            .orElse(null);
        if (existingQuota == null) {
            usageQuotaRepository.save(UsageQuota.builder()
                .organization(organization)
                .plan(plan)
                .metricDate(LocalDate.now())
                .activeMembersCount(1)
                .workspacesCount(0)
                .projectsCount(0)
                .storageUsedGb(0.0)
                .apiCallsCount(0L)
                .mlInferencesCount(0L)
                .gradeExportsCount(0)
                .computedAt(LocalDateTime.now())
                .build());
        } else {
            existingQuota.setPlan(plan);
            existingQuota.setComputedAt(LocalDateTime.now());
            usageQuotaRepository.save(existingQuota);
        }

        log.info("Created initial usage quota for org '{}'", req.getOrgName());

        // ── 9. Pending Payment (historique) ───────────────────────────────────
        PendingPayment payment = PendingPayment.builder()
            .paymentId(paymentId)
            .planId(req.getPlanId())
            .planName(planName)
            .orgType(req.getOrgType())
            .billingCycle(req.getBillingCycle())
            .orgName(req.getOrgName())
            .adminEmail(req.getAdminEmail())
            .adminName(req.getAdminName())
            .phone(req.getPhone())
            .numUsers(req.getNumUsers())
            .address(req.getAddress())
            .vatNumber(req.getVatNumber())
            .institution(req.getInstitution())
            .department(req.getDepartment())
            .studentCount(req.getStudentCount())
            .amountCents(amountCents)
            .currency("USD")
            .tempPassword(tempPassword)
            .cardLast4(cardLast4)
            .cardHolder(req.getCardHolder())
            .status(PendingPayment.PaymentStatus.CONFIRMED)
            .confirmedAt(LocalDateTime.now())
            .build();
        pendingPaymentRepository.save(payment);

        // ── 10. Email de bienvenue avec invoice intégrée ─────────────────────
        // Calculs pour l'email (montants affichés en USD)
        double subtotalUsd = amountCents / 100.0;
        double taxUsd      = taxCents / 100.0;
        double totalUsd    = totalCents / 100.0;

        try {
            emailService.sendWelcomeWithInvoiceEmail(
                req.getAdminEmail(),
                req.getAdminName(),
                req.getOrgName(),
                planName,
                "annual".equalsIgnoreCase(req.getBillingCycle()) ? "Annual" : "Monthly",
                subtotalUsd,
                taxUsd,
                totalUsd,
                "USD",
                "INV-" + paymentId,
                paymentId,
                tempPassword
            );
        } catch (Exception emailEx) {
            log.warn("Welcome email failed for {} — payment still confirmed: {}", req.getAdminEmail(), emailEx.getMessage());
        }

        return PaymentResponseDTO.builder()
            .paymentId(paymentId)
            .orgId(organization.getId().toString())
            .status("CONFIRMED")
            .planName(planName)
            .amount(amount)
            .currency("USD")
            .createdAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
            .estimatedValidationDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")))
            .tempPassword(tempPassword)
            .adminEmail(req.getAdminEmail())
            .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INVOICE LINE ITEMS
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InvoiceLineItemDTO> getLineItemsByInvoice(String invoiceId) {
        return invoiceRepository.findById(invoiceId)
            .map(inv -> invoiceLineItemRepository.findByInvoiceOrderByPeriodStart(inv)
                .stream().map(InvoiceLineItemDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<InvoiceLineItemDTO> getMyLineItems(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .map(org -> invoiceLineItemRepository
                .findByInvoice_Organization_Id(org.getId())
                .stream().map(InvoiceLineItemDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT ATTEMPTS
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PaymentAttemptDTO> getAllPaymentAttempts() {
        return paymentAttemptRepository.findAllByOrderByAttemptedAtDesc()
            .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentAttemptDTO> getMyPaymentAttempts(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .map(org -> paymentAttemptRepository
                .findByOrganization_IdOrderByAttemptedAtDesc(org.getId())
                .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<PaymentAttemptDTO> getAttemptsByInvoice(String invoiceId) {
        return paymentAttemptRepository.findByInvoice_IdOrderByAttemptedAtDesc(invoiceId)
            .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USAGE QUOTA
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Optional<UsageQuotaDTO> getMyUsageQuota(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .flatMap(org -> usageQuotaRepository
                .findTopByOrganization_IdOrderByMetricDateDesc(org.getId()))
            .map(UsageQuotaDTO::from);
    }

    @Transactional(readOnly = true)
    public List<UsageQuotaDTO> getAllUsageQuotas() {
        return usageQuotaRepository.findAllByOrderByMetricDateDesc()
            .stream().map(UsageQuotaDTO::from).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING METHODS
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PlanDTO> getAllActivePlans() {
        return planRepository.findByIsActiveTrueOrderByPriceMonthlyCentsAsc()
            .stream()
            .filter(plan -> !"academic-faculty".equalsIgnoreCase(plan.getName()))
            .map(PlanDTO::from).collect(Collectors.toList());
    }

    @Transactional
    public boolean cancelSubscription(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .flatMap(org -> subscriptionRepository.findTopByOrganizationOrderByCreatedAtDesc(org))
            .map(sub -> {
                sub.setStatus(Subscription.SubscriptionStatus.CANCELED);
                sub.setCancelAtPeriodEnd(true);
                sub.setCanceledAt(LocalDateTime.now());
                subscriptionRepository.save(sub);
                return true;
            })
            .orElse(false);
    }

    @Transactional
    public boolean cancelPaymentByEmail(String email) {
        List<PendingPayment> payments = pendingPaymentRepository.findByAdminEmailOrderByCreatedAtDesc(email);
        if (payments.isEmpty()) return false;
        PendingPayment payment = payments.get(0);
        payment.setStatus(PendingPayment.PaymentStatus.CANCELLED);
        pendingPaymentRepository.save(payment);
        // Also cancel the subscription if one exists for this org
        userRepository.findByEmail(email).ifPresent(user ->
            organizationRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId())
                .stream().findFirst()
                .ifPresent(org -> subscriptionRepository.findTopByOrganizationOrderByCreatedAtDesc(org)
                    .ifPresent(sub -> {
                        sub.setStatus(Subscription.SubscriptionStatus.CANCELED);
                        sub.setCancelAtPeriodEnd(true);
                        subscriptionRepository.save(sub);
                    }))
        );
        return true;
    }

    @Transactional(readOnly = true)
    public Optional<SubscriptionDTO> getMySubscription(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .flatMap(org -> subscriptionRepository.findTopByOrganizationOrderByCreatedAtDesc(org))
            .map(SubscriptionDTO::from);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getMyInvoices(Long userId) {
        return organizationRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
            .stream().findFirst()
            .map(org -> invoiceRepository.findByOrganizationOrderByCreatedAtDesc(org)
                .stream().map(InvoiceDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public Optional<PaymentResponseDTO> getPaymentStatus(String paymentId) {
        return pendingPaymentRepository.findById(paymentId).map(this::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getAllPayments() {
        return pendingPaymentRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getPendingPayments() {
        return pendingPaymentRepository
            .findByStatusOrderByCreatedAtDesc(PendingPayment.PaymentStatus.PENDING)
            .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<PaymentResponseDTO> getPaymentByEmail(String email) {
        return pendingPaymentRepository
            .findByAdminEmailOrderByCreatedAtDesc(email)
            .stream().findFirst().map(this::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getAllInvoices() {
        return invoiceRepository.findAll().stream()
            .map(InvoiceDTO::from).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLAN MANAGEMENT (permanent deletion)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public PlanDTO createPlan(CreatePlanRequestDTO request) {
        int priceMonthlyCents = (int) (request.getPriceMonthly() * 100);
        int priceYearlyCents = (int) (request.getPriceYearly() * 100);

        String name = request.getDisplayName().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");

        // Check if plan already exists with better error handling
        Optional<Plan> existingPlan = planRepository.findByName(name);
        if (existingPlan.isPresent()) {
            log.warn("Duplicate plan name detected: {}", name);
            throw new IllegalArgumentException("A plan with the name '" + request.getDisplayName() + "' already exists");
        }

        Plan plan = Plan.builder()
            .name(name)
            .displayName(request.getDisplayName())
            .priceMonthlyCents(priceMonthlyCents)
            .priceYearlyCents(priceYearlyCents)
            .storageMb(request.getStorageMb())
            .mlTier(Plan.MlTier.valueOf(request.getMlTier() != null ? request.getMlTier() : "BASIC"))
            .supportTier(Plan.SupportTier.valueOf(request.getSupportTier() != null ? request.getSupportTier() : "EMAIL"))
            .maxWorkspaces(request.getMaxWorkspaces())
            .maxMembersPerWs(request.getMaxMembersPerWs())
            .maxActiveProjects(request.getMaxActiveProjects())
            .apiAccess(request.getApiAccess() != null ? request.getApiAccess() : false)
            .apiCallsPerMonth(request.getApiCallsPerMonth())
            .ssoEnabled(request.getSsoEnabled() != null ? request.getSsoEnabled() : false)
            .lmsIntegration(request.getLmsIntegration() != null ? request.getLmsIntegration() : false)
            .gradeExport(request.getGradeExport() != null ? request.getGradeExport() : false)
            .customIntegrations(Plan.CustomIntegrations.NONE)
            .orgType(request.getOrgType() != null ? request.getOrgType() : "enterprise")
            .isActive(true)
            .build();

        plan = planRepository.save(plan);
        log.info("Plan created: {} ({})", plan.getId(), plan.getDisplayName());
        return PlanDTO.from(plan);
    }

    @Transactional
    public PlanDTO updatePlan(String planId, CreatePlanRequestDTO request) {
        Plan plan = planRepository.findById(planId)
            .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));

        plan.setDisplayName(request.getDisplayName());
        plan.setPriceMonthlyCents((int) (request.getPriceMonthly() * 100));
        plan.setPriceYearlyCents((int) (request.getPriceYearly() * 100));
        if (request.getStorageMb() != null) plan.setStorageMb(request.getStorageMb());
        if (request.getMlTier() != null) plan.setMlTier(Plan.MlTier.valueOf(request.getMlTier()));
        if (request.getSupportTier() != null) plan.setSupportTier(Plan.SupportTier.valueOf(request.getSupportTier()));
        if (request.getMaxWorkspaces() != null) plan.setMaxWorkspaces(request.getMaxWorkspaces());
        if (request.getMaxMembersPerWs() != null) plan.setMaxMembersPerWs(request.getMaxMembersPerWs());
        if (request.getMaxActiveProjects() != null) plan.setMaxActiveProjects(request.getMaxActiveProjects());
        if (request.getApiAccess() != null) plan.setApiAccess(request.getApiAccess());
        if (request.getSsoEnabled() != null) plan.setSsoEnabled(request.getSsoEnabled());
        if (request.getOrgType() != null) plan.setOrgType(request.getOrgType());

        plan = planRepository.save(plan);
        log.info("Plan updated: {} ({})", plan.getId(), plan.getDisplayName());
        return PlanDTO.from(plan);
    }

    @Transactional
    public boolean deletePlan(String planId) {
        return planRepository.findById(planId)
            .map(plan -> {
                planRepository.delete(plan);
                log.info("Plan {} deleted from database", planId);
                return true;
            })
            .orElse(false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PDF UPLOAD
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public String uploadInvoicePdf(String invoiceId, MultipartFile file) throws IOException {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);

        String filename = invoiceId + "_" + System.currentTimeMillis() + ".pdf";
        Path filePath = dir.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String pdfUrl = "http://localhost:8084/uploads/invoices/" + filename;
        invoice.setPdfUrl(pdfUrl);
        invoice.setPdfSentAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        log.info("PDF uploaded for invoice {}: {}", invoiceId, pdfUrl);
        return pdfUrl;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private PaymentResponseDTO toResponseDTO(PendingPayment p) {
        return PaymentResponseDTO.builder()
            .paymentId(p.getPaymentId())
            .orgId("ORG-" + p.getPaymentId())
            .status(p.getStatus().name())
            .planName(p.getPlanName())
            .amount(p.getAmountCents() / 100.0)
            .currency(p.getCurrency())
            .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "")
            .estimatedValidationDate(p.getCreatedAt() != null ? p.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "")
            .tempPassword(p.getTempPassword())
            .adminEmail(p.getAdminEmail())
            .orgName(p.getOrgName())
            .orgType(p.getOrgType())
            .billingCycle(p.getBillingCycle())
            .phone(p.getPhone())
            .numUsers(p.getNumUsers())
            .address(p.getAddress())
            .build();
    }

    private String generatePaymentId() {
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder("V-");
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    private String generatePassword() {
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
        StringBuilder sb = new StringBuilder();
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < 12; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    private String generateSlug(String orgName) {
        String base = orgName.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = base; int suffix = 1;
        while (organizationRepository.existsBySlug(slug)) slug = base + "-" + suffix++;
        return slug;
    }
}
