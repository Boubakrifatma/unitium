package com.example.pi_projet.repository;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
}