package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.*;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

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
        "academic-faculty",     new int[]{3900,  3100},
        "academic-institution", new int[]{9900,  7900}
    );

    private static final java.util.Map<String, String> PLAN_DISPLAY_NAMES = java.util.Map.of(
        "starter",              "Starter",
        "pro",                  "Pro",
        "business",             "Business",
        "enterprise",           "Enterprise",
        "academic-starter",     "Academic Starter",
        "academic-faculty",     "Faculty",
        "academic-institution", "Institution",
        "academic-campus",      "Campus"
    );

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
        String slug = generateSlug(req.getOrgName());
        Organization organization = Organization.builder()
            .name(req.getOrgName())
            .slug(slug)
            .ownerId(orgAdmin.getId())
            .orgType("ACADEMIC".equalsIgnoreCase(req.getOrgType())
                ? Organization.OrgType.ACADEMIC : Organization.OrgType.ENTERPRISE)
            .billingEmail(req.getAdminEmail())
            .vatNumber(req.getVatNumber())
            .build();
        organization = organizationRepository.save(organization);

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
        paymentAttemptRepository.save(PaymentAttempt.builder()
            .organization(organization)
            .subscription(subscription)
            .invoice(invoice)
            .attemptNumber((short) 1)
            .status(PaymentAttempt.AttemptStatus.SUCCEEDED)
            .amountCents(totalCents)
            .stripePaymentIntentId("pi_sim_" + paymentId)
            .build());

        log.info("Created payment attempt SUCCEEDED for org '{}'", req.getOrgName());

        // ── 8. Usage Quota (snapshot initial) ────────────────────────────────
        usageQuotaRepository.save(UsageQuota.builder()
            .organization(organization)
            .plan(plan)
            .metricDate(LocalDate.now())
            .activeMembersCount(1)        // le fondateur
            .workspacesCount(0)
            .projectsCount(0)
            .storageUsedGb(0.0)
            .apiCallsCount(0L)
            .mlInferencesCount(0L)
            .gradeExportsCount(0)
            .computedAt(LocalDateTime.now())
            .build());

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
    public List<InvoiceLineItemDTO> getLineItemsByInvoice(String invoiceId) {
        return invoiceRepository.findById(invoiceId)
            .map(inv -> invoiceLineItemRepository.findByInvoiceOrderByPeriodStart(inv)
                .stream().map(InvoiceLineItemDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    public List<InvoiceLineItemDTO> getMyLineItems(Long userId) {
        return organizationRepository.findByOwnerId(userId)
            .map(org -> invoiceLineItemRepository
                .findByInvoice_Organization_Id(org.getId())
                .stream().map(InvoiceLineItemDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT ATTEMPTS
    // ─────────────────────────────────────────────────────────────────────────
    public List<PaymentAttemptDTO> getAllPaymentAttempts() {
        return paymentAttemptRepository.findAllByOrderByAttemptedAtDesc()
            .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList());
    }

    public List<PaymentAttemptDTO> getMyPaymentAttempts(Long userId) {
        return organizationRepository.findByOwnerId(userId)
            .map(org -> paymentAttemptRepository
                .findByOrganization_IdOrderByAttemptedAtDesc(org.getId())
                .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    public List<PaymentAttemptDTO> getAttemptsByInvoice(String invoiceId) {
        return paymentAttemptRepository.findByInvoice_IdOrderByAttemptedAtDesc(invoiceId)
            .stream().map(PaymentAttemptDTO::from).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USAGE QUOTA
    // ─────────────────────────────────────────────────────────────────────────
    public Optional<UsageQuotaDTO> getMyUsageQuota(Long userId) {
        return organizationRepository.findByOwnerId(userId)
            .flatMap(org -> usageQuotaRepository
                .findTopByOrganization_IdOrderByMetricDateDesc(org.getId()))
            .map(UsageQuotaDTO::from);
    }

    public List<UsageQuotaDTO> getAllUsageQuotas() {
        return usageQuotaRepository.findAllByOrderByMetricDateDesc()
            .stream().map(UsageQuotaDTO::from).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING METHODS
    // ─────────────────────────────────────────────────────────────────────────
    public List<PlanDTO> getAllActivePlans() {
        return planRepository.findByIsActiveTrueOrderByPriceMonthlyCentsAsc()
            .stream().map(PlanDTO::from).collect(Collectors.toList());
    }

    public Optional<SubscriptionDTO> getMySubscription(Long userId) {
        return organizationRepository.findByOwnerId(userId)
            .flatMap(org -> subscriptionRepository.findTopByOrganizationOrderByCreatedAtDesc(org))
            .map(SubscriptionDTO::from);
    }

    public List<InvoiceDTO> getMyInvoices(Long userId) {
        return organizationRepository.findByOwnerId(userId)
            .map(org -> invoiceRepository.findByOrganizationOrderByCreatedAtDesc(org)
                .stream().map(InvoiceDTO::from).collect(Collectors.toList()))
            .orElse(List.of());
    }

    public Optional<PaymentResponseDTO> getPaymentStatus(String paymentId) {
        return pendingPaymentRepository.findById(paymentId).map(this::toResponseDTO);
    }

    public List<PaymentResponseDTO> getAllPayments() {
        return pendingPaymentRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    public List<PaymentResponseDTO> getPendingPayments() {
        return pendingPaymentRepository
            .findByStatusOrderByCreatedAtDesc(PendingPayment.PaymentStatus.PENDING)
            .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    public Optional<PaymentResponseDTO> getPaymentByEmail(String email) {
        return pendingPaymentRepository
            .findByAdminEmailOrderByCreatedAtDesc(email)
            .stream().findFirst().map(this::toResponseDTO);
    }

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
            .isActive(true)
            .build();

        plan = planRepository.save(plan);
        log.info("Plan created: {} ({})", plan.getId(), plan.getDisplayName());
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
