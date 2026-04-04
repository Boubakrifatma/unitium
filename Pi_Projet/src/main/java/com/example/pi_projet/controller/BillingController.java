package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.billing.*;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.BillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Billing", description = "Payment, plans, subscriptions, invoices, usage & payment attempts")
public class BillingController {

    private final BillingService billingService;

    // ── Public ────────────────────────────────────────────────────────────────

    @Operation(summary = "Submit a payment — creates org, user, subscription, invoice, line items, payment attempt & usage quota")
    @PostMapping("/payment")
    public ResponseEntity<?> submitPayment(@Valid @RequestBody PaymentRequestDTO request) {
        try {
            PaymentResponseDTO response = billingService.submitPayment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Payment error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Payment processing failed. Please try again."));
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
    @Operation(summary = "Get my payment record by email (fallback)")
    @GetMapping("/my-payment")
    public ResponseEntity<?> getMyPayment(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        return billingService.getPaymentByEmail(user.getEmail())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
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
}
