package com.example.pi_projet.repository;

import com.example.pi_projet.entity.ProjectTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectTemplateRepository extends JpaRepository<ProjectTemplate, UUID> {
    Page<ProjectTemplate> findAllByIsPublicTrueAndStatus(ProjectTemplate.TemplateStatus status, Pageable pageable);
    Page<ProjectTemplate> findByCreatedBy(Long createdBy, Pageable pageable);
    Page<ProjectTemplate> findByStatus(ProjectTemplate.TemplateStatus status, Pageable pageable);

    @Query("SELECT t FROM ProjectTemplate t WHERE " +
        "(:search IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%',:search,'%')) " +
        "  OR LOWER(t.tags) LIKE LOWER(CONCAT('%',:search,'%')) " +
        "  OR LOWER(t.useCaseDescription) LIKE LOWER(CONCAT('%',:search,'%'))) " +
        "AND (:type IS NULL OR t.templateType = :type) " +
        "AND (:status IS NULL OR t.status = :status) " +
        "AND (:difficulty IS NULL OR t.difficultyLevel = :difficulty) " +
        "AND (:isPublic IS NULL OR t.isPublic = :isPublic)")
    Page<ProjectTemplate> search(
        @Param("search") String search,
        @Param("type") ProjectTemplate.TemplateType type,
        @Param("status") ProjectTemplate.TemplateStatus status,
        @Param("difficulty") ProjectTemplate.DifficultyLevel difficulty,
        @Param("isPublic") Boolean isPublic,
        Pageable pageable);

    @Query("SELECT t FROM ProjectTemplate t WHERE t.id IN :ids")
    List<ProjectTemplate> findAllByIdIn(@Param("ids") List<UUID> ids);

    @Modifying
    @Transactional
    @Query("UPDATE ProjectTemplate t SET t.usageCount = t.usageCount + 1 WHERE t.id = :id")
    void incrementUsageCount(@Param("id") UUID id);
}
