package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {
    Optional<Invitation> findByToken(String token);
    List<Invitation> findByOrgIdAndStatus(UUID orgId, Invitation.Status status);
    boolean existsByOrgIdAndEmailAndStatus(UUID orgId, String email, Invitation.Status status);
    Optional<Invitation> findByOrgIdAndEmailAndStatus(UUID orgId, String email, Invitation.Status status);
}
