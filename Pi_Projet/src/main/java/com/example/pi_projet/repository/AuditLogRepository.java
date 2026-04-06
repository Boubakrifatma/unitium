package com.example.pi_projet.repository;

import com.example.pi_projet.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AuditLog> findByEntityTypeOrderByCreatedAtDesc(String entityType);
    List<AuditLog> findAllByOrderByCreatedAtDesc();

    // ── Dashboard stats ──
    long countByCreatedAtAfter(LocalDateTime since);
    List<AuditLog> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT a.actionType, COUNT(a) FROM AuditLog a WHERE a.createdAt >= :since GROUP BY a.actionType ORDER BY COUNT(a) DESC")
    List<Object[]> countByActionTypeSince(@Param("since") LocalDateTime since);
}
