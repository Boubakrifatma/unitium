package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.entity.*;
import com.example.pi_projet.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/super-admin")
@RequiredArgsConstructor
@Tag(name = "Super Admin Dashboard")
public class SuperAdminDashboardController {

    private final UserRepository         userRepository;
    private final SessionRepository      sessionRepository;
    private final OrganizationRepository organizationRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final InvoiceRepository      invoiceRepository;
    private final AuditLogRepository     auditLogRepository;

    // ── GET /api/super-admin/dashboard?period=30 ──────────────────────────────
    @Authorized
    @Operation(summary = "Full platform dashboard — SUPER_ADMIN only")
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestParam(defaultValue = "30") int period,
            HttpServletRequest request) {

        User user = (User) request.getAttribute("currentUser");
        if (user.getRole() != User.RoleName.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access restricted to SUPER_ADMIN."));
        }

        LocalDateTime now   = LocalDateTime.now();
        LocalDateTime since = now.minusDays(period);
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();

        // ── Users ──────────────────────────────────────────────────────────────
        Map<String, Object> users = new LinkedHashMap<>();
        users.put("total",        userRepository.count());
        users.put("active",       userRepository.countByIsActiveTrue());
        users.put("newInPeriod",  userRepository.countByCreatedAtAfter(since));
        users.put("withMfa",      userRepository.countByMfaEnabledTrue());
        users.put("withFaceId",   userRepository.countByFaceEncodingIsNotNull());

        Map<String, Long> byRole = new LinkedHashMap<>();
        for (User.RoleName role : User.RoleName.values()) {
            byRole.put(role.name(), userRepository.countByRole(role));
        }
        users.put("byRole", byRole);

        // ── Sessions ───────────────────────────────────────────────────────────
        Map<String, Object> sessions = new LinkedHashMap<>();
        sessions.put("activeNow",          sessionRepository.countByIsActiveTrue());
        sessions.put("loginsToday",        sessionRepository.countLoginsSince(todayStart));
        sessions.put("loginsInPeriod",     sessionRepository.countLoginsSince(since));
        sessions.put("activeUsersInPeriod",sessionRepository.countDistinctActiveUsersSince(since));

        List<Object[]> loginRows = sessionRepository.countLoginsPerDaySince(since);
        Map<String, Long> loginsPerDay = new LinkedHashMap<>();
        for (Object[] row : loginRows) {
            loginsPerDay.put(row[0].toString().substring(0, 10), ((Number) row[1]).longValue());
        }
        sessions.put("loginsPerDay", loginsPerDay);

        // ── Organizations ──────────────────────────────────────────────────────
        Map<String, Object> orgs = new LinkedHashMap<>();
        orgs.put("total",       organizationRepository.count());
        orgs.put("enterprise",  organizationRepository.countByOrgType(Organization.OrgType.ENTERPRISE));
        orgs.put("academic",    organizationRepository.countByOrgType(Organization.OrgType.ACADEMIC));
        orgs.put("newInPeriod", organizationRepository.countByCreatedAtAfter(since));

        // ── Subscriptions ──────────────────────────────────────────────────────
        Map<String, Object> subs = new LinkedHashMap<>();
        subs.put("active",   subscriptionRepository.countByStatus(Subscription.SubscriptionStatus.ACTIVE));
        subs.put("trialing", subscriptionRepository.countByStatus(Subscription.SubscriptionStatus.TRIALING));
        subs.put("pastDue",  subscriptionRepository.countByStatus(Subscription.SubscriptionStatus.PAST_DUE));
        subs.put("canceled", subscriptionRepository.countByStatus(Subscription.SubscriptionStatus.CANCELED));
        subs.put("paused",   subscriptionRepository.countByStatus(Subscription.SubscriptionStatus.PAUSED));
        subs.put("mrrCents", subscriptionRepository.sumMrrCentsByStatus(Subscription.SubscriptionStatus.ACTIVE));

        // ── Revenue ────────────────────────────────────────────────────────────
        Map<String, Object> revenue = new LinkedHashMap<>();
        Long paidCents = invoiceRepository.sumRevenueSince(Invoice.InvoiceStatus.PAID, since);
        revenue.put("totalCentsInPeriod",  paidCents != null ? paidCents : 0L);
        revenue.put("paidInvoicesInPeriod", invoiceRepository.countPaidSince(Invoice.InvoiceStatus.PAID, since));

        // ── Security / Audit ───────────────────────────────────────────────────
        Map<String, Object> security = new LinkedHashMap<>();
        security.put("totalInPeriod", auditLogRepository.countByCreatedAtAfter(since));

        Map<String, Long> byAction = new LinkedHashMap<>();
        for (Object[] row : auditLogRepository.countByActionTypeSince(since)) {
            byAction.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        security.put("byAction", byAction);

        List<Map<String, Object>> recentLogs = auditLogRepository.findTop10ByOrderByCreatedAtDesc()
                .stream()
                .map(log -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",         log.getId());
                    m.put("userId",     log.getUserId());
                    m.put("actionType", log.getActionType().name());
                    m.put("entityType", log.getEntityType());
                    m.put("ipAddress",  log.getIpAddress());
                    m.put("createdAt",  log.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
        security.put("recentLogs", recentLogs);

        // ── Build response ─────────────────────────────────────────────────────
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period",        period);
        result.put("users",         users);
        result.put("sessions",      sessions);
        result.put("organizations", orgs);
        result.put("subscriptions", subs);
        result.put("revenue",       revenue);
        result.put("security",      security);

        return ResponseEntity.ok(result);
    }
}
