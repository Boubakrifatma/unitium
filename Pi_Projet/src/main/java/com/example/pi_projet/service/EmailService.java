package com.example.pi_projet.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
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
            String currency, String invoiceNumber, String paymentId, String tempPassword,
            byte[] pdfBytes
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("🎉 Welcome to Unitum — Invoice " + invoiceNumber + " | " + orgName);
            helper.setText(buildWelcomeInvoiceEmail(adminName, orgName, planName, billingCycle,
                    subtotal, taxAmount, total, currency, invoiceNumber, paymentId, tempPassword, toEmail), true);
            if (pdfBytes != null && pdfBytes.length > 0) {
                helper.addAttachment(invoiceNumber + ".pdf", new ByteArrayDataSource(pdfBytes, "application/pdf"));
            }
            mailSender.send(msg);
            log.info("✉️  Welcome+Invoice email sent to {} (PDF attached: {})", toEmail, pdfBytes != null && pdfBytes.length > 0);
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
            String currency, String invoiceNumber, String paymentId,
            byte[] pdfBytes
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("✅ Subscription Upgraded — Invoice " + invoiceNumber + " | " + orgName);
            helper.setText(buildUpgradeInvoiceEmail(adminName, orgName, planName, billingCycle,
                    subtotal, taxAmount, total, currency, invoiceNumber, paymentId), true);
            if (pdfBytes != null && pdfBytes.length > 0) {
                helper.addAttachment(invoiceNumber + ".pdf", new ByteArrayDataSource(pdfBytes, "application/pdf"));
            }
            mailSender.send(msg);
            log.info("✉️  Upgrade+Invoice email sent to {} (PDF attached: {})", toEmail, pdfBytes != null && pdfBytes.length > 0);
        } catch (Exception e) {
            log.error("❌ Failed to send upgrade+invoice email: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 7 : Invitation d'un membre par un Admin
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendMemberInviteEmail(
            String toEmail,
            String fullName,
            String orgName,
            String platformRole,
            String tempPassword
    ) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("🎉 You've been invited to join " + orgName + " on Unitum");
            helper.setText(buildMemberInviteEmail(fullName, orgName, platformRole, tempPassword, toEmail), true);
            mailSender.send(msg);
            log.info("✉️  Invite email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send invite email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 8 : Invitation avec boutons Accept / Decline
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendInvitationEmail(String toEmail, String fullName, String orgName,
                                    String platformRole, String acceptUrl, String declineUrl) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("You're invited to join " + orgName + " on Unitum");
            String name = (fullName != null && !fullName.isBlank()) ? fullName : "there";
            String html = """
                <div style="font-family:Inter,Arial,sans-serif;max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
                  <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:36px;text-align:center">
                    <div style="font-size:2.8rem;margin-bottom:12px">🏢</div>
                    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">You're invited!</h1>
                    <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0">Join <strong>%s</strong> on Unitum</p>
                  </div>
                  <div style="padding:36px">
                    <p style="color:#374151;font-size:15px;margin:0 0 8px">Hi <strong>%s</strong>,</p>
                    <p style="color:#6b7280;font-size:14px;margin:0 0 8px">
                      You have been invited to join the organization <strong>%s</strong> with the role <strong>%s</strong>.
                    </p>
                    <p style="color:#6b7280;font-size:13px;margin:0 0 28px">This invitation expires in <strong>48 hours</strong>.</p>

                    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:28px">
                      <a href="%s" style="display:inline-block;background:#10b981;color:#fff;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none">
                        ✅ Accept Invitation
                      </a>
                      <a href="%s" style="display:inline-block;background:#f3f4f6;color:#374151;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid #e5e7eb">
                        ❌ Decline
                      </a>
                    </div>

                    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
                      If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                  </div>
                </div>
                """.formatted(orgName, name, orgName, platformRole, acceptUrl, declineUrl);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("✉️  Invitation email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send invitation email to {}: {}", toEmail, e.getMessage());
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
            "<div style='background:#fffbeb;border-radius:12px;padding:16px 24px;margin:20px 0;border-left:4px solid #f59e0b;display:flex;align-items:center;gap:12px'>" +
            "<span style='font-size:28px'>📎</span>" +
            "<div><p style='margin:0;font-weight:700;color:#92400e;font-size:14px'>Invoice " + invoiceNumber + " attached</p>" +
            "<p style='margin:4px 0 0;color:#78350f;font-size:13px'>Your official invoice is attached to this email as a PDF.</p></div>" +
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

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:620px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:40px;text-align:center'>" +
            "<span style='font-size:42px'>✅</span>" +
            "<h1 style='color:#fff;margin:12px 0 4px;font-size:26px'>Subscription Upgraded!</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:0'>Your plan has been successfully upgraded</p></div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>Your subscription for <strong>" + orgName + "</strong> has been upgraded to the <strong>" + planName + "</strong> plan. Your new plan is now active.</p>" +
            "<div style='background:#fffbeb;border-radius:12px;padding:16px 24px;margin:20px 0;border-left:4px solid #f59e0b;display:flex;align-items:center;gap:12px'>" +
            "<span style='font-size:28px'>📎</span>" +
            "<div><p style='margin:0;font-weight:700;color:#92400e;font-size:14px'>Invoice " + invoiceNumber + " attached</p>" +
            "<p style='margin:4px 0 0;color:#78350f;font-size:13px'>Your official invoice is attached to this email as a PDF.</p></div>" +
            "</div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/app/org-billing' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>View My Billing →</a>" +
            "</div></div>" +
            "<div style='background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Invoice: " + invoiceNumber + " · Tx: " + paymentId + "</p>" +
            "</div></div></body></html>";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 7 : Alerte de falsification de facture (super admin)
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendTamperingAlertEmail(java.util.List<com.example.pi_projet.dto.billing.TamperingCheckDTO> tamperedInvoices) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(adminEmail);
            helper.setSubject("🚨 SECURITY ALERT — Invoice Tampering Detected (" + tamperedInvoices.size() + " invoice(s))");
            helper.setText(buildTamperingAlertEmail(tamperedInvoices), true);
            mailSender.send(msg);
            log.warn("🚨 Tamper alert email sent to admin for {} invoice(s)", tamperedInvoices.size());
        } catch (Exception e) {
            log.error("Failed to send tamper alert email: {}", e.getMessage(), e);
        }
    }

    private String buildTamperingAlertEmail(java.util.List<com.example.pi_projet.dto.billing.TamperingCheckDTO> list) {
        StringBuilder rows = new StringBuilder();
        for (com.example.pi_projet.dto.billing.TamperingCheckDTO item : list) {
            rows.append("<tr style='background:#fff5f5'>")
                .append("<td style='padding:10px 12px;font-size:13px;color:#dc2626;font-weight:700'>").append(item.getInvoiceNumber()).append("</td>")
                .append("<td style='padding:10px 12px;font-size:13px;color:#1e293b'>").append(item.getOrgName() != null ? item.getOrgName() : "—").append("</td>")
                .append("<td style='padding:10px 12px;font-size:11px;color:#64748b;font-family:monospace'>").append(item.getStoredHash() != null ? item.getStoredHash().substring(0, 16) + "..." : "—").append("</td>")
                .append("<td style='padding:10px 12px;font-size:11px;color:#dc2626;font-family:monospace'>").append(item.getComputedHash() != null ? item.getComputedHash().substring(0, 16) + "..." : "—").append("</td>")
                .append("<td style='padding:10px 12px;font-size:12px;color:#64748b'>").append(item.getCheckedAt()).append("</td>")
                .append("</tr>");
        }
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:700px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#dc2626,#991b1b);padding:40px;text-align:center'>" +
            "<span style='font-size:48px'>🚨</span>" +
            "<h1 style='color:#fff;margin:12px 0 4px;font-size:26px'>Invoice Tampering Detected</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:0'>Immediate action required — " + list.size() + " invoice(s) compromised</p></div>" +
            "<div style='padding:36px 40px'>" +
            "<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:24px'>" +
            "<p style='margin:0;color:#991b1b;font-size:14px;font-weight:600'>⚠ What happened?</p>" +
            "<p style='margin:6px 0 0;color:#dc2626;font-size:13px;line-height:1.6'>The scheduled integrity check detected that one or more invoices have been modified directly in the database after their cryptographic signature was generated. This may indicate unauthorized access or data manipulation.</p>" +
            "</div>" +
            "<h3 style='color:#1e293b;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px'>Affected Invoices</h3>" +
            "<table style='width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #fecaca'>" +
            "<thead><tr style='background:#fee2e2'>" +
            "<th style='padding:10px 12px;text-align:left;color:#991b1b;font-size:12px'>Invoice #</th>" +
            "<th style='padding:10px 12px;text-align:left;color:#991b1b;font-size:12px'>Organization</th>" +
            "<th style='padding:10px 12px;text-align:left;color:#991b1b;font-size:12px'>Stored Hash</th>" +
            "<th style='padding:10px 12px;text-align:left;color:#991b1b;font-size:12px'>Computed Hash</th>" +
            "<th style='padding:10px 12px;text-align:left;color:#991b1b;font-size:12px'>Detected At</th>" +
            "</tr></thead><tbody>" + rows + "</tbody></table>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/billing/admin-payments' style='display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>View in Dashboard →</a>" +
            "</div>" +
            "<p style='color:#64748b;font-size:12px;text-align:center'>This alert was generated automatically by the Unitum Billing Security System.</p>" +
            "</div>" +
            "<div style='background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum Security · Automated Integrity Check</p>" +
            "</div></div></body></html>";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL 8 : Invitation d'un membre (membership module)
    // ─────────────────────────────────────────────────────────────────────────
    private String buildMemberInviteEmail(String name, String orgName, String platformRole, String tempPassword, String email) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f0f4fa;font-family:Segoe UI,Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>" +
            "<div style='background:linear-gradient(135deg,#6366f1,#4f46e5);padding:40px;text-align:center'>" +
            "<span style='font-size:42px'>👋</span>" +
            "<h1 style='color:#fff;margin:12px 0 4px;font-size:26px'>You're Invited!</h1>" +
            "<p style='color:rgba(255,255,255,.85);margin:0'>You've been added to <strong>" + orgName + "</strong></p></div>" +
            "<div style='padding:36px 40px'>" +
            "<p style='color:#1e293b;font-size:15px'>Hello <strong>" + name + "</strong>,</p>" +
            "<p style='color:#475569;font-size:14px;line-height:1.7'>You have been invited to join <strong>" + orgName + "</strong> on <strong>Unitum</strong> as a <strong>" + platformRole + "</strong>. Your account has been created — use the credentials below to log in.</p>" +
            "<div style='background:#f0f4ff;border-radius:12px;padding:20px 24px;margin:20px 0;border-left:4px solid #6366f1'>" +
            "<p style='margin:0 0 8px;font-weight:700;color:#3730a3;font-size:14px'>🔑 Your Login Credentials</p>" +
            "<p style='margin:0 0 4px;color:#3730a3;font-size:14px'>Email: <strong>" + email + "</strong></p>" +
            "<p style='margin:0 0 4px;color:#3730a3;font-size:14px'>Temporary Password: <code style='background:#e0e7ff;padding:2px 10px;border-radius:4px;font-size:16px;font-weight:700'>" + tempPassword + "</code></p>" +
            "<p style='margin:8px 0 0;color:#4338ca;font-size:12px'>⚠ You will be asked to change this password on your first login.</p>" +
            "</div>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + appUrl + "/auth/login' style='display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-weight:700;font-size:15px'>Login to Unitum →</a>" +
            "</div>" +
            "<p style='color:#64748b;font-size:13px;line-height:1.7'>If you were not expecting this invitation, please contact us at <a href='mailto:" + adminEmail + "' style='color:#6366f1'>" + adminEmail + "</a>.</p>" +
            "</div>" +
            "<div style='background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0'>" +
            "<p style='color:#94a3b8;font-size:12px;margin:0'>© 2025 Unitum · Powered by Evenix Group</p>" +
            "</div></div></body></html>";
    }

    private String row(String label, String value) {
        return "<tr><td style='padding:6px 0;color:#64748b;font-size:13px;width:150px'>" + label + ":</td>" +
               "<td style='padding:6px 0;color:#1e293b;font-size:13px;font-weight:600'>" + value + "</td></tr>";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Magic Link
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendMagicLink(String toEmail, String fullName, String magicUrl) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your sign-in link for Unitum");
            helper.setText(buildMagicLinkEmail(fullName, magicUrl), true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send magic link to {}: {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Password Reset
    // ─────────────────────────────────────────────────────────────────────────
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetUrl) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Reset your Unitum password");
            helper.setText(buildPasswordResetEmail(fullName, resetUrl), true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildPasswordResetEmail(String fullName, String resetUrl) {
        String name = (fullName != null && !fullName.isBlank()) ? fullName : "there";
        return """
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
              <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px;text-align:center">
                <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
                  <span style="font-size:24px">🔒</span>
                </div>
                <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">Reset your password</h1>
              </div>
              <div style="padding:32px">
                <p style="color:#374151;font-size:15px;margin:0 0 8px">Hi <strong>%s</strong>,</p>
                <p style="color:#6b7280;font-size:14px;margin:0 0 28px">We received a request to reset your Unitum password. Click the button below to choose a new one. This link expires in <strong>30 minutes</strong> and can only be used once.</p>
                <div style="text-align:center;margin-bottom:28px">
                  <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none">
                    Reset Password
                  </a>
                </div>
                <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
              </div>
            </div>
            """.formatted(name, resetUrl);
    }

    private String buildMagicLinkEmail(String fullName, String magicUrl) {
        String name = (fullName != null && !fullName.isBlank()) ? fullName : "there";
        return """
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
              <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px;text-align:center">
                <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
                  <span style="font-size:24px">🔑</span>
                </div>
                <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">Sign in to Unitum</h1>
              </div>
              <div style="padding:32px">
                <p style="color:#374151;font-size:15px;margin:0 0 8px">Hi <strong>%s</strong>,</p>
                <p style="color:#6b7280;font-size:14px;margin:0 0 28px">Click the button below to sign in. This link expires in <strong>10 minutes</strong> and can only be used once.</p>
                <div style="text-align:center;margin-bottom:28px">
                  <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none">
                    Sign In to Unitum
                  </a>
                </div>
                <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">If you didn't request this link, you can safely ignore this email.</p>
              </div>
            </div>
            """.formatted(name, magicUrl);
    }
}
