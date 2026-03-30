package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Organization;
import com.example.pi_projet.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    Optional<Subscription> findTopByOrganizationOrderByCreatedAtDesc(Organization organization);
    List<Subscription> findByOrganizationOrderByCreatedAtDesc(Organization organization);
}
