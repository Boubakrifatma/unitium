package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.TamperingCheckDTO;
import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceTamperingService {

    @Value("${billing.integrity.secret}")
    private String secret;

    private final InvoiceRepository  invoiceRepository;
    private final EmailService        emailService;
    private final SecurityAlertStore  alertStore;

    // ── Hash Generation ───────────────────────────────────────────────────────

    /**
     * Generates an HMAC-SHA256 hash from the critical financial fields of the invoice.
     * Any modification to these fields after signing will produce a different hash.
     */
    public String generateHash(Invoice invoice) {
        String data = String.join("|",
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getOrganization().getId().toString(),
            invoice.getSubscription().getId().toString(),
            String.valueOf(invoice.getSubtotalCents()),
            String.valueOf(invoice.getTaxAmountCents()),
            String.valueOf(invoice.getTotalCents()),
            invoice.getCurrency(),
            invoice.getStatus().name(),
            invoice.getCouponCode()          != null ? invoice.getCouponCode()                              : "",
            invoice.getDiscountAmountCents() != null ? String.valueOf(invoice.getDiscountAmountCents())     : "0"
        );
        return hmacSha256(data, secret);
    }

    // ── Single Invoice Verification ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public TamperingCheckDTO verifyInvoice(String invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithAssociations(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));
        return checkInvoice(invoice);
    }

    // ── Full Integrity Check ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TamperingCheckDTO> verifyAllInvoices() {
        return invoiceRepository.findAllWithAssociations().stream()
            .map(this::checkInvoice)
            .collect(Collectors.toList());
    }

    // ── Re-sign all invoices (use after hash algorithm change) ───────────────

    @Transactional
    public int resignAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAllWithAssociations();
        int count = 0;
        for (Invoice invoice : invoices) {
            String newHash = generateHash(invoice);
            invoice.setIntegrityHash(newHash);
            invoiceRepository.save(invoice);
            count++;
        }
        log.info("Re-signed {} invoices with updated hash algorithm.", count);
        return count;
    }

    // ── Scheduled Job ─────────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    public void scheduledIntegrityCheck() {
        log.info("Starting scheduled invoice integrity check...");
        List<TamperingCheckDTO> results = verifyAllInvoices();

        long ok        = results.stream().filter(r -> "OK".equals(r.getIntegrityStatus())).count();
        long notSigned = results.stream().filter(r -> "NOT_SIGNED".equals(r.getIntegrityStatus())).count();

        List<TamperingCheckDTO> tamperedList = results.stream()
            .filter(r -> "TAMPERED".equals(r.getIntegrityStatus()))
            .toList();

        log.info("Integrity check complete — OK: {}, NOT_SIGNED: {}, TAMPERED: {}", ok, notSigned, tamperedList.size());

        if (!tamperedList.isEmpty()) {
            tamperedList.forEach(r -> log.error(
                "TAMPERED INVOICE — id: {}, number: {}, org: {}",
                r.getInvoiceId(), r.getInvoiceNumber(), r.getOrgName()
            ));
            // Send email alert to admin
            emailService.sendTamperingAlertEmail(tamperedList);
            // Store alerts for in-app dashboard notification
            alertStore.addAlerts(tamperedList);
        }
    }

    // ── Internal Check ────────────────────────────────────────────────────────

    private TamperingCheckDTO checkInvoice(Invoice invoice) {
        if (invoice.getIntegrityHash() == null) {
            return TamperingCheckDTO.notSigned(invoice);
        }
        String computedHash = generateHash(invoice);
        boolean intact = computedHash.equals(invoice.getIntegrityHash());
        return intact
            ? TamperingCheckDTO.ok(invoice)
            : TamperingCheckDTO.tampered(invoice, computedHash);
    }

    // ── HMAC-SHA256 ───────────────────────────────────────────────────────────

    private String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC-SHA256 hash", e);
        }
    }
}
