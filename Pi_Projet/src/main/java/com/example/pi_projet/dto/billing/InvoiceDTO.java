package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.Invoice;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class InvoiceDTO {
    private String  id;
    private String  invoiceNumber;
    private String  status;
    private double  subtotal;
    private double  taxAmount;
    private double  total;
    private String  currency;
    private String  billingPeriodStart;
    private String  billingPeriodEnd;
    private String  dueDate;
    private String  paidAt;
    private String  pdfUrl;
    private String  planName;
    private String  orgName;
    private String  createdAt;
    private List<InvoiceLineItemDTO> lineItems;

    public static InvoiceDTO from(Invoice inv) {
        return InvoiceDTO.builder()
            .id(inv.getId())
            .invoiceNumber(inv.getInvoiceNumber())
            .status(inv.getStatus() != null ? inv.getStatus().name() : null)
            .subtotal(inv.getSubtotalCents() / 100.0)
            .taxAmount(inv.getTaxAmountCents() / 100.0)
            .total(inv.getTotalCents() / 100.0)
            .currency(inv.getCurrency())
            .billingPeriodStart(inv.getBillingPeriodStart() != null ? inv.getBillingPeriodStart().toString() : null)
            .billingPeriodEnd(inv.getBillingPeriodEnd() != null ? inv.getBillingPeriodEnd().toString() : null)
            .dueDate(inv.getDueDate() != null ? inv.getDueDate().toString() : null)
            .paidAt(inv.getPaidAt() != null ? inv.getPaidAt().toString() : null)
            .pdfUrl(inv.getPdfUrl())
            .planName(inv.getSubscription() != null && inv.getSubscription().getPlan() != null
                ? inv.getSubscription().getPlan().getDisplayName() : null)
            .createdAt(inv.getCreatedAt() != null ? inv.getCreatedAt().toString() : null)
            .orgName(inv.getOrganization() != null ? inv.getOrganization().getName() : null)
            .lineItems(inv.getLineItems() != null
                ? inv.getLineItems().stream().map(InvoiceLineItemDTO::from).collect(Collectors.toList())
                : null)
            .build();
    }
}
