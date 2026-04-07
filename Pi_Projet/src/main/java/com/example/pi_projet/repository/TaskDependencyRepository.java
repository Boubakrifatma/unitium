package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, Long> {

    List<TaskDependency> findByTaskId(Long taskId);

    List<TaskDependency> findByDependsOnTaskId(Long dependsOnTaskId);

    @Query("SELECT td FROM TaskDependency td WHERE td.task.id = :taskId OR td.dependsOnTask.id = :taskId")
    List<TaskDependency> findByTaskIdOrDependsOnTaskId(@Param("taskId") Long taskId);

    @Query("SELECT td FROM TaskDependency td WHERE td.task.id = :taskId AND td.dependsOnTask.id = :dependsOnTaskId")
    Optional<TaskDependency> findByTaskAndDependsOnTask(@Param("taskId") Long taskId, @Param("dependsOnTaskId") Long dependsOnTaskId);

    boolean existsByTaskIdAndDependsOnTaskId(Long taskId, Long dependsOnTaskId);
}
