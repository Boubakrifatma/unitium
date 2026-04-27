package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    Optional<Subscription> findTopByOrganizationOrderByCreatedAtDesc(Organization organization);
    List<Subscription> findByOrganizationOrderByCreatedAtDesc(Organization organization);
    Optional<Subscription> findTopByOrganizationIdAndStatusOrderByCreatedAtDesc(UUID organizationId, Subscription.SubscriptionStatus status);

    // ── Dashboard stats ──
    long countByStatus(Subscription.SubscriptionStatus status);

    @Query("SELECT COALESCE(SUM(s.plan.priceMonthlyCents), 0) FROM Subscription s WHERE s.status = :status")
    long sumMrrCentsByStatus(@Param("status") Subscription.SubscriptionStatus status);
}
