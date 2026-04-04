package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByTokenHashAndIsActiveTrue(String tokenHash);
}
