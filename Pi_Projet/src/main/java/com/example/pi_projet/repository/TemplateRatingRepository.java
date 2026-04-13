package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TemplateRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TemplateRatingRepository extends JpaRepository<TemplateRating, Long> {
    boolean existsByTemplateIdAndUserId(UUID templateId, Long userId);
}
