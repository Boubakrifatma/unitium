package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    List<Invoice> findByOrganizationOrderByCreatedAtDesc(Organization organization);

    // ── Dashboard stats ──
    @Query("SELECT COALESCE(SUM(i.totalCents), 0) FROM Invoice i WHERE i.status = :status AND i.paidAt >= :since")
    Long sumRevenueSince(@Param("status") Invoice.InvoiceStatus status, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = :status AND i.paidAt >= :since")
    long countPaidSince(@Param("status") Invoice.InvoiceStatus status, @Param("since") LocalDateTime since);
}
