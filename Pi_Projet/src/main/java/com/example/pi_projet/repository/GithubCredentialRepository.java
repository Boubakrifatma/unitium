package com.example.pi_projet.repository;

import com.example.pi_projet.entity.GithubCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GithubCredentialRepository extends JpaRepository<GithubCredential, Long> {
    Optional<GithubCredential> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    void deleteByUserId(Long userId);
}
