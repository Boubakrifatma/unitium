package com.example.pi_projet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;


@Entity
@Table(name = "invoice_line_items")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InvoiceLineItem {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @PrePersist
    public void generateId() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price_cents", nullable = false)
    private Integer unitPriceCents;

    @Column(name = "total_price_cents", nullable = false)
    private Integer totalPriceCents;

    @Column(name = "tax_rate", nullable = false)
    private Double taxRate;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "stripe_line_item_id", length = 255)
    private String stripeLineItemId;
}
