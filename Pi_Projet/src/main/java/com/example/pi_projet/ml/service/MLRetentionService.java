package com.example.pi_projet.ml.service;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.repository.OrganizationRepository;
import com.example.pi_projet.service.CouponService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MLRetentionService {

    private final CouponService          couponService;
    private final OrganizationRepository organizationRepository;
    private final JavaMailSender         mailSender;

    @Value("${billing.from-email:unitumgroup1@gmail.com}")
    private String fromEmail;

    @Value("${billing.from-name:Unitum Billing}")
    private String fromName;

    @Value("${billing.app-url:http://localhost:4200}")
    private String appUrl;

    public void createAndSendRetentionCoupon(UUID orgId, int discountPercent) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        String code = ("RETAIN-" + org.getSlug() + "-" + discountPercent).toUpperCase();

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
            log.warn("[ML Retention] Coupon creation skipped (may already exist): {}", e.getMessage());
        }

        try {
            sendRetentionCouponEmail(org, code, discountPercent);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send coupon email to org {}: {}", orgId, e.getMessage(), e);
        }
    }

    public void sendChurnRetentionEmail(UUID orgId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        String to = resolveEmail(org);
        if (to == null) {
            log.warn("[ML Retention] No email address for org {}, skipping retention email", orgId);
            return;
        }

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject("We miss you at Unitum – special offer inside");
            helper.setText(buildReEngagementHtml(org), true);
            mailSender.send(msg);
            log.info("[ML Retention] Retention email sent to {}", to);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send retention email to {}: {}", to, e.getMessage(), e);
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private void sendRetentionCouponEmail(Organization org, String code, int discountPercent) {
        String to = resolveEmail(org);
        if (to == null) {
            log.warn("[ML Retention] No email for org {}, coupon not emailed", org.getId());
            return;
        }

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject("A special offer just for you – " + discountPercent + "% off your next invoice");
            helper.setText(buildCouponHtml(org, code, discountPercent), true);
            mailSender.send(msg);
            log.info("[ML Retention] Coupon email sent to {} with code {}", to, code);
        } catch (Exception e) {
            log.error("[ML Retention] Failed to send coupon email to {}: {}", to, e.getMessage(), e);
        }
    }

    private String resolveEmail(Organization org) {
        if (org.getBillingEmail() != null && !org.getBillingEmail().isBlank()) {
            return org.getBillingEmail();
        }
        return null;
    }

    private String buildCouponHtml(Organization org, String code, int discountPercent) {
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif">
              <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
                <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:40px;text-align:center">
                  <h1 style="color:#fff;margin:0;font-size:28px">🎁 Special Offer for %s</h1>
                </div>
                <div style="padding:40px">
                  <p style="font-size:16px;color:#1e293b">Hi <strong>%s</strong> team,</p>
                  <p style="font-size:15px;color:#475569">As a valued Unitum customer, we'd like to offer you <strong>%d%% off</strong> your next billing cycle.</p>
                  <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
                    <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Your coupon code</p>
                    <p style="margin:0;font-size:28px;font-weight:700;color:#6366f1;letter-spacing:4px">%s</p>
                  </div>
                  <div style="text-align:center;margin:32px 0">
                    <a href="%s/billing" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Apply Coupon</a>
                  </div>
                  <p style="font-size:13px;color:#94a3b8">This offer is valid for one use only.</p>
                </div>
                <div style="background:#f8fafc;padding:20px;text-align:center">
                  <p style="margin:0;font-size:13px;color:#94a3b8">The Unitum Team</p>
                </div>
              </div>
            </body></html>
            """.formatted(org.getName(), org.getName(), discountPercent, code, appUrl);
    }

    private String buildReEngagementHtml(Organization org) {
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif">
              <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
                <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:40px;text-align:center">
                  <h1 style="color:#fff;margin:0;font-size:28px">We miss you, %s! 👋</h1>
                </div>
                <div style="padding:40px">
                  <p style="font-size:15px;color:#475569">We noticed you haven't been as active on Unitum lately. We'd love to help you get the most out of your plan.</p>
                  <div style="text-align:center;margin:32px 0">
                    <a href="%s" style="background:#0ea5e9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Log in to Unitum</a>
                  </div>
                  <p style="font-size:13px;color:#94a3b8">If there's anything we can do to improve your experience, simply reply to this email.</p>
                </div>
                <div style="background:#f8fafc;padding:20px;text-align:center">
                  <p style="margin:0;font-size:13px;color:#94a3b8">The Unitum Team</p>
                </div>
              </div>
            </body></html>
            """.formatted(org.getName(), appUrl);
    }
}
