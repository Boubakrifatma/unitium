package com.example.pi_projet.service;

import com.example.pi_projet.entity.MLTeamRecommendation;
import com.example.pi_projet.entity.ProjectMember.ProjectRole;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.repository.MLTeamRecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MLTeamRecommendationService {
    private final MLTeamRecommendationRepository repository;
    private final WorkspaceService workspaceService;
    private final ProjectMemberService projectMemberService;
    private final com.example.pi_projet.repository.UserRepository userRepo;

    public MLTeamRecommendation create(MLTeamRecommendation rec) {
        if (!userRepo.existsById(rec.getRecommendedUserId())) throw new Module2Exception(NOT_FOUND, "Recommended user not found");
        return repository.save(rec);
    }

    public List<MLTeamRecommendation> getAll() {
        return repository.findAll();
    }

    public MLTeamRecommendation getByIdOrThrow(UUID id) {
        return repository.findById(id).orElseThrow(() -> new Module2Exception(NOT_FOUND, "Recommendation not found"));
    }

    public Optional<MLTeamRecommendation> getById(UUID id) {
        return repository.findById(id);
    }

    public List<MLTeamRecommendation> getByProjectId(UUID projectId) {
        return repository.findByProjectId(projectId);
    }

    public List<MLTeamRecommendation> getByRecommendedUserId(Long userId) {
        return repository.findByRecommendedUserId(userId);
    }

    public MLTeamRecommendation update(UUID id, MLTeamRecommendation rec) {
        rec.setId(id);
        return repository.save(rec);
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }

    public MLTeamRecommendation acceptRecommendation(UUID id, Long reviewerId) {
        // Make the accept + assignment atomic
        return acceptAndAssign(id, reviewerId);
    }

    @Transactional
    public MLTeamRecommendation acceptAndAssign(UUID id, Long reviewerId) {
        MLTeamRecommendation rec = getByIdOrThrow(id);
        if (!userRepo.existsById(rec.getRecommendedUserId())) throw new Module2Exception(NOT_FOUND, "Recommended user not found");
        // Validate recommended user is member of project's workspace
        if (!workspaceService.isMember(rec.getProject().getWorkspace().getId(), rec.getRecommendedUserId())) {
            throw new Module2Exception(BAD_REQUEST, "Recommended user is not a member of the project's workspace");
        }

        // Assign into project first (may throw Module2Exception if already assigned)
        projectMemberService.add(rec.getProject().getId(), rec.getRecommendedUserId(), ProjectRole.DEVELOPER, reviewerId);

        // Update recommendation record
        rec.setStatus(MLTeamRecommendation.RecommendationStatus.ACCEPTED);
        rec.setReviewedBy(reviewerId);
        rec.setReviewedAt(Instant.now());
        return repository.save(rec);
    }

    public MLTeamRecommendation rejectRecommendation(UUID id, Long reviewerId) {
        MLTeamRecommendation rec = getByIdOrThrow(id);
        rec.setStatus(MLTeamRecommendation.RecommendationStatus.REJECTED);
        rec.setReviewedBy(reviewerId);
        rec.setReviewedAt(Instant.now());
        return repository.save(rec);
    }
}
