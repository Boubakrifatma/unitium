package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {

    @Query("SELECT d FROM Deliverable d LEFT JOIN FETCH d.task LEFT JOIN FETCH d.project LEFT JOIN FETCH d.submittedBy WHERE d.id = :id")
    Optional<Deliverable> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT d FROM Deliverable d LEFT JOIN FETCH d.task LEFT JOIN FETCH d.project LEFT JOIN FETCH d.submittedBy WHERE d.task.id = :taskId")
    List<Deliverable> findByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT d FROM Deliverable d LEFT JOIN FETCH d.task LEFT JOIN FETCH d.project LEFT JOIN FETCH d.submittedBy WHERE d.project.id = :projectId")
    List<Deliverable> findByProjectId(@Param("projectId") UUID projectId);

    @Query("SELECT d FROM Deliverable d LEFT JOIN FETCH d.task t LEFT JOIN FETCH t.milestone LEFT JOIN FETCH t.assignedTo LEFT JOIN FETCH d.project LEFT JOIN FETCH d.submittedBy WHERE d.project.id = :projectId ORDER BY d.submittedAt DESC")
    List<Deliverable> findByProjectIdWithMilestone(@Param("projectId") UUID projectId);

    // Derived query (no @Query) + @EntityGraph avoids the double-join issue
    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    List<Deliverable> findBySubmittedByIdOrderBySubmittedAtDesc(Long submittedById);

    // ✅ Corrigé : Arrays → List<Deliverable>
    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    List<Deliverable> findBySubmittedByIdAndStatus(Long employeeId, Deliverable.DeliverableStatus status);

    // ✅ Corrigé : Arrays → List<Deliverable>
    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    List<Deliverable> findByStatus(Deliverable.DeliverableStatus status);

    void deleteByTaskId(Long taskId);

    void deleteByProjectId(UUID uuid);

    Long countBySubmittedById(Long userId);

    Long countByStatus(Deliverable.DeliverableStatus status);

    Long countByProjectId(UUID projectId);

    Long countByTaskId(Long taskId);

    Long countBySubmittedByIdAndStatus(Long submittedById, Deliverable.DeliverableStatus status);

    @Query("SELECT COUNT(d) FROM Deliverable d WHERE d.submittedBy.id = :employeeId AND d.status IN :statuses")
    Long countBySubmittedByIdAndStatusIn(@Param("employeeId") Long employeeId, @Param("statuses") List<Deliverable.DeliverableStatus> statuses);

    @Query("SELECT COUNT(d) FROM Deliverable d WHERE d.submittedBy.id = :employeeId AND d.poDecisionField = :decision")
    Long countBySubmittedByIdAndPoDecision(@Param("employeeId") Long employeeId, @Param("decision") Deliverable.PoDecisionField decision);
}