package com.example.pi_projet.repository;

import com.example.pi_projet.entity.student.StudentDeliverable;
import com.example.pi_projet.entity.student.StudentDeliverable.StudentDeliverableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentDeliverableRepository extends JpaRepository<StudentDeliverable, Long> {

    @Query("SELECT d FROM StudentDeliverable d LEFT JOIN FETCH d.submittedBy LEFT JOIN FETCH d.tutor LEFT JOIN FETCH d.evaluatedBy WHERE d.id = :id")
    Optional<StudentDeliverable> findByIdWithDetails(@Param("id") Long id);

    /** Returns only original deliverables (no child versions) for a student. */
    @Query("SELECT d FROM StudentDeliverable d LEFT JOIN FETCH d.submittedBy LEFT JOIN FETCH d.tutor WHERE d.submittedBy.id = :studentId AND d.parentId IS NULL ORDER BY d.submittedAt DESC")
    List<StudentDeliverable> findByStudentId(@Param("studentId") Long studentId);

    /** Returns all versions (versionNumber > 1) for a given original deliverable, ordered by version. */
    @Query("SELECT d FROM StudentDeliverable d LEFT JOIN FETCH d.submittedBy LEFT JOIN FETCH d.tutor WHERE d.parentId = :parentId ORDER BY d.versionNumber ASC")
    List<StudentDeliverable> findVersionsByParentId(@Param("parentId") Long parentId);

    /** Next version number = max(versionNumber) across originals and all their versions. */
    @Query("SELECT COALESCE(MAX(d.versionNumber), 1) FROM StudentDeliverable d WHERE d.id = :parentId OR d.parentId = :parentId")
    int findMaxVersionNumber(@Param("parentId") Long parentId);

    @Query("SELECT d FROM StudentDeliverable d LEFT JOIN FETCH d.submittedBy LEFT JOIN FETCH d.tutor WHERE d.tutor.id = :tutorId ORDER BY d.submittedAt DESC")
    List<StudentDeliverable> findByTutorId(@Param("tutorId") Long tutorId);

    @Query("SELECT d FROM StudentDeliverable d LEFT JOIN FETCH d.submittedBy LEFT JOIN FETCH d.tutor WHERE d.tutor.id = :tutorId AND d.status = :status ORDER BY d.submittedAt ASC")
    List<StudentDeliverable> findByTutorIdAndStatus(@Param("tutorId") Long tutorId, @Param("status") StudentDeliverableStatus status);

    List<StudentDeliverable> findBySubmittedByIdAndStatus(Long studentId, StudentDeliverableStatus status);

    long countBySubmittedById(Long studentId);

    long countByTutorIdAndStatus(Long tutorId, StudentDeliverableStatus status);
}
