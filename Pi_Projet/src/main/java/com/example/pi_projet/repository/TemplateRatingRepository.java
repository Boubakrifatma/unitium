package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TemplateRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateRatingRepository extends JpaRepository<TemplateRating, Long> {
    boolean existsByTemplateIdAndUserId(UUID templateId, Long userId);

    long countByTemplateId(UUID templateId);

    long countByTemplateIdAndCreatedAtAfter(UUID templateId, Instant createdAt);

    @Query("SELECT r.rating, COUNT(r.id) FROM TemplateRating r WHERE r.templateId = :templateId GROUP BY r.rating")
    List<Object[]> findRatingDistribution(@Param("templateId") UUID templateId);
}
