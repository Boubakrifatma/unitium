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
    private final InvoiceTamperingService   invoiceTamperingService;
    private final InvoicePdfService         invoicePdfService;
    private final CouponService             couponService;


    // ─────────────────────────────────────────────────────────────────────────
    // CREATE STRIPE PAYMENT INTENT
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> createPaymentIntent(String planId, String billingCycle) {
        try {
            Stripe.apiKey = stripeSecretKey;

            Plan plan = planRepository.findByName(planId)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));
            int amountCents = "annual".equalsIgnoreCase(billingCycle)
                ? plan.getPriceYearlyCents()
                : plan.getPriceMonthlyCents();
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

        String paymentId = generatePaymentId();

        // ── Plan (fetch from DB first to get real prices) ─────────────────────
        Plan plan = planRepository.findByName(req.getPlanId())
            .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + req.getPlanId()));
        String planName = plan.getDisplayName() != null ? plan.getDisplayName() : plan.getName();
        int amountCents = "annual".equalsIgnoreCase(req.getBillingCycle())
            ? plan.getPriceYearlyCents()
            : plan.getPriceMonthlyCents();

        // Apply coupon discount if provided
        String appliedCouponCode = null;
        int couponDiscountCents = 0;
        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            var couponResult = couponService.validate(req.getCouponCode(), amountCents);
            if (couponResult.isValid()) {
                couponDiscountCents = couponResult.getDiscountCents();
                amountCents = couponResult.getFinalAmountCents();
                appliedCouponCode = req.getCouponCode().trim().toUpperCase();
                log.info("Coupon '{}' applied: discount={}c, final={}c", appliedCouponCode, couponDiscountCents, amountCents);
            } else {
                log.warn("Invalid coupon '{}' submitted: {}", req.getCouponCode(), couponResult.getMessage());
            }
        }

        double amount = amountCents / 100.0;

        String cardLast4 = req.getCardNumber() != null && req.getCardNumber().length() >= 4
            ? req.getCardNumber().replaceAll("\\s", "")
                  .substring(req.getCardNumber().replaceAll("\\s","").length() - 4)
            : "****";

        // ── 1. User ──────────────────────────────────────────────────────────
        User orgAdmin;
        boolean isNewUser = !userRepository.existsByEmail(req.getAdminEmail());
        String tempPassword = isNewUser ? generatePassword() : null;

        if (!isNewUser) {
            // Utilisateur déjà authentifié → ne pas toucher au mot de passe
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

        // ── 3. Plan (already fetched above) ──────────────────────────────────

        // ── 4. Subscription ───────────────────────────────────────────────────
        Subscription.BillingCycle cycle = "annual".equalsIgnoreCase(req.getBillingCycle())
            ? Subscription.BillingCycle.ANNUAL : Subscription.BillingCycle.MONTHLY;
        LocalDateTime periodStart = LocalDateTime.now();
        LocalDateTime periodEnd   = "annual".equalsIgnoreCase(req.getBillingCycle())
            ? periodStart.plusYears(1) : periodStart.plusMonths(1);

        // Detect previous active subscription (for upgrade/downgrade tracking)
        Subscription previousSub = subscriptionRepository
            .findTopByOrganizationIdAndStatusOrderByCreatedAtDesc(
                organization.getId(), Subscription.SubscriptionStatus.ACTIVE)
            .orElse(null);

        Plan previousPlan = previousSub != null ? previousSub.getPlan() : null;
        boolean isDowngrade = previousPlan != null
            && plan.getPriceMonthlyCents() < previousPlan.getPriceMonthlyCents();

        // Cancel previous subscription before creating the new one
        if (previousSub != null) {
            previousSub.setStatus(Subscription.SubscriptionStatus.CANCELED);
            previousSub.setCanceledAt(LocalDateTime.now());
            subscriptionRepository.save(previousSub);
        }

        Subscription.SubscriptionBuilder subBuilder = Subscription.builder()
            .organization(organization)
            .plan(plan)
            .status(Subscription.SubscriptionStatus.ACTIVE)
            .billingCycle(cycle)
            .currentPeriodStart(periodStart)
            .currentPeriodEnd(periodEnd)
            .cancelAtPeriodEnd(false);

        if (isDowngrade) {
            subBuilder.downgradedFromPlan(previousPlan);
        }

        Subscription subscription = subscriptionRepository.save(subBuilder.build());

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
            .couponCode(appliedCouponCode)
            .discountAmountCents(couponDiscountCents > 0 ? couponDiscountCents : null)
            .build());

        // ── 6. Invoice Line Items (détail de la facture) ──────────────────────
        // Line 1 : abonnement principal (prix original avant remise)
        int originalAmountCents = amountCents + couponDiscountCents;
        InvoiceLineItem lineItemSub = invoiceLineItemRepository.save(InvoiceLineItem.builder()
            .invoice(invoice)
            .description(planName + " Plan – " + (cycle == Subscription.BillingCycle.ANNUAL ? "Annual" : "Monthly") + " Subscription")
            .quantity(1)
            .unitPriceCents(originalAmountCents)
            .totalPriceCents(originalAmountCents)
            .taxRate(0.0)
            .periodStart(periodStart.toLocalDate())
            .periodEnd(periodEnd.toLocalDate())
            .build());

        // Line 2 : remise coupon (si applicable)
        if (couponDiscountCents > 0 && appliedCouponCode != null) {
            invoiceLineItemRepository.save(InvoiceLineItem.builder()
                .invoice(invoice)
                .description("Coupon discount – " + appliedCouponCode)
                .quantity(1)
                .unitPriceCents(-couponDiscountCents)
                .totalPriceCents(-couponDiscountCents)
                .taxRate(0.0)
                .periodStart(periodStart.toLocalDate())
                .periodEnd(periodEnd.toLocalDate())
                .build());
        }

        // Line 2 : TVA
        InvoiceLineItem lineItemTax = invoiceLineItemRepository.save(InvoiceLineItem.builder()
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
        String resolvedPaymentMethodId = null;
        if (req.getStripePaymentIntentId() != null && !req.getStripePaymentIntentId().isBlank()) {
            try {
                Stripe.apiKey = stripeSecretKey;
                PaymentIntent intent = PaymentIntent.retrieve(req.getStripePaymentIntentId());
                if (!"succeeded".equals(intent.getStatus())) {
                    throw new RuntimeException("Payment not confirmed by Stripe. Status: " + intent.getStatus());
                }
                resolvedStripeId = intent.getId();
                resolvedPaymentMethodId = intent.getPaymentMethod();
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

        // Update subscription with Stripe identifiers
        subscription.setStripeSubscriptionId(resolvedStripeId);
        subscription.setStripePaymentMethodId(resolvedPaymentMethodId);
        subscription.setPaymentMethodType(Subscription.PaymentMethodType.CARD);
        subscriptionRepository.save(subscription);

        // Update line items with Stripe reference IDs
        lineItemSub.setStripeLineItemId("il_" + resolvedStripeId + "_sub");
        lineItemTax.setStripeLineItemId("il_" + resolvedStripeId + "_tax");
        invoiceLineItemRepository.save(lineItemSub);
        invoiceLineItemRepository.save(lineItemTax);

        // Update invoice with Stripe reference ID
        invoice.setStripeInvoiceId(resolvedStripeId);
        invoiceRepository.save(invoice);

        // ── Integrity Hash — sign the invoice after all fields are finalized ──
        String integrityHash = invoiceTamperingService.generateHash(invoice);
        invoice.setIntegrityHash(integrityHash);
        invoiceRepository.save(invoice);
        log.info("Integrity hash generated for invoice {}: {}", invoice.getInvoiceNumber(), integrityHash);

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
            .tempPassword(isNewUser ? tempPassword : "")
            .cardLast4(cardLast4)
            .cardHolder(req.getCardHolder())
            .status(PendingPayment.PaymentStatus.CONFIRMED)
            .confirmedAt(LocalDateTime.now())
            .build();
        pendingPaymentRepository.save(payment);

        // ── Apply coupon usage (after confirmed payment) ──────────────────────
        if (appliedCouponCode != null) {
            couponService.applyCoupon(appliedCouponCode);
        }

        // ── 10. PDF Generation + Email ────────────────────────────────────────
        double subtotalUsd = amountCents / 100.0;
        double taxUsd      = taxCents / 100.0;
        double totalUsd    = totalCents / 100.0;

        // Generate PDF and save to disk
        // JPA calls are OUTSIDE the try-catch to avoid marking the transaction rollback-only
        var lineItems = invoiceLineItemRepository.findByInvoiceOrderByPeriodStart(invoice);
        invoice.setLineItems(lineItems);

        byte[] pdfBytes = new byte[0];
        String generatedPdfUrl = null;
        try {
            pdfBytes = invoicePdfService.generateInvoicePdf(invoice, req.getAdminEmail(), req.getAdminName());
            if (pdfBytes.length > 0) {
                String filename = invoice.getInvoiceNumber() + ".pdf";
                Path dir = Paths.get(uploadDir);
                Files.createDirectories(dir);
                Files.write(dir.resolve(filename), pdfBytes);
                generatedPdfUrl = "http://localhost:8084/uploads/invoices/" + filename;
            }
        } catch (Exception pdfEx) {
            log.warn("PDF generation failed for {} — payment still confirmed: {}", invoice.getInvoiceNumber(), pdfEx.getMessage());
        }

        if (generatedPdfUrl != null) {
            invoice.setPdfUrl(generatedPdfUrl);
            invoice.setPdfSentAt(LocalDateTime.now());
            invoiceRepository.save(invoice);
            log.info("PDF auto-generated and saved for invoice {}", invoice.getInvoiceNumber());
        }

        // Send email with PDF attachment
        try {
            if (isNewUser) {
                emailService.sendWelcomeWithInvoiceEmail(
                    req.getAdminEmail(), req.getAdminName(), req.getOrgName(), planName,
                    "annual".equalsIgnoreCase(req.getBillingCycle()) ? "Annual" : "Monthly",
                    subtotalUsd, taxUsd, totalUsd, "USD",
                    "INV-" + paymentId, paymentId, tempPassword, pdfBytes
                );
            } else {
                emailService.sendUpgradeInvoiceEmail(
                    req.getAdminEmail(), req.getAdminName(), req.getOrgName(), planName,
                    "annual".equalsIgnoreCase(req.getBillingCycle()) ? "Annual" : "Monthly",
                    subtotalUsd, taxUsd, totalUsd, "USD",
                    "INV-" + paymentId, paymentId, pdfBytes
                );
            }
        } catch (Exception emailEx) {
            log.warn("Email failed for {} — payment still confirmed: {}", req.getAdminEmail(), emailEx.getMessage());
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
            .tempPassword(isNewUser ? tempPassword : "")
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
            .map(org -> invoiceRepository.findByOrganizationWithAssociations(org)
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
        return invoiceRepository.findAllWithAssociations().stream()
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
    // RECORD FAILED PAYMENT
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void recordFailedPayment(Map<String, String> data) {
        String paymentId     = generatePaymentId();
        String planId        = data.getOrDefault("planId", "unknown");
        String orgName       = data.getOrDefault("orgName", "unknown");
        String adminEmail    = data.getOrDefault("adminEmail", "unknown");
        String billingCycle  = data.getOrDefault("billingCycle", "monthly");
        String orgType       = data.getOrDefault("orgType", "enterprise");
        String failureCode   = data.getOrDefault("failureCode", "card_error");
        String failureMsg    = data.getOrDefault("failureMessage", "Payment failed");

        Plan plan = planRepository.findByName(planId).orElse(null);
        String planName = plan != null ? plan.getDisplayName() : planId;
        int amountCents = plan != null
            ? ("annual".equalsIgnoreCase(billingCycle) ? plan.getPriceYearlyCents() : plan.getPriceMonthlyCents())
            : 0;

        // Save as REJECTED PendingPayment so it appears in admin dashboard
        PendingPayment failed = PendingPayment.builder()
            .paymentId(paymentId)
            .planId(planId)
            .planName(planName)
            .orgType(orgType)
            .billingCycle(billingCycle)
            .orgName(orgName)
            .adminEmail(adminEmail)
            .adminName("—")
            .amountCents(amountCents)
            .currency("USD")
            .status(PendingPayment.PaymentStatus.REJECTED)
            .tempPassword("")
            .rejectionReason(failureCode + ": " + failureMsg)
            .rejectedAt(LocalDateTime.now())
            .build();
        pendingPaymentRepository.save(failed);

        log.warn("Failed payment recorded — org: {}, code: {}, msg: {}", orgName, failureCode, failureMsg);
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
