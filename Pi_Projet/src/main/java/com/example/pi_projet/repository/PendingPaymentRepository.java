package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PendingPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PendingPaymentRepository extends JpaRepository<PendingPayment, String> {
    List<PendingPayment> findByStatusOrderByCreatedAtDesc(PendingPayment.PaymentStatus status);
    List<PendingPayment> findAllByOrderByCreatedAtDesc();
    List<PendingPayment> findByAdminEmailOrderByCreatedAtDesc(String adminEmail);
}
