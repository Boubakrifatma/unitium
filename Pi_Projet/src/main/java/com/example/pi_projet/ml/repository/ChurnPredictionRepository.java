package com.example.pi_projet.ml.repository;

import com.example.pi_projet.entity.ChurnPrediction;
import com.example.pi_projet.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChurnPredictionRepository extends JpaRepository<ChurnPrediction, String> {

    Optional<ChurnPrediction> findFirstByOrganizationOrderByPredictionDateDesc(
            Organization organization);

    List<ChurnPrediction> findByOrganizationOrderByPredictionDateDesc(
            Organization organization);

    /** HIGH_RISK predictions today — JOIN FETCH évite le LazyInitializationException sur organization */
    @Query("SELECT p FROM ChurnPrediction p JOIN FETCH p.organization " +
           "WHERE p.predictionDate = :date AND p.riskSegment = :segment " +
           "ORDER BY p.churnProbability DESC")
    List<ChurnPrediction> findByPredictionDateAndRiskSegmentOrderByChurnProbabilityDesc(
            @Param("date") LocalDate date,
            @Param("segment") ChurnPrediction.RiskSegment segment);

    List<ChurnPrediction> findByPredictionDate(LocalDate date);

    boolean existsByOrganizationIdAndPredictionDate(UUID orgId, LocalDate date);
}
