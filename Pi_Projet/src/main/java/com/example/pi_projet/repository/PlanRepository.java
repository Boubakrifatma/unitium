package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, String> {
    List<Plan> findByIsActiveTrueOrderByPriceMonthlyCentsAsc();
    Optional<Plan> findByName(String name);
}
