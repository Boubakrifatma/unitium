package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByTokenHashAndIsActiveTrue(String tokenHash);

    List<Session> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    List<Session> findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(Long userId);

    Optional<Session> findByIdAndUserId(Long id, Long userId);

    // ── Dashboard stats ──
    long countByIsActiveTrue();

    @Query("SELECT COUNT(s) FROM Session s WHERE s.userId = :userId AND s.isActive = false AND s.createdAt >= :since")
    long countFailedAttemptsSince(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    @Query(value = "SELECT DATE(created_at) as day, COUNT(*) as cnt FROM sessions WHERE created_at >= :since GROUP BY DATE(created_at) ORDER BY DATE(created_at)",
           nativeQuery = true)
    List<Object[]> countLoginsPerDaySince(@Param("since") java.time.LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT s.userId) FROM Session s WHERE s.createdAt >= :since")
    long countDistinctActiveUsersSince(@Param("since") java.time.LocalDateTime since);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.createdAt >= :since")
    long countLoginsSince(@Param("since") java.time.LocalDateTime since);
}
