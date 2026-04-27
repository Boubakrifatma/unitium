package com.example.pi_projet.service;

import com.example.pi_projet.dto.billing.TamperingCheckDTO;
import com.example.pi_projet.entity.SecurityAlert;
import com.example.pi_projet.repository.SecurityAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Persistent store for security alerts.
 * Alerts survive server restarts — stored in the security_alerts table.
 */
@Component
@RequiredArgsConstructor
public class SecurityAlertStore {

    private final SecurityAlertRepository repository;

    public void addAlerts(List<TamperingCheckDTO> newAlerts) {
        List<SecurityAlert> entities = newAlerts.stream().map(dto ->
            SecurityAlert.builder()
                .invoiceId(dto.getInvoiceId())
                .invoiceNumber(dto.getInvoiceNumber())
                .orgName(dto.getOrgName())
                .integrityStatus(dto.getIntegrityStatus())
                .storedHash(dto.getStoredHash())
                .computedHash(dto.getComputedHash())
                .message(dto.getMessage())
                .checkedAt(dto.getCheckedAt() != null
                    ? LocalDateTime.parse(dto.getCheckedAt().substring(0, 19))
                    : LocalDateTime.now())
                .reviewed(false)
                .build()
        ).toList();
        repository.saveAll(entities);
    }

    public List<TamperingCheckDTO> getAlerts() {
        return repository.findByReviewedFalseOrderByCreatedAtDesc().stream().map(a ->
            TamperingCheckDTO.builder()
                .invoiceId(a.getInvoiceId())
                .invoiceNumber(a.getInvoiceNumber())
                .orgName(a.getOrgName())
                .integrityStatus(a.getIntegrityStatus())
                .storedHash(a.getStoredHash())
                .computedHash(a.getComputedHash())
                .message(a.getMessage())
                .checkedAt(a.getCheckedAt() != null ? a.getCheckedAt().toString() : null)
                .build()
        ).toList();
    }

    public int getAlertCount() {
        return (int) repository.findByReviewedFalseOrderByCreatedAtDesc().size();
    }

    public void clearAlerts() {
        repository.findByReviewedFalseOrderByCreatedAtDesc().forEach(a -> {
            a.setReviewed(true);
            repository.save(a);
        });
    }
}
