package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @EntityGraph(attributePaths = {"project", "assignedTo", "milestone", "parentTask"})
    List<Task> findByMilestoneId(Long milestoneId);

    @EntityGraph(attributePaths = {"project", "assignedTo", "milestone", "parentTask"})
    @Query("SELECT t FROM Task t WHERE t.id = :id")
    Optional<Task> findByIdWithDetails(@Param("id") Long id);

    @EntityGraph(attributePaths = {"project", "assignedTo", "milestone", "parentTask"})
    List<Task> findByAssignedTo_Id(Long userId);

    // ✅ NOUVEAU
    List<Task> findByProject_Id(UUID projectId);
    Task findTaskByid(Long id);

    List<Task> findByParentTask_Id(Long parentTaskId);
}