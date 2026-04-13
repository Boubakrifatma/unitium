package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TemplateFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateFavoriteRepository extends JpaRepository<TemplateFavorite, Long> {

    boolean existsByTemplateIdAndUserId(UUID templateId, Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TemplateFavorite f WHERE f.templateId = :tid AND f.userId = :uid")
    void deleteByTemplateIdAndUserId(@Param("tid") UUID tid, @Param("uid") Long uid);

    @Query("SELECT f.templateId FROM TemplateFavorite f WHERE f.userId = :userId")
    List<UUID> findTemplateIdsByUserId(@Param("userId") Long userId);

    long countByTemplateId(UUID templateId);
}
