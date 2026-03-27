package com.example.pi_projet.repository;

import com.example.pi_projet.entity.UsageQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsageQuotaRepository extends JpaRepository<UsageQuota, String> {
    Optional<UsageQuota> findTopByOrganization_IdOrderByMetricDateDesc(UUID orgId);
    List<UsageQuota> findByOrganization_IdOrderByMetricDateDesc(UUID orgId);
    List<UsageQuota> findAllByOrderByMetricDateDesc();
}
