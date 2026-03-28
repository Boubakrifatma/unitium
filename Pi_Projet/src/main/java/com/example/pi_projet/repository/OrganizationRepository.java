package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findBySlug(String slug);
    boolean existsBySlug(String slug);

    List<Organization> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Optional<Organization> findFirstByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
