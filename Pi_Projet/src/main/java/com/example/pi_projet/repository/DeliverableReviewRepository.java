package com.example.pi_projet.repository;

import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliverableReviewRepository extends JpaRepository<DeliverableReview, Long> {

    // Get all reviews for a deliverable
    List<DeliverableReview> findByDeliverableId(Long deliverableId);

    // Get reviews by deliverable and reviewer role
    List<DeliverableReview> findByDeliverableIdAndReviewerRole(Long deliverable_id, DeliverableReview.ReviewerRole reviewerRole);

    // Get pending manager reviews for a deliverable
    List<DeliverableReview> findByDeliverableIdAndReviewerRoleAndDecision(
            Long deliverableId,
            DeliverableReview.ReviewerRole role,
            DeliverableReview.ReviewDecision decision
    );

    // Get all pending reviews for a manager
    @Query("SELECT dr FROM DeliverableReview dr " +
            "WHERE dr.reviewer.id = :reviewerId " +
            "AND dr.reviewerRole = 'MANAGER' " +
            "AND dr.decision = 'PENDING' " +
            "ORDER BY dr.createdAt DESC")
    List<DeliverableReview> findPendingManagerReviews(@Param("reviewerId") Long reviewerId);

    // Get latest review for a deliverable by reviewer role
    @Query("SELECT dr FROM DeliverableReview dr " +
            "WHERE dr.deliverable.id = :deliverableId " +
            "AND dr.reviewerRole = :role " +
            "ORDER BY dr.reviewedAt DESC " +
            "LIMIT 1")
    Optional<DeliverableReview> findLatestReviewByRole(
            @Param("deliverableId") Long deliverableId,
            @Param("role") DeliverableReview.ReviewerRole role
    );

    // Get all reviews for a version
    List<DeliverableReview> findByVersionId(Long versionId);

    // Get manager review for a deliverable (most recent)
    @Query("SELECT dr FROM DeliverableReview dr " +
            "WHERE dr.deliverable.id = :deliverableId " +
            "AND dr.reviewerRole = 'MANAGER' " +
            "ORDER BY dr.reviewedAt DESC " +
            "LIMIT 1")
    Optional<DeliverableReview> findLatestManagerReview(@Param("deliverableId") Long deliverableId);

    // Get all accepted deliverables pending PO review
    @Query("SELECT DISTINCT dr FROM DeliverableReview dr " +
            "WHERE dr.reviewerRole = 'MANAGER' " +
            "AND dr.decision = 'ACCEPTED' " +
            "AND NOT EXISTS (" +
            "  SELECT 1 FROM DeliverableReview dr2 " +
            "  WHERE dr2.deliverable.id = dr.deliverable.id " +
            "  AND dr2.reviewerRole = 'PO'" +
            ") " +
            "ORDER BY dr.reviewedAt DESC")
    List<DeliverableReview> findAcceptedDeliverablesPendingPOReview();

    // Count reviews by manager
    @Query("SELECT COUNT(dr) FROM DeliverableReview dr " +
            "WHERE dr.reviewer.id = :managerId " +
            "AND dr.reviewerRole = 'MANAGER'")
    Long countReviewsByManager(@Param("managerId") Long managerId);

    // Count accepted reviews by manager
    @Query("SELECT COUNT(dr) FROM DeliverableReview dr " +
            "WHERE dr.reviewer.id = :managerId " +
            "AND dr.reviewerRole = 'MANAGER' " +
            "AND dr.decision = 'ACCEPTED'")
    Long countAcceptedReviewsByManager(@Param("managerId") Long managerId);

    // Count rejected reviews by manager
    @Query("SELECT COUNT(dr) FROM DeliverableReview dr " +
            "WHERE dr.reviewer.id = :managerId " +
            "AND dr.reviewerRole = 'MANAGER' " +
            "AND dr.decision = 'REVISION_REQUIRED'")
    Long countRejectedReviewsByManager(@Param("managerId") Long managerId);

    // Average score by manager
    @Query("SELECT AVG(dr.score) FROM DeliverableReview dr " +
            "WHERE dr.reviewer.id = :managerId " +
            "AND dr.reviewerRole = 'MANAGER' " +
            "AND dr.score IS NOT NULL")
    Double getAverageScoreByManager(@Param("managerId") Long managerId);

    // Get all reviews by reviewer
    List<DeliverableReview> findByReviewerId(Long reviewerId);

    // Get submitted deliverables by employee that need manager review
    @Query("SELECT DISTINCT d FROM Deliverable d " +
            "WHERE d.submittedBy.id = :employeeId " +
            "AND NOT EXISTS (" +
            "  SELECT 1 FROM DeliverableReview dr " +
            "  WHERE dr.deliverable.id = d.id " +
            "  AND dr.reviewerRole = 'MANAGER'" +
            ")")
    List<DeliverableReview> findEmployeeDeliverablesNeedingManagerReview(@Param("employeeId") Long employeeId);
}