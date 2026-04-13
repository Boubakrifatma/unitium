package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.PaymentAttempt;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentAttemptDTO {
    private String id;
    private String orgId;
    private String orgName;
    private String subscriptionId;
    private String invoiceId;
    private String invoiceNumber;
    private Short attemptNumber;
    private String status;
    private double amount;
    private String failureCode;
    private String failureMessage;
    private String nextRetryAt;
    private String attemptedAt;

    public static PaymentAttemptDTO from(PaymentAttempt pa) {
        return PaymentAttemptDTO.builder()
            .id(pa.getId())
            .orgId(pa.getOrganization() != null ? pa.getOrganization().getId().toString() : null)
            .orgName(pa.getOrganization() != null ? pa.getOrganization().getName() : null)
            .subscriptionId(pa.getSubscription() != null ? pa.getSubscription().getId() : null)
            .invoiceId(pa.getInvoice() != null ? pa.getInvoice().getId() : null)
            .invoiceNumber(pa.getInvoice() != null ? pa.getInvoice().getInvoiceNumber() : null)
            .attemptNumber(pa.getAttemptNumber())
            .status(pa.getStatus() != null ? pa.getStatus().name() : null)
            .amount(pa.getAmountCents() / 100.0)
            .failureCode(pa.getFailureCode())
            .failureMessage(pa.getFailureMessage())
            .nextRetryAt(pa.getNextRetryAt() != null ? pa.getNextRetryAt().toString() : null)
            .attemptedAt(pa.getAttemptedAt() != null ? pa.getAttemptedAt().toString() : null)
            .build();
    }
}
