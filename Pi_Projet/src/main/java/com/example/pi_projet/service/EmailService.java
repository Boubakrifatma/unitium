package com.example.pi_projet.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${billing.from-email}")
    private String fromEmail;

    @Value("${billing.from-name}")
    private String fromName;

    @Value("${billing.admin-email}")
    private String adminEmail;

    @Value("${billing.app-url}")
    private String appUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 1 : Confirmation au client après soumission du paiement
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendPaymentConfirmationToClient(
            String toEmail,
            String adminName,
            String orgName,
            String planName,
            String billingCycle,
            double amount,
            String currency,
            String paymentId,
            String tempPassword,
            String estimatedValidationDate
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("✅ Payment Received – Awaiting Validation | " + orgName);

            String html = buildClientConfirmationEmail(
                adminName, orgName, planName, billingCycle,
                amount, currency, paymentId, tempPassword,
                toEmail, estimatedValidationDate
            );
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("✉️  Confirmation email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send confirmation email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 2 : Notification à l'admin pour valider le paiement
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendPaymentNotificationToAdmin(
            String clientEmail,
            String adminName,
            String orgName,
            String planName,
            String billingCycle,
            double amount,
            String currency,
            String paymentId,
            String phone,
            String address,
            String vatNumber,
            String orgType,
            int numUsers
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(adminEmail);
            helper.setSubject("🔔 New Payment Pending Validation – " + orgName + " | " + planName);

            String html = buildAdminNotificationEmail(
                clientEmail, adminName, orgName, planName,
                billingCycle, amount, currency, paymentId,
                phone, address, vatNumber, orgType, numUsers
            );
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("✉️  Admin notification sent for payment {}", paymentId);
        } catch (Exception e) {
            log.error("❌ Failed to send admin notification email: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 3 : Validation approuvée → accès accordé
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendPaymentApprovedEmail(
            String toEmail,
            String adminName,
            String orgName,
            String planName,
            String tempPassword,
            String paymentId
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("🎉 Access Granted – Welcome to Unitum | " + orgName);
            helper.setText(buildApprovedEmail(adminName, orgName, planName, tempPassword, toEmail, paymentId), true);
            mailSender.send(msg);
            log.info("✉️  Approval email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send approval email: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 4 : Paiement rejeté
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendPaymentRejectedEmail(String toEmail, String adminName, String orgName, String reason) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("❌ Payment Rejected – " + orgName);
            helper.setText(buildRejectedEmail(adminName, orgName, reason), true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("❌ Failed to send rejection email: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 5 : Bienvenue avec Invoice (premier accès — remplace sendPaymentApprovedEmail)
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendWelcomeWithInvoiceEmail(
            String toEmail, String adminName, String orgName, String planName,
            String billingCycle, double subtotal, double taxAmount, double total,
            String currency, String invoiceNumber, String paymentId, String tempPassword
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("🎉 Welcome to Unitum — Invoice " + invoiceNumber + " | " + orgName);
            helper.setText(buildWelcomeInvoiceEmail(adminName, orgName, planName, billingCycle,
                    subtotal, taxAmount, total, currency, invoiceNumber, paymentId, tempPassword, toEmail), true);
            mailSender.send(msg);
            log.info("✉️  Welcome+Invoice email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send welcome+invoice email: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 6 : Upgrade avec Invoice (user déjà connecté)
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendUpgradeInvoiceEmail(
            String toEmail, String adminName, String orgName, String planName,
            String billingCycle, double subtotal, double taxAmount, double total,
            String currency, String invoiceNumber, String paymentId
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("✅ Subscription Upgraded — Invoice " + invoiceNumber + " | " + orgName);
            helper.setText(buildUpgradeInvoiceEmail(adminName, orgName, planName, billingCycle,
                    subtotal, taxAmount, total, currency, invoiceNumber, paymentId), true);
            mailSender.send(msg);
            log.info("✉️  Upgrade+Invoice email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send upgrade+invoice email: {}", e.getMessage(), e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HTML Templates
    // ═════════════════════════════════════════════════════════════════════════

    private String buildClientConfirmationEmail(
            String name, String orgName, String planName, String billingCycle,
            double amount, String currency, String paymentId, String tempPassword,
            String email, String estimatedDate) {

        String amountStr = currency + " " + String.format("%.2f", amount);
        String cycleLabel = "ANNUAL".equalsIgnoreCase(billingCycle) ? "Annual" : "Monthly";

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>" +
            // Header
            "<div style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:40px 40px 30px;text-align:center'>" +
            "<h1 style='color:#ffffff;margin:0;font-size:24px;font-weight:700'>Payment Received</h1>" +
            "<p style='color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px'>Your subscription request is under review</p>" +
            "</div>" +
            // Body
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px;line-height:1.6'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>We have successfully received your payment for <strong>" + orgName + "</strong>. Our admin team will manually validate your transaction within 1-2 business days. You will receive another email once access is granted.</p>" +
            // Info box
            "<div style='background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;border-left:4px solid #2563eb'>" +
            "<h3 style='color:#1e293b;margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:1px'>Subscription Details</h3>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            row("Plan", planName) +
            row("Billing Cycle", cycleLabel) +
            row("Amount", amountStr) +
            row("Transaction ID", "<code style='background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:12px;color:#2563eb'>" + paymentId + "</code>") +
            row("Organization", orgName) +
            row("Estimated Validation", estimatedDate) +
            "</table></div>" +
            // Password
            "<div style='background:#fef3c7;border-radius:12px;padding:20px 24px;margin:20px 0;border-left:4px solid #f59e0b'>" +
            "<p style='margin:0 0 8px;font-weight:700;color:#92400e;font-size:14px'>⚠️ Your Temporary Password</p>" +
            "<p style='margin:0 0 12px;color:#78350f;font-size:13px'>Save this password – you will need it to log in once your account is activated:</p>" +
            "<div style='text-align:center;background:#fff;border-radius:8px;padding:14px;border:2px dashed #f59e0b'>" +
            "<code style='font-size:22px;font-weight:700;color:#1e293b;letter-spacing:3px'>" + tempPassword + "</code></div>" +
            "<p style='margin:10px 0 0;font-size:12px;color:#92400e'>Email: <strong>" + email + "</strong></p>" +
            "</div>" +
            "<p style='color:#64748b;font-size:13px;line-height:1.7'>If you did not initiate this request, please contact us immediately at <a href='mailto:" + adminEmail + "' style='color:#2563eb'>" + adminEmail + "</a>.</p>" +
            "</div>" +
            // Footer
            "<div style='background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Powered by Evenix Group</p>" +
            "</div></div></body></html>";
    }

    private String buildAdminNotificationEmail(
            String clientEmail, String adminName, String orgName, String planName,
            String billingCycle, double amount, String currency, String paymentId,
            String phone, String address, String vatNumber, String orgType, int numUsers) {

        String amountStr = currency + " " + String.format("%.2f", amount);
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>" +
            "<div style='background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:40px 40px 30px;text-align:center'>" +
            "<h1 style='color:#ffffff;margin:0;font-size:24px;font-weight:700'>🔔 New Payment Pending</h1>" +
            "<p style='color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px'>Requires your manual validation</p>" +
            "</div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>A new payment has been submitted and requires your validation.</p>" +
            "<div style='background:#f8fafc;border-radius:12px;padding:24px;margin:20px 0;border-left:4px solid #7c3aed'>" +
            "<h3 style='color:#1e293b;margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:1px'>Payment Details</h3>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            row("Transaction ID", "<code style='background:#e2e8f0;padding:2px 8px;border-radius:4px;color:#7c3aed'>" + paymentId + "</code>") +
            row("Organization", orgName) +
            row("Admin Name", adminName) +
            row("Admin Email", clientEmail) +
            row("Phone", phone != null ? phone : "N/A") +
            row("Plan", planName) +
            row("Billing Cycle", billingCycle) +
            row("Amount", amountStr) +
            row("Org Type", orgType) +
            row("Num Users", String.valueOf(numUsers)) +
            row("Address", address != null ? address : "N/A") +
            row("VAT Number", vatNumber != null && !vatNumber.isEmpty() ? vatNumber : "N/A") +
            "</table></div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/admin/billing/payments' style='display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:15px'>Validate in Dashboard</a>" +
            "</div>" +
            "</div>" +
            "<div style='background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum Admin · Transaction: " + paymentId + "</p>" +
            "</div></div></body></html>";
    }

    private String buildApprovedEmail(String name, String orgName, String planName, String tempPassword, String email, String paymentId) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>" +
            "<div style='background:linear-gradient(135deg,#059669,#047857);padding:40px;text-align:center'>" +
            "<div style='width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px'>" +
            "<span style='font-size:32px'>🎉</span></div>" +
            "<h1 style='color:#fff;margin:0;font-size:26px'>Access Granted!</h1>" +
            "<p style='color:rgba(255,255,255,0.85);margin:8px 0 0'>Your Unitum subscription is now active</p></div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>Great news! Your payment for <strong>" + orgName + "</strong> has been validated. Your <strong>" + planName + "</strong> subscription is now active.</p>" +
            "<div style='background:#f0fdf4;border-radius:12px;padding:20px 24px;margin:20px 0;border-left:4px solid #059669'>" +
            "<p style='margin:0 0 8px;font-weight:700;color:#166534'>🔑 Your Login Credentials</p>" +
            "<p style='margin:0 0 4px;color:#166534;font-size:14px'>Email: <strong>" + email + "</strong></p>" +
            "<p style='margin:0;color:#166534;font-size:14px'>Password: <code style='background:#d1fae5;padding:2px 8px;border-radius:4px;font-size:16px;font-weight:700'>" + tempPassword + "</code></p>" +
            "</div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/auth/login' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>Login to Unitum →</a>" +
            "</div></div>" +
            "<div style='background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Tx: " + paymentId + "</p>" +
            "</div></div></body></html>";
    }

    private String buildRejectedEmail(String name, String orgName, String reason) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden'>" +
            "<div style='background:#dc2626;padding:40px;text-align:center'>" +
            "<h1 style='color:#fff;margin:0'>Payment Rejected</h1></div>" +
            "<div style='padding:36px 40px'>" +
            "<p>Hello <strong>" + name + "</strong>,</p>" +
            "<p>Unfortunately, your payment for <strong>" + orgName + "</strong> has been rejected.</p>" +
            "<p><strong>Reason:</strong> " + (reason != null ? reason : "Manual review failed") + "</p>" +
            "<p>Please contact us at <a href='mailto:" + adminEmail + "'>" + adminEmail + "</a> for more information.</p>" +
            "</div></div></body></html>";
    }

    private String buildWelcomeInvoiceEmail(
            String name, String orgName, String planName, String billingCycle,
            double subtotal, double taxAmount, double total, String currency,
            String invoiceNumber, String paymentId, String tempPassword, String email) {

        String invoiceTable =
            "<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:13px'>" +
            "<thead><tr style='background:#f1f5f9'>" +
            "<th style='padding:10px 12px;text-align:left;color:#64748b;font-weight:600'>Description</th>" +
            "<th style='padding:10px 12px;text-align:right;color:#64748b;font-weight:600'>Amount</th>" +
            "</tr></thead><tbody>" +
            "<tr><td style='padding:10px 12px;border-bottom:1px solid #f1f5f9'>" + planName + " Plan – " + billingCycle + " Subscription</td>" +
            "<td style='padding:10px 12px;text-align:right;border-bottom:1px solid #f1f5f9'>" + currency + " " + String.format("%.2f", subtotal) + "</td></tr>" +
            "<tr><td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b'>VAT 19%</td>" +
            "<td style='padding:10px 12px;text-align:right;border-bottom:1px solid #f1f5f9;color:#64748b'>" + currency + " " + String.format("%.2f", taxAmount) + "</td></tr>" +
            "</tbody><tfoot>" +
            "<tr style='background:#f8fafc'><td style='padding:12px;font-weight:700;font-size:14px'>Total</td>" +
            "<td style='padding:12px;text-align:right;font-weight:700;font-size:14px;color:#059669'>" + currency + " " + String.format("%.2f", total) + "</td></tr>" +
            "</tfoot></table>";

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:620px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#059669,#047857);padding:40px;text-align:center'>" +
            "<span style='font-size:42px'>🎉</span>" +
            "<h1 style='color:#fff;margin:12px 0 4px;font-size:26px'>Access Granted!</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:0'>Your Unitum subscription is now active</p></div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>Your payment for <strong>" + orgName + "</strong> has been confirmed. Your <strong>" + planName + "</strong> subscription is now active.</p>" +
            "<div style='background:#f0fdf4;border-radius:12px;padding:20px 24px;margin:20px 0;border-left:4px solid #059669'>" +
            "<p style='margin:0 0 8px;font-weight:700;color:#166534'>🔑 Your Login Credentials</p>" +
            "<p style='margin:0 0 4px;color:#166534;font-size:14px'>Email: <strong>" + email + "</strong></p>" +
            "<p style='margin:0;color:#166534;font-size:14px'>Temporary Password: <code style='background:#d1fae5;padding:2px 8px;border-radius:4px;font-size:15px;font-weight:700'>" + tempPassword + "</code></p>" +
            "<p style='margin:6px 0 0;color:#166534;font-size:12px;opacity:.8'>⚠ You will be asked to change this password on first login.</p>" +
            "</div>" +
            "<div style='background:#f8fafc;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid #e2e8f0'>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'>" +
            "<h3 style='margin:0;font-size:15px;color:#1e293b'>📄 Invoice " + invoiceNumber + "</h3>" +
            "<span style='background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700'>PAID</span>" +
            "</div>" +
            invoiceTable +
            "</div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/auth/login' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>Login to Unitum →</a>" +
            "</div></div>" +
            "<div style='background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Invoice: " + invoiceNumber + " · Tx: " + paymentId + "</p>" +
            "</div></div></body></html>";
    }

    private String buildUpgradeInvoiceEmail(
            String name, String orgName, String planName, String billingCycle,
            double subtotal, double taxAmount, double total, String currency,
            String invoiceNumber, String paymentId) {

        String invoiceTable =
            "<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:13px'>" +
            "<thead><tr style='background:#f1f5f9'>" +
            "<th style='padding:10px 12px;text-align:left;color:#64748b;font-weight:600'>Description</th>" +
            "<th style='padding:10px 12px;text-align:right;color:#64748b;font-weight:600'>Amount</th>" +
            "</tr></thead><tbody>" +
            "<tr><td style='padding:10px 12px;border-bottom:1px solid #f1f5f9'>" + planName + " Plan – " + billingCycle + " Subscription</td>" +
            "<td style='padding:10px 12px;text-align:right;border-bottom:1px solid #f1f5f9'>" + currency + " " + String.format("%.2f", subtotal) + "</td></tr>" +
            "<tr><td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b'>VAT 19%</td>" +
            "<td style='padding:10px 12px;text-align:right;border-bottom:1px solid #f1f5f9;color:#64748b'>" + currency + " " + String.format("%.2f", taxAmount) + "</td></tr>" +
            "</tbody><tfoot>" +
            "<tr style='background:#f8fafc'><td style='padding:12px;font-weight:700;font-size:14px'>Total</td>" +
            "<td style='padding:12px;text-align:right;font-weight:700;font-size:14px;color:#2563eb'>" + currency + " " + String.format("%.2f", total) + "</td></tr>" +
            "</tfoot></table>";

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:620px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:40px;text-align:center'>" +
            "<span style='font-size:42px'>✅</span>" +
            "<h1 style='color:#fff;margin:12px 0 4px;font-size:26px'>Subscription Upgraded!</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:0'>Your plan has been successfully upgraded</p></div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>Your subscription for <strong>" + orgName + "</strong> has been upgraded to the <strong>" + planName + "</strong> plan. Your new plan is now active.</p>" +
            "<div style='background:#f8fafc;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid #e2e8f0'>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'>" +
            "<h3 style='margin:0;font-size:15px;color:#1e293b'>📄 Invoice " + invoiceNumber + "</h3>" +
            "<span style='background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700'>PAID</span>" +
            "</div>" +
            invoiceTable +
            "</div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/app/org-billing' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>View My Billing →</a>" +
            "</div></div>" +
            "<div style='background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Invoice: " + invoiceNumber + " · Tx: " + paymentId + "</p>" +
            "</div></div></body></html>";
    }

    private String row(String label, String value) {
        return "<tr><td style='padding:6px 0;color:#64748b;font-size:13px;width:150px'>" + label + ":</td>" +
               "<td style='padding:6px 0;color:#1e293b;font-size:13px;font-weight:600'>" + value + "</td></tr>";
    }
}
