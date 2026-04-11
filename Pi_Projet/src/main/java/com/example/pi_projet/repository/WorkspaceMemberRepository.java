package com.example.pi_projet.repository;

import com.example.pi_projet.entity.WorkspaceMember;
import com.example.pi_projet.entity.WorkspaceMember.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, Long userId);
    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, Long userId);
    List<WorkspaceMember> findAllByWorkspaceId(UUID workspaceId);
    long countByWorkspaceIdAndDeletedAtIsNull(UUID workspaceId);
    long countByWorkspaceIdAndRole(UUID workspaceId, WorkspaceRole role);

    @Modifying
    @Transactional
    @Query(value = "UPDATE workspace_members " +
        "SET deleted_at = NULL, role = :role, invited_by = :invitedBy, joined_at = COALESCE(joined_at, NOW()) " +
        "WHERE workspace_id = :workspaceId AND user_id = :userId AND deleted_at IS NOT NULL", nativeQuery = true)
    int restoreSoftDeletedMember(@Param("workspaceId") UUID workspaceId,
                                 @Param("userId") Long userId,
                                 @Param("role") String role,
                                 @Param("invitedBy") Long invitedBy);
}
