package com.example.pi_projet.repository;

import com.example.pi_projet.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    /** All members of an org (simple) */
    List<OrganizationMember> findByOrganization_Id(UUID orgId);

    /** Eagerly loads the user in the same query — no lazy-load surprises. */
    @Query("SELECT m FROM OrganizationMember m LEFT JOIN FETCH m.user WHERE m.organization.id = :orgId")
    List<OrganizationMember> findByOrganizationId(@Param("orgId") UUID orgId);

    List<OrganizationMember> findByUserId(Long userId);
    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, Long userId);
    boolean existsByOrganizationIdAndUserId(UUID organizationId, Long userId);

    /** Native SQL — bypasses @SQLRestriction so soft-deleted rows are also returned. */
    @Query(value = "SELECT * FROM org_members WHERE organization_id = :orgId AND user_id = :userId LIMIT 1",
           nativeQuery = true)
    Optional<OrganizationMember> findByOrganizationIdAndUserIdIncludingDeleted(
            @Param("orgId") UUID orgId, @Param("userId") Long userId);

    /** Members who logged in during the last N days (via User.lastLoginAt) */
    @Query("""
        SELECT om FROM OrganizationMember om
        JOIN User u ON u.id = om.userId
        WHERE om.organization.id = :orgId
          AND u.lastLoginAt >= :since
          AND u.isActive = true
    """)
    List<OrganizationMember> findActiveMembers(
            @Param("orgId") UUID orgId,
            @Param("since") LocalDateTime since);

    /** Most recent lastLoginAt among all members of an org */
    @Query("""
        SELECT MAX(u.lastLoginAt) FROM OrganizationMember om
        JOIN User u ON u.id = om.userId
        WHERE om.organization.id = :orgId
          AND u.isActive = true
    """)
    java.time.LocalDateTime findLastMemberLogin(@Param("orgId") UUID orgId);

    // ── Module-2 soft-delete aware queries ────────────────────────────────────
    List<OrganizationMember> findAllByUserIdAndDeletedAtIsNull(Long userId);

    List<OrganizationMember> findAllByOrganization_IdAndDeletedAtIsNull(UUID organizationId);

    Optional<OrganizationMember> findByOrganization_IdAndUserIdAndDeletedAtIsNull(UUID organizationId, Long userId);

    long countByOrganization_IdAndDeletedAtIsNull(UUID organizationId);

    boolean existsByOrganization_IdAndUserIdAndDeletedAtIsNull(UUID organizationId, Long userId);
}
