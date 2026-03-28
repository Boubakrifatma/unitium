package com.example.pi_projet.repository;

import com.example.pi_projet.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {
    List<OrganizationMember> findByOrganizationId(UUID organizationId);
    List<OrganizationMember> findByUserId(Long userId);
    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, Long userId);
    boolean existsByOrganizationIdAndUserId(UUID organizationId, Long userId);
}
