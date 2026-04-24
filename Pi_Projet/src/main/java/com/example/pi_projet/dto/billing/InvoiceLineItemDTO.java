package com.example.pi_projet.dto.billing;

import com.example.pi_projet.entity.InvoiceLineItem;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InvoiceLineItemDTO {
    private String id;
    private String invoiceId;
    private String description;
    private Integer quantity;
    private double unitPrice;
    private double totalPrice;
    private double taxRate;
    private String periodStart;
    private String periodEnd;

    public static InvoiceLineItemDTO from(InvoiceLineItem li) {
        return InvoiceLineItemDTO.builder()
            .id(li.getId())
            .invoiceId(li.getInvoice() != null ? li.getInvoice().getId() : null)
            .description(li.getDescription())
            .quantity(li.getQuantity())
            .unitPrice(li.getUnitPriceCents() / 100.0)
            .totalPrice(li.getTotalPriceCents() / 100.0)
            .taxRate(li.getTaxRate())
            .periodStart(li.getPeriodStart() != null ? li.getPeriodStart().toString() : null)
            .periodEnd(li.getPeriodEnd() != null ? li.getPeriodEnd().toString() : null)
            .build();
    }
}
