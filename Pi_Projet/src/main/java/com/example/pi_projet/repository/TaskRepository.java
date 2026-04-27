package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
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

    @EntityGraph(attributePaths = {"project", "assignedTo", "milestone", "parentTask"})
    List<Task> findByProject_Workspace_Id(UUID workspaceId);

    // Existing project-level reads used by task and milestone boards.
    List<Task> findByProject_Id(UUID projectId);
    Task findTaskByid(Long id);

    List<Task> findByParentTask_Id(Long parentTaskId);

    /** Sum of estimated hours for todo tasks assigned to a user.
     *  Used to compute user_workload for ML risk prediction. */
    @Query("SELECT COALESCE(SUM(t.estimatedHours), 0.0) FROM Task t " +
           "WHERE t.assignedTo.id = :userId AND t.status = :todoStatus")
    Float sumActiveEstimatedHoursByUser(@Param("userId") Long userId,
                                        @Param("todoStatus") Task.TaskStatus todoStatus);

    /** Count of completed tasks assigned to a user. */
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignedTo.id = :userId AND t.status = :doneStatus")
    Long countCompletedByUser(@Param("userId") Long userId,
                              @Param("doneStatus") Task.TaskStatus doneStatus);

    /** Count of all tasks ever assigned to a user. */
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignedTo.id = :userId")
    Long countAllByUser(@Param("userId") Long userId);

    @Query("""
        SELECT t.project.id, t.status, COUNT(t)
        FROM Task t
        WHERE t.project.id IN :projectIds
        GROUP BY t.project.id, t.status
        """)
    List<Object[]> countByProjectAndStatus(@Param("projectIds") List<UUID> projectIds);

    @Query("""
        SELECT t.project.id, t.priority, COUNT(t)
        FROM Task t
        WHERE t.project.id IN :projectIds
        GROUP BY t.project.id, t.priority
        """)
    List<Object[]> countByProjectAndPriority(@Param("projectIds") List<UUID> projectIds);

    @Query("""
        SELECT t.project.id, COUNT(t)
        FROM Task t
        WHERE t.project.id IN :projectIds
          AND t.dueDate IS NOT NULL
          AND t.dueDate < :today
          AND t.status <> :doneStatus
        GROUP BY t.project.id
        """)
    List<Object[]> countOverdueByProjectIds(@Param("projectIds") List<UUID> projectIds,
                                            @Param("today") LocalDate today,
                                            @Param("doneStatus") Task.TaskStatus doneStatus);

    @Query("""
        SELECT t.project.id, COUNT(t)
        FROM Task t
        WHERE t.project.id IN :projectIds
          AND t.status <> :doneStatus
          AND (t.status = :blockedStatus OR t.priority = :criticalPriority)
        GROUP BY t.project.id
        """)
    List<Object[]> countCriticalOrBlockedByProjectIds(@Param("projectIds") List<UUID> projectIds,
                                                       @Param("doneStatus") Task.TaskStatus doneStatus,
                                                       @Param("blockedStatus") Task.TaskStatus blockedStatus,
                                                       @Param("criticalPriority") Task.TaskPriority criticalPriority);
}
