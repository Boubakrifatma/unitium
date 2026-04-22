package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.entity.InvoiceLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InvoiceLineItemRepository extends JpaRepository<InvoiceLineItem, String> {
    List<InvoiceLineItem> findByInvoiceOrderByPeriodStart(Invoice invoice);
    List<InvoiceLineItem> findByInvoice_Organization_Id(java.util.UUID orgId);
}
