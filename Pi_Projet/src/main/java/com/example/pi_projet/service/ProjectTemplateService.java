package com.example.pi_projet.service;

import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.TemplateRating;
import com.example.pi_projet.exception.M2ValidationUtils;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.repository.ProjectTemplateRepository;
import com.example.pi_projet.repository.TemplateRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectTemplateService {
    private final ProjectTemplateRepository projectTemplateRepository;
    private final TemplateRatingRepository templateRatingRepository;

    public Page<ProjectTemplate> getAll(Pageable pageable) {
        return projectTemplateRepository.findAll(pageable);
    }

    public Optional<ProjectTemplate> getById(UUID id) {
        return projectTemplateRepository.findById(id);
    }
    public ProjectTemplate createTemplate(ProjectTemplate template) {
        // Name is the only strictly required field — validated with min/max
        M2ValidationUtils.requireTemplateName(template.getName());

        template.setVersion(template.getVersion() != null ? template.getVersion() : 1);
        template.setStatus(ProjectTemplate.TemplateStatus.DRAFT);
        template.setIsPublic(false);
        template.setUsageCount(0);
        template.setRating(0.0);
        template.setRatingCount(0);
        if (template.getTeamStrategy() == null) template.setTeamStrategy(ProjectTemplate.TeamStrategy.MANUAL);
        if (template.getTemplateType() == null) template.setTemplateType(ProjectTemplate.TemplateType.CUSTOM);
        return projectTemplateRepository.save(template);
    }

    public ProjectTemplate update(UUID id, ProjectTemplate updated) {
        // Validate name before touching the DB row
        if (updated.getName() != null) {
            M2ValidationUtils.requireTemplateName(updated.getName());
        }
        return projectTemplateRepository.findById(id)
                .map(existing -> {
                    // Only overwrite fields that were explicitly provided (non-null in patch)
                    if (updated.getName()                   != null) existing.setName(updated.getName().trim());
                    if (updated.getTemplateType()           != null) existing.setTemplateType(updated.getTemplateType());
                    if (updated.getDefaultPhasesJson()      != null) existing.setDefaultPhasesJson(updated.getDefaultPhasesJson());
                    if (updated.getDefaultRolesJson()       != null) existing.setDefaultRolesJson(updated.getDefaultRolesJson());
                    if (updated.getDefaultMilestonesJson()  != null) existing.setDefaultMilestonesJson(updated.getDefaultMilestonesJson());
                    if (updated.getDefaultTasksJson()       != null) existing.setDefaultTasksJson(updated.getDefaultTasksJson());
                    if (updated.getDefaultProjectConfigJson() != null) existing.setDefaultProjectConfigJson(updated.getDefaultProjectConfigJson());
                    if (updated.getUseCaseDescription()     != null) existing.setUseCaseDescription(updated.getUseCaseDescription());
                    if (updated.getEstimatedEffort()        != null) existing.setEstimatedEffort(updated.getEstimatedEffort());
                    if (updated.getEstimatedDurationDays()  != null) existing.setEstimatedDurationDays(updated.getEstimatedDurationDays());
                    if (updated.getDifficultyLevel()        != null) existing.setDifficultyLevel(updated.getDifficultyLevel());
                    if (updated.getTags()                   != null) existing.setTags(updated.getTags());
                    if (updated.getTeamStrategy()           != null) existing.setTeamStrategy(updated.getTeamStrategy());
                    return projectTemplateRepository.save(existing);
                })
                .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
    }

    public void delete(UUID id) {
        projectTemplateRepository.deleteById(id);
    }

    public ProjectTemplate publishTemplate(UUID id, Long requesterId) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setIsPublic(true);
        t.setStatus(ProjectTemplate.TemplateStatus.PENDING_APPROVAL);
        return projectTemplateRepository.save(t);
    }

    public ProjectTemplate approveTemplate(UUID id, Long approverId) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setStatus(ProjectTemplate.TemplateStatus.APPROVED);
        t.setApprovedBy(approverId);
        t.setApprovedAt(LocalDateTime.now());
        return projectTemplateRepository.save(t);
    }

    public ProjectTemplate rejectTemplate(UUID id, Long approverId, String reason) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setStatus(ProjectTemplate.TemplateStatus.REJECTED);
        t.setApprovedBy(approverId);
        t.setRejectionReason(reason);
        return projectTemplateRepository.save(t);
    }

    public ProjectTemplate rateTemplate(UUID id, int rating, Long userId) {
        if (rating < 1 || rating > 5) throw new Module2Exception(BAD_REQUEST, "Rating must be between 1 and 5");
        if (templateRatingRepository.existsByTemplateIdAndUserId(id, userId)) {
            throw new Module2Exception(CONFLICT, "You have already rated this template");
        }
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        templateRatingRepository.save(TemplateRating.builder()
            .templateId(id).userId(userId).rating(rating).build());
        int currentCount = t.getRatingCount() == null ? 0 : t.getRatingCount();
        double currentRating = t.getRating() == null ? 0.0 : t.getRating();
        double newAvg = (currentRating * currentCount + rating) / (currentCount + 1);
        t.setRating(newAvg);
        t.setRatingCount(currentCount + 1);
        return projectTemplateRepository.save(t);
    }

    public Page<ProjectTemplate> getPublicTemplates(Pageable pageable) {
        return projectTemplateRepository.findAllByIsPublicTrueAndStatus(ProjectTemplate.TemplateStatus.APPROVED, pageable);
    }

    // simple saver used by other services when updating small fields
    public ProjectTemplate saveTemplate(ProjectTemplate template) {
        return projectTemplateRepository.save(template);
    }

    // atomic increment — no race condition under concurrent use
    public void incrementUsageCount(UUID id) {
        projectTemplateRepository.incrementUsageCount(id);
    }

    public Page<ProjectTemplate> getByCreatedBy(Long createdBy, Pageable pageable) {
        return projectTemplateRepository.findByCreatedBy(createdBy, pageable);
    }

    public Page<ProjectTemplate> getByStatus(ProjectTemplate.TemplateStatus status, Pageable pageable) {
        return projectTemplateRepository.findByStatus(status, pageable);
    }

    public ProjectTemplate featureTemplate(UUID id, boolean featured) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setIsFeatured(featured);
        return projectTemplateRepository.save(t);
    }

    public ProjectTemplate trendingTemplate(UUID id, boolean trending) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setIsTrending(trending);
        return projectTemplateRepository.save(t);
    }

    @org.springframework.transaction.annotation.Transactional
    public ProjectTemplate forkTemplate(UUID sourceId, Long requesterId) {
        ProjectTemplate s = projectTemplateRepository.findById(sourceId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        ProjectTemplate fork = ProjectTemplate.builder()
            .name(s.getName() + " (Fork)")
            .templateType(s.getTemplateType())
            .defaultProjectConfigJson(s.getDefaultProjectConfigJson())
            .defaultPhasesJson(s.getDefaultPhasesJson())
            .defaultRolesJson(s.getDefaultRolesJson())
            .defaultMilestonesJson(s.getDefaultMilestonesJson())
            .defaultTasksJson(s.getDefaultTasksJson())
            .teamRecommendationJson(s.getTeamRecommendationJson())
            .teamStrategy(s.getTeamStrategy())
            .estimatedEffort(s.getEstimatedEffort())
            .estimatedDurationDays(s.getEstimatedDurationDays())
            .difficultyLevel(s.getDifficultyLevel())
            .tags(s.getTags())
            .useCaseDescription(s.getUseCaseDescription())
            .parentTemplateId(s.getId())
            .version(1)
            .status(ProjectTemplate.TemplateStatus.DRAFT)
            .isPublic(false)
            .createdBy(requesterId)
            .build();
        return projectTemplateRepository.save(fork);
    }
}
