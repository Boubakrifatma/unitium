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

    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    @Query("SELECT d FROM Deliverable d WHERE d.id = :id")
    Optional<Deliverable> findByIdWithDetails(@Param("id") Long id);

    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    @Query("SELECT d FROM Deliverable d WHERE d.task.id = :taskId")
    List<Deliverable> findByTaskId(@Param("taskId") Long taskId);

    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    @Query("SELECT d FROM Deliverable d WHERE d.project.id = :projectId")
    List<Deliverable> findByProjectId(@Param("projectId") UUID projectId);

    @EntityGraph(attributePaths = {"task", "project", "submittedBy"})
    @Query("SELECT d FROM Deliverable d WHERE d.submittedBy.id = :userId")
    List<Deliverable> findBySubmittedById(@Param("userId") Long userId);

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
}