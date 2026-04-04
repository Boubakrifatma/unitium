package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Invoice;
import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    List<Invoice> findByOrganizationOrderByCreatedAtDesc(Organization organization);
}
