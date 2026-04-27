package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliverableVersionRepository extends JpaRepository<DeliverableVersion, Long> {

    // Get all versions for a deliverable ordered by version number
    @Query("SELECT dv FROM DeliverableVersion dv " +
            "WHERE dv.deliverable.id = :deliverableId " +
            "ORDER BY dv.versionNumber DESC")
    List<DeliverableVersion> findByDeliverableId(@Param("deliverableId") Long deliverableId);

    // Get latest version of a deliverable
    @Query("SELECT dv FROM DeliverableVersion dv " +
            "WHERE dv.deliverable.id = :deliverableId " +
            "ORDER BY dv.versionNumber DESC " +
            "LIMIT 1")
    Optional<DeliverableVersion> findLatestByDeliverableId(@Param("deliverableId") Long deliverableId);

    // Get specific version number
    Optional<DeliverableVersion> findByDeliverableIdAndVersionNumber(Long deliverableId, Integer versionNumber);

    // Get all versions pending virus scan
    @Query("SELECT dv FROM DeliverableVersion dv " +
            "WHERE dv.virusScanStatus = com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion.VirusScanStatus.pending " +
            "ORDER BY dv.submittedAt ASC")
    List<DeliverableVersion> findPendingVirusScan();

    // Get all versions by submitted user
    @Query("SELECT dv FROM DeliverableVersion dv " +
            "WHERE dv.submittedBy.id = :userId " +
            "ORDER BY dv.submittedAt DESC")
    List<DeliverableVersion> findBySubmittedById(@Param("userId") Long userId);

    // Count versions for a deliverable
    @Query("SELECT COUNT(dv) FROM DeliverableVersion dv " +
            "WHERE dv.deliverable.id = :deliverableId")
    Long countByDeliverableId(@Param("deliverableId") Long deliverableId);

    // Get next version number
    @Query("SELECT COALESCE(MAX(dv.versionNumber), 0) + 1 " +
            "FROM DeliverableVersion dv " +
            "WHERE dv.deliverable.id = :deliverableId")
    Integer getNextVersionNumber(@Param("deliverableId") Long deliverableId);

    // Find infected versions
    @Query("SELECT dv FROM DeliverableVersion dv " +
            "WHERE dv.virusScanStatus = com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableVersion.VirusScanStatus.infected " +
            "ORDER BY dv.submittedAt DESC")
    List<DeliverableVersion> findInfectedVersions();
}