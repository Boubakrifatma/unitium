package com.example.pi_projet.repository;

import com.example.pi_projet.entity.MLTeamRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MLTeamRecommendationRepository extends JpaRepository<MLTeamRecommendation, UUID> {
    List<MLTeamRecommendation> findByProjectId(UUID projectId);
    List<MLTeamRecommendation> findByRecommendedUserId(Long userId);

    @Modifying
    @Query(value = "DELETE FROM ml_team_recommendations WHERE project_id = :projectId", nativeQuery = true)
    void hardDeleteAllByProjectId(UUID projectId);
}
