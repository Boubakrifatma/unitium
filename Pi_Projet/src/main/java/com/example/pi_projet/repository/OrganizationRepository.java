package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findBySlug(String slug);
    boolean existsBySlug(String slug);

    List<Organization> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    Optional<Organization> findFirstByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    Optional<Organization> findByOwnerId(Long ownerId);

    // ── Dashboard stats (@SQLRestriction auto-applied: deleted_at IS NULL) ──
    long countByOrgType(Organization.OrgType orgType);
    long countByCreatedAtAfter(LocalDateTime since);
}
