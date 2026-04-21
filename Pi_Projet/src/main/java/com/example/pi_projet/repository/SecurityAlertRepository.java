package com.example.pi_projet.repository;

import com.example.pi_projet.entity.SecurityAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityAlertRepository extends JpaRepository<SecurityAlert, String> {

    List<SecurityAlert> findByReviewedFalseOrderByCreatedAtDesc();

    void deleteByReviewedTrue();
}
