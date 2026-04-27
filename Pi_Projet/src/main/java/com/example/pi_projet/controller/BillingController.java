package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.billing.*;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.BillingService;
import com.example.pi_projet.service.InvoiceTamperingService;
import com.example.pi_projet.service.SecurityAlertStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Billing", description = "Payment, plans, subscriptions, invoices, usage & payment attempts")
public class BillingController {

    private final BillingService            billingService;
    private final InvoiceTamperingService   invoiceTamperingService;
    private final SecurityAlertStore        securityAlertStore;
    private final com.example.pi_projet.service.CouponService couponService;

    // ── Public ────────────────────────────────────────────────────────────────

    @Operation(summary = "Create a Stripe PaymentIntent — returns clientSecret for Stripe.js")
    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody Map<String, String> body) {
        try {
            String planId       = body.get("planId");
            String billingCycle = body.get("billingCycle");
            Map<String, Object> result = billingService.createPaymentIntent(planId, billingCycle);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("PaymentIntent creation error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Submit a payment — creates org, user, subscription, invoice, line items, payment attempt & usage quota")
    @PostMapping("/payment")
    public ResponseEntity<?> submitPayment(@Valid @RequestBody PaymentRequestDTO request) {
        try {
            PaymentResponseDTO response = billingService.submitPayment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Payment error: {}", e.getMessage(), e);
            String cause = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", cause != null ? cause : e.getClass().getSimpleName()));
        }
    }

    @Operation(summary = "List all active plans")
    @GetMapping("/plans")
    public ResponseEntity<List<PlanDTO>> getPlans() {
        return ResponseEntity.ok(billingService.getAllActivePlans());
    }

    @Operation(summary = "Create a new plan (super admin)")
    @PostMapping("/plans")
    public ResponseEntity<?> createPlan(@Valid @RequestBody CreatePlanRequestDTO request) {
        try {
            PlanDTO planDTO = billingService.createPlan(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(planDTO);
        } catch (DataIntegrityViolationException e) {
            log.error("Duplicate plan name: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "A plan with this name already exists. Please choose a different name."));
        } catch (IllegalArgumentException e) {
            log.error("Invalid plan data: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid plan data: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Plan creation error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Plan creation failed. Please try again."));
        }
    }

    @Operation(summary = "Record a failed payment attempt from Stripe frontend error")
    @PostMapping("/payment/failed")
    public ResponseEntity<?> recordFailedPayment(@RequestBody Map<String, String> body) {
        try {
            billingService.recordFailedPayment(body);
            return ResponseEntity.ok(Map.of("message", "Failed payment recorded"));
        } catch (Exception e) {
            log.error("Error recording failed payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get payment status by ID")
    @GetMapping("/payment/{paymentId}")
    public ResponseEntity<?> getPaymentStatus(@PathVariable String paymentId) {
        return billingService.getPaymentStatus(paymentId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Org Admin ─────────────────────────────────────────────────────────────

    @Authorized
    @Operation(summary = "Get my organisation's current subscription")
    @GetMapping("/my-subscription")
    public ResponseEntity<?> getMySubscription(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return billingService.getMySubscription(user.getId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @Authorized
    @Operation(summary = "List my organisation's invoices (with line items)")
    @GetMapping("/my-invoices")
    public ResponseEntity<List<InvoiceDTO>> getMyInvoices(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(billingService.getMyInvoices(user.getId()));
    }

    @Authorized
    @Operation(summary = "Get my invoice line items (all invoices)")
    @GetMapping("/my-line-items")
    public ResponseEntity<List<InvoiceLineItemDTO>> getMyLineItems(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(billingService.getMyLineItems(user.getId()));
    }

    @Authorized
    @Operation(summary = "Get line items for a specific invoice")
    @GetMapping("/invoices/{invoiceId}/line-items")
    public ResponseEntity<List<InvoiceLineItemDTO>> getLineItemsByInvoice(@PathVariable String invoiceId) {
        return ResponseEntity.ok(billingService.getLineItemsByInvoice(invoiceId));
    }

    @Authorized
    @Operation(summary = "Get my organisation's payment attempts")
    @GetMapping("/my-payment-attempts")
    public ResponseEntity<List<PaymentAttemptDTO>> getMyPaymentAttempts(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return ResponseEntity.ok(billingService.getMyPaymentAttempts(user.getId()));
    }

    @Authorized
    @Operation(summary = "Get my organisation's latest usage quota")
    @GetMapping("/my-usage")
    public ResponseEntity<?> getMyUsage(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return billingService.getMyUsageQuota(user.getId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @Authorized
    @Operation(summary = "Cancel my organisation's current subscription")
    @DeleteMapping("/my-subscription")
    public ResponseEntity<?> cancelSubscription(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        boolean cancelled = billingService.cancelSubscription(user.getId());
        if (cancelled) {
            return ResponseEntity.ok(Map.of("message", "Subscription cancelled successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @Authorized
    @Operation(summary = "Get my payment record by email (fallback)")
    @GetMapping("/my-payment")
    public ResponseEntity<?> getMyPayment(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return billingService.getPaymentByEmail(user.getEmail())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @Authorized
    @Operation(summary = "Cancel my pending payment and subscription (fallback)")
    @DeleteMapping("/my-payment")
    public ResponseEntity<?> cancelMyPayment(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        boolean cancelled = billingService.cancelPaymentByEmail(user.getEmail());
        if (cancelled) {
            return ResponseEntity.ok(Map.of("message", "Payment cancelled successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Super Admin ───────────────────────────────────────────────────────────

    @Operation(summary = "List all payments (super admin)")
    @GetMapping("/payments")
    public ResponseEntity<List<PaymentResponseDTO>> getAllPayments() {
        return ResponseEntity.ok(billingService.getAllPayments());
    }

    @Operation(summary = "List pending payments (super admin)")
    @GetMapping("/payments/pending")
    public ResponseEntity<List<PaymentResponseDTO>> getPendingPayments() {
        return ResponseEntity.ok(billingService.getPendingPayments());
    }

    @Operation(summary = "List all invoices globally (super admin)")
    @GetMapping("/invoices")
    public ResponseEntity<List<InvoiceDTO>> getAllInvoices() {
        return ResponseEntity.ok(billingService.getAllInvoices());
    }

    @Operation(summary = "List all payment attempts globally (super admin)")
    @GetMapping("/payment-attempts")
    public ResponseEntity<List<PaymentAttemptDTO>> getAllPaymentAttempts() {
        return ResponseEntity.ok(billingService.getAllPaymentAttempts());
    }

    @Operation(summary = "Get payment attempts for a specific invoice (super admin)")
    @GetMapping("/invoices/{invoiceId}/payment-attempts")
    public ResponseEntity<List<PaymentAttemptDTO>> getAttemptsByInvoice(@PathVariable String invoiceId) {
        return ResponseEntity.ok(billingService.getAttemptsByInvoice(invoiceId));
    }

    @Operation(summary = "List all usage quotas globally (super admin)")
    @GetMapping("/usage-quotas")
    public ResponseEntity<List<UsageQuotaDTO>> getAllUsageQuotas() {
        return ResponseEntity.ok(billingService.getAllUsageQuotas());
    }

    @Operation(summary = "Update an existing plan (super admin)")
    @PutMapping("/plans/{planId}")
    public ResponseEntity<?> updatePlan(@PathVariable String planId, @Valid @RequestBody CreatePlanRequestDTO request) {
        try {
            PlanDTO planDTO = billingService.updatePlan(planId, request);
            return ResponseEntity.ok(planDTO);
        } catch (IllegalArgumentException e) {
            log.error("Plan update error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Plan update error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Plan update failed. Please try again."));
        }
    }

    @Operation(summary = "Upload a PDF for an invoice (super admin)")
    @PostMapping(value = "/invoices/{invoiceId}/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadInvoicePdf(
            @PathVariable String invoiceId,
            @RequestParam("file") MultipartFile file) {
        try {
            String originalName = Objects.requireNonNull(file.getOriginalFilename(), "").toLowerCase();
            if (file.isEmpty() || !originalName.endsWith(".pdf")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Only non-empty PDF files are accepted"));
            }
            String pdfUrl = billingService.uploadInvoicePdf(invoiceId, file);
            return ResponseEntity.ok(Map.of("pdfUrl", pdfUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("PDF upload error for invoice {}: {}", invoiceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "PDF upload failed: " + e.getMessage()));
        }
    }

    @Operation(summary = "Delete a plan permanently (super admin)")
    @DeleteMapping("/plans/{planId}")
    public ResponseEntity<?> deletePlan(@PathVariable String planId) {
        boolean deleted = billingService.deletePlan(planId);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Plan permanently deleted", "planId", planId));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Invoice Tampering Detection ───────────────────────────────────────────

    @Operation(summary = "Verify integrity of a single invoice (super admin)")
    @GetMapping("/invoices/{invoiceId}/verify")
    public ResponseEntity<?> verifyInvoice(@PathVariable String invoiceId) {
        try {
            TamperingCheckDTO result = invoiceTamperingService.verifyInvoice(invoiceId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Invoice verification error for {}: {}", invoiceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Run full integrity check on all invoices (super admin)")
    @GetMapping("/invoices/integrity-check")
    public ResponseEntity<?> verifyAllInvoices() {
        try {
            var results = invoiceTamperingService.verifyAllInvoices();
            long ok        = results.stream().filter(r -> "OK".equals(r.getIntegrityStatus())).count();
            long tampered  = results.stream().filter(r -> "TAMPERED".equals(r.getIntegrityStatus())).count();
            long notSigned = results.stream().filter(r -> "NOT_SIGNED".equals(r.getIntegrityStatus())).count();
            return ResponseEntity.ok(Map.of(
                "summary", Map.of("ok", ok, "tampered", tampered, "notSigned", notSigned, "total", results.size()),
                "details", results
            ));
        } catch (Exception e) {
            log.error("Full integrity check error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get active security alerts for the dashboard (super admin)")
    @GetMapping("/security/alerts")
    public ResponseEntity<?> getSecurityAlerts() {
        var alerts = securityAlertStore.getAlerts();
        return ResponseEntity.ok(Map.of(
            "count", alerts.size(),
            "hasAlerts", !alerts.isEmpty(),
            "alerts", alerts
        ));
    }

    @Operation(summary = "Clear security alerts after admin review (super admin)")
    @DeleteMapping("/security/alerts")
    public ResponseEntity<?> clearSecurityAlerts() {
        securityAlertStore.clearAlerts();
        return ResponseEntity.ok(Map.of("message", "Security alerts cleared"));
    }

    @Operation(summary = "Manually trigger the integrity check job now — fires email + in-app alerts immediately (test/admin)")
    @PostMapping("/invoices/trigger-integrity-check")
    public ResponseEntity<?> triggerIntegrityCheckNow() {
        try {
            invoiceTamperingService.triggerIntegrityCheckNow();
            return ResponseEntity.ok(Map.of("message", "Integrity check triggered. Email + alerts sent if tampering detected."));
        } catch (Exception e) {
            log.error("Manual integrity check error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Re-sign all invoices with updated hash algorithm (super admin — run once after hash change)")
    @PostMapping("/invoices/resign-all")
    public ResponseEntity<?> resignAllInvoices() {
        try {
            int count = invoiceTamperingService.resignAllInvoices();
            return ResponseEntity.ok(Map.of(
                "message", "All invoices re-signed successfully.",
                "count", count
            ));
        } catch (Exception e) {
            log.error("Failed to re-sign invoices: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Coupon Endpoints ─────────────────────────────────────────────────────

    @Operation(summary = "Validate a coupon code (public — called from payment page)")
    @GetMapping("/coupons/validate/{code}")
    public ResponseEntity<?> validateCoupon(
            @PathVariable String code,
            @RequestParam(defaultValue = "0") int amountCents) {
        try {
            return ResponseEntity.ok(couponService.validate(code, amountCents));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get active coupons for home page (public — no auth required)")
    @GetMapping("/coupons/active")
    public ResponseEntity<List<CouponDTO>> getActiveCoupons() {
        List<CouponDTO> active = couponService.getAllCoupons().stream()
            .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(active);
    }

    @Operation(summary = "List all coupons (super admin)")
    @GetMapping("/coupons")
    public ResponseEntity<List<CouponDTO>> getAllCoupons() {
        return ResponseEntity.ok(couponService.getAllCoupons());
    }

    @Operation(summary = "Create a new coupon (super admin)")
    @PostMapping("/coupons")
    public ResponseEntity<?> createCoupon(@RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(couponService.createCoupon(body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Toggle coupon active/inactive (super admin)")
    @PatchMapping("/coupons/{id}/toggle")
    public ResponseEntity<?> toggleCoupon(@PathVariable String id) {
        try {
            return ResponseEntity.ok(couponService.toggleActive(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Update a coupon (super admin)")
    @PutMapping("/coupons/{id}")
    public ResponseEntity<?> updateCoupon(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(couponService.updateCoupon(id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Delete a coupon (super admin)")
    @DeleteMapping("/coupons/{id}")
    public ResponseEntity<?> deleteCoupon(@PathVariable String id) {
        try {
            couponService.deleteCoupon(id);
            return ResponseEntity.ok(Map.of("message", "Coupon deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
