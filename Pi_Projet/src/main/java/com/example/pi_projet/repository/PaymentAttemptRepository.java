package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, String> {
    List<PaymentAttempt> findByOrganization_IdOrderByAttemptedAtDesc(UUID orgId);
    List<PaymentAttempt> findAllByOrderByAttemptedAtDesc();
    List<PaymentAttempt> findByInvoice_IdOrderByAttemptedAtDesc(String invoiceId);
}
