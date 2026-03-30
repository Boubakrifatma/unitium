package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByMilestoneId(Long milestoneId);
}