package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ProjectTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Repository
public interface ProjectTemplateRepository extends JpaRepository<ProjectTemplate, UUID> {
    Page<ProjectTemplate> findAllByIsPublicTrueAndStatus(ProjectTemplate.TemplateStatus status, Pageable pageable);
    Page<ProjectTemplate> findByCreatedBy(Long createdBy, Pageable pageable);
    Page<ProjectTemplate> findByStatus(ProjectTemplate.TemplateStatus status, Pageable pageable);

    @Modifying
    @Transactional
    @Query("UPDATE ProjectTemplate t SET t.usageCount = t.usageCount + 1 WHERE t.id = :id")
    void incrementUsageCount(@Param("id") UUID id);
}
