package com.example.pi_projet.repository;

import com.example.pi_projet.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    /** Eagerly loads the user in the same query — no lazy-load surprises. */
    @Query("SELECT m FROM OrganizationMember m LEFT JOIN FETCH m.user WHERE m.organization.id = :orgId")
    List<OrganizationMember> findByOrganizationId(@Param("orgId") UUID orgId);

    List<OrganizationMember> findByUserId(Long userId);
    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, Long userId);
    boolean existsByOrganizationIdAndUserId(UUID organizationId, Long userId);
}
