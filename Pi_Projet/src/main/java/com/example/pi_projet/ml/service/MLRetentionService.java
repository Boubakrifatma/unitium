package com.example.pi_projet.ml.service;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.repository.OrganizationRepository;
import com.example.pi_projet.service.CouponService;
import com.example.pi_projet.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * ML-specific retention actions.
 * Adds createAndSendRetentionCoupon and sendChurnRetentionEmail methods
 * that are called by MLService after a churn prediction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MLRetentionService {

    private final CouponService          couponService;
    private final OrganizationRepository organizationRepository;
    private final JavaMailSender         mailSender;

    @Value("${billing.from-email:billing@unitum.io}")
    private String fromEmail;

    @Value("${billing.app-url:http://localhost:4200}")
    private String appUrl;

    /**
     * Creates a retention coupon with the given discount percentage
     * and logs it for the organization.
     *
     * @param orgId           target organization UUID
     * @param discountPercent discount percentage (e.g. 30 for 30%)
     */
    public void createAndSendRetentionCoupon(UUID orgId, int discountPercent) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        // Build coupon code: RETAIN-<ORGSLUG>-<PERCENT>
        String code = ("RETAIN-" + org.getSlug() + "-" + discountPercent).toUpperCase();

        // Create via existing CouponService
        try {
            couponService.createCoupon(Map.of(
                    "code", code,
                    "discountType", "PERCENTAGE",
                    "discountValue", (double) discountPercent,
                    "description", "Retention offer – " + discountPercent + "% off next billing cycle",
                    "maxUses", 1
            ));
            log.info("[ML Retention] Created {}% coupon '{}' for org {}", discountPercent, code, orgId);
        } catch (Exception e) {
            // Coupon might already exist – that's OK
            log.warn("[ML Retention] Coupon creation skipped (may already exist): {}", e.getMessage());
        }

        // Send email notification
        try {
            sendRetentionCouponEmail(org, code, discountPercent);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send coupon email to org {}: {}", orgId, e.getMessage());
        }
    }

    /**
     * Sends a generic re-engagement email to the organization's billing email.
     *
     * @param orgId target organization UUID
     */
    public void sendChurnRetentionEmail(UUID orgId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        String to = org.getBillingEmail() != null ? org.getBillingEmail()
                : (org.getOwner() != null ? org.getOwner().getEmail() : null);

        if (to == null) {
            log.warn("[ML Retention] No email address for org {}, skipping retention email", orgId);
            return;
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromEmail);
        msg.setTo(to);
        msg.setSubject("We miss you at Unitum – special offer inside");
        msg.setText("""
                Hi %s team,

                We noticed you haven't been as active on Unitum lately. We'd love to help you get the most out of your plan.

                Log in now to see what's new: %s

                If there's anything we can do to improve your experience, simply reply to this email — our team is here for you.

                Best,
                The Unitum Team
                """.formatted(org.getName(), appUrl));

        try {
            mailSender.send(msg);
            log.info("[ML Retention] Retention email sent to {}", to);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send retention email to {}: {}", to, e.getMessage());
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private void sendRetentionCouponEmail(Organization org, String code, int discountPercent) {
        String to = org.getBillingEmail() != null ? org.getBillingEmail()
                : (org.getOwner() != null ? org.getOwner().getEmail() : null);

        if (to == null) {
            log.warn("[ML Retention] No email for org {}, coupon not emailed", org.getId());
            return;
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromEmail);
        msg.setTo(to);
        msg.setSubject("A special offer just for you – " + discountPercent + "% off your next invoice");
        msg.setText("""
                Hi %s team,

                As a valued Unitum customer, we'd like to offer you %d%% off your next billing cycle.

                Use code: %s

                Apply it at checkout: %s/billing

                This offer is valid for one use. Don't hesitate to reach out if you have any questions.

                Best,
                The Unitum Team
                """.formatted(org.getName(), discountPercent, code, appUrl));

        try {
            mailSender.send(msg);
            log.info("[ML Retention] Coupon email sent to {} with code {}", to, code);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send coupon email to {}: {}", to, e.getMessage());
        }
    }
}
