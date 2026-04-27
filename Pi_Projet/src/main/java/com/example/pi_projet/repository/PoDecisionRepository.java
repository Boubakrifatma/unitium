package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.PoDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository used by the Deliverable Intelligence Module to analyse
 * historical PO decisions (acceptance rate, rejection reasons, …).
 */
@Repository
public interface PoDecisionRepository extends JpaRepository<PoDecision, Long> {

    @Query("SELECT p FROM PoDecision p " +
           "LEFT JOIN FETCH p.deliverable d LEFT JOIN FETCH d.task " +
           "WHERE d.project.id = :projectId")
    List<PoDecision> findByProjectId(@Param("projectId") UUID projectId);

    List<PoDecision> findByPoId(Long poId);

    @Query("SELECT COUNT(p) FROM PoDecision p WHERE p.decision = :decision")
    Long countByDecision(@Param("decision") PoDecision.PoDecisionType decision);
}
