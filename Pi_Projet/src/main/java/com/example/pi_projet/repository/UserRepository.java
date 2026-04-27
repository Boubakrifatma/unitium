package com.example.pi_projet.repository;

import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    java.util.List<User> findByRole(User.RoleName role);

    @Query("SELECT u FROM User u WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByNameOrEmail(@Param("q") String query);

    // ── Dashboard stats ──
    long countByRole(User.RoleName role);
    long countByIsActiveTrue();
    long countByCreatedAtAfter(LocalDateTime since);
    long countByMfaEnabledTrue();
    long countByFaceEncodingIsNotNull();
}
