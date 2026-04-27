package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    List<Milestone> findByProject_Id(UUID projectId);

    List<Milestone> findByProject_IdInAndDueDateIsNotNullOrderByDueDateAsc(List<UUID> projectIds);

    @EntityGraph(attributePaths = {"project"})
    @Query("SELECT m FROM Milestone m WHERE m.id = :id")
    Optional<Milestone> findByIdWithProject(@Param("id") Long id);
}