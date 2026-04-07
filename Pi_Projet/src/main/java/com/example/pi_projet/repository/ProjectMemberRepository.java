package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, Long userId);
    boolean existsByProjectIdAndUserId(UUID projectId, Long userId);
    List<ProjectMember> findAllByProjectId(UUID projectId);
    List<ProjectMember> findAllByUserId(Long userId);

    /** Bypasses @SQLRestriction to count soft-deleted records for a given (project, user) pair. */
    @Query(value = "SELECT COUNT(*) FROM project_members WHERE project_id = :projectId AND user_id = :userId AND deleted_at IS NOT NULL", nativeQuery = true)
    long countSoftDeleted(@Param("projectId") UUID projectId, @Param("userId") Long userId);

    /** Restores a soft-deleted record and updates its role — runs within the calling transaction. */
    @Modifying
    @Query(value = "UPDATE project_members SET deleted_at = NULL, role = :role WHERE project_id = :projectId AND user_id = :userId AND deleted_at IS NOT NULL", nativeQuery = true)
    void restoreSoftDeleted(@Param("projectId") UUID projectId, @Param("userId") Long userId, @Param("role") String role);

    /** Hard-deletes ALL member rows (including soft-deleted) for a project — bypasses @SQLRestriction. */
    @Modifying
    @Query(value = "DELETE FROM project_members WHERE project_id = :projectId", nativeQuery = true)
    void hardDeleteAllByProjectId(@Param("projectId") UUID projectId);

    /**
     * Returns pairs of user IDs that share at least one project in the given workspace,
     * along with the count of shared projects. Used by the War Room collaboration graph.
     */
    @Query(value = """
        SELECT pm1.user_id AS memberAId, pm2.user_id AS memberBId, COUNT(pm1.project_id) AS sharedCount
        FROM project_members pm1
        JOIN project_members pm2
          ON pm1.project_id = pm2.project_id
         AND pm1.user_id < pm2.user_id
        WHERE pm1.project_id IN (
            SELECT id FROM projects WHERE workspace_id = :workspaceId AND deleted_at IS NULL
        )
        AND pm1.deleted_at IS NULL AND pm2.deleted_at IS NULL
        GROUP BY pm1.user_id, pm2.user_id
        HAVING COUNT(pm1.project_id) > 0
        """, nativeQuery = true)
    List<Object[]> findCollaborationEdgesRaw(@Param("workspaceId") UUID workspaceId);

}
