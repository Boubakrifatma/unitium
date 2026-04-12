package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    @Query("SELECT DISTINCT i FROM Invoice i JOIN FETCH i.organization JOIN FETCH i.subscription s JOIN FETCH s.plan LEFT JOIN FETCH i.lineItems WHERE i.organization = :org ORDER BY i.createdAt DESC")
    List<Invoice> findByOrganizationWithAssociations(@Param("org") Organization org);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.organization JOIN FETCH i.subscription s JOIN FETCH s.plan")
    List<Invoice> findAllWithAssociations();

    @Query("SELECT DISTINCT i FROM Invoice i JOIN FETCH i.organization JOIN FETCH i.subscription s JOIN FETCH s.plan LEFT JOIN FETCH i.lineItems WHERE i.id = :id")
    Optional<Invoice> findByIdWithAssociations(@Param("id") String id);
}
