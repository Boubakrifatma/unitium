package com.example.pi_projet.repository;

import com.example.pi_projet.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    /** All members of an org */
    List<OrganizationMember> findByOrganization_Id(UUID orgId);

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
}
