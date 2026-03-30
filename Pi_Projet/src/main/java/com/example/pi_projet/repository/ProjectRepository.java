package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, java.util.UUID> {
}