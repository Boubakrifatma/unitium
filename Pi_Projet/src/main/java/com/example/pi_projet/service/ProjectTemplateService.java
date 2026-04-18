package com.example.pi_projet.service;

import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.entity.TemplateFavorite;
import com.example.pi_projet.entity.TemplateRating;
import com.example.pi_projet.exception.M2ValidationUtils;
import com.example.pi_projet.exception.Module2Exception;
import static com.example.pi_projet.exception.Module2Exception.ErrorCode.*;
import com.example.pi_projet.repository.ProjectTemplateRepository;
import com.example.pi_projet.repository.TemplateFavoriteRepository;
import com.example.pi_projet.repository.TemplateRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectTemplateService {
    private final ProjectTemplateRepository projectTemplateRepository;
    private final TemplateRatingRepository templateRatingRepository;
    private final TemplateFavoriteRepository templateFavoriteRepository;
    private final M2AuditLogService auditLogService;

    public static class LineageNode {
        public UUID id;
        public String name;
        public Long createdBy;
        public Double rating;
        public Integer ratingCount;
        public Integer usageCount;
        public ProjectTemplate.TemplateStatus status;
        public Instant createdAt;
        public List<LineageNode> children;
    }

    public Page<ProjectTemplate> getAll(Pageable pageable) {
        return projectTemplateRepository.findAll(pageable);
    }

    public Optional<ProjectTemplate> getById(UUID id) {
        return projectTemplateRepository.findById(id);
    }

    public Optional<ProjectTemplate> findFirstByNameIgnoreCase(String name) {
        if (!StringUtils.hasText(name)) {
            return Optional.empty();
        }
        return projectTemplateRepository.findFirstByNameIgnoreCase(name.trim());
    }

    public ProjectTemplate createTemplate(ProjectTemplate template) {
        // Name is the only strictly required field — validated with min/max
        M2ValidationUtils.requireTemplateName(template.getName());

        if (template.getCreatedBy() != null
                && projectTemplateRepository.existsByNameIgnoreCaseAndCreatedBy(
                        template.getName().trim(), template.getCreatedBy())) {
            throw new Module2Exception(CONFLICT,
                "You already have a template named '" + template.getName().trim() + "'");
        }

        template.setVersion(template.getVersion() != null ? template.getVersion() : 1);
        template.setStatus(ProjectTemplate.TemplateStatus.DRAFT);
        template.setIsPublic(false);
        template.setUsageCount(0);
        template.setRating(0.0);
        template.setRatingCount(0);
        if (template.getTeamStrategy() == null) template.setTeamStrategy(ProjectTemplate.TeamStrategy.MANUAL);
        if (template.getTemplateType() == null) template.setTemplateType(ProjectTemplate.TemplateType.CUSTOM);
        ProjectTemplate saved = projectTemplateRepository.save(template);
        auditTemplate(saved.getCreatedBy(), "CREATE_TEMPLATE", saved);
        return saved;
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
        ProjectTemplate saved = projectTemplateRepository.save(t);
        auditTemplate(requesterId, "PUBLISH_TEMPLATE", saved);
        return saved;
    }

    public ProjectTemplate approveTemplate(UUID id, Long approverId) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setStatus(ProjectTemplate.TemplateStatus.APPROVED);
        t.setApprovedBy(approverId);
        t.setApprovedAt(LocalDateTime.now());
        ProjectTemplate saved = projectTemplateRepository.save(t);
        auditTemplate(approverId, "APPROVE_TEMPLATE", saved);
        return saved;
    }

    public ProjectTemplate rejectTemplate(UUID id, Long approverId, String reason) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setStatus(ProjectTemplate.TemplateStatus.REJECTED);
        t.setApprovedBy(approverId);
        t.setRejectionReason(reason);
        ProjectTemplate saved = projectTemplateRepository.save(t);
        auditTemplate(approverId, "REJECT_TEMPLATE", saved);
        return saved;
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
        ProjectTemplate saved = projectTemplateRepository.save(t);
        auditTemplate(userId, "RATE_TEMPLATE", saved);
        return saved;
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

    public ProjectTemplate recommendTemplate(UUID id, boolean recommended) {
        ProjectTemplate t = projectTemplateRepository.findById(id)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        t.setIsRecommended(recommended);
        return projectTemplateRepository.save(t);
    }

    // ─── Server-side search ────────────────────────────────────────────────────

    public Page<ProjectTemplate> search(String search, String type, String status,
                                         String difficulty, Boolean isPublic,
                                         Pageable pageable) {
        String searchTrim = StringUtils.hasText(search) ? search.trim() : null;
        ProjectTemplate.TemplateType typeEnum = parseEnum(ProjectTemplate.TemplateType.class, type);
        ProjectTemplate.TemplateStatus statusEnum = parseEnum(ProjectTemplate.TemplateStatus.class, status);
        ProjectTemplate.DifficultyLevel difficultyEnum = parseEnum(ProjectTemplate.DifficultyLevel.class, difficulty);
        return projectTemplateRepository.search(searchTrim, typeEnum, statusEnum, difficultyEnum, isPublic, pageable);
    }

    private <E extends Enum<E>> E parseEnum(Class<E> cls, String val) {
        if (!StringUtils.hasText(val)) return null;
        try { return Enum.valueOf(cls, val.trim().toUpperCase(Locale.ROOT)); }
        catch (Exception e) { return null; }
    }

    // ─── Recommendations & Analytics ───────────────────────────────────────────

    public Map<String, Object> getRecommendations(Long userId,
                                                  String contextProjectType,
                                                  String contextDifficulty,
                                                  String workspaceOrgType,
                                                  Integer limit) {
        int safeLimit = Math.max(1, Math.min(limit == null ? 10 : limit, 50));
        int fetchSize = Math.max(50, Math.min(250, safeLimit * 6));

        ProjectTemplate.TemplateType typeEnum = parseEnum(ProjectTemplate.TemplateType.class, contextProjectType);
        ProjectTemplate.DifficultyLevel difficultyEnum = parseEnum(ProjectTemplate.DifficultyLevel.class, contextDifficulty);

        List<ProjectTemplate> candidates = new ArrayList<>(
            projectTemplateRepository.search(
                null,
                typeEnum,
                ProjectTemplate.TemplateStatus.APPROVED,
                difficultyEnum,
                true,
                PageRequest.of(0, fetchSize)
            ).getContent()
        );

        if (candidates.isEmpty() && (typeEnum != null || difficultyEnum != null)) {
            candidates = new ArrayList<>(
                projectTemplateRepository.search(
                    null,
                    null,
                    ProjectTemplate.TemplateStatus.APPROVED,
                    null,
                    true,
                    PageRequest.of(0, fetchSize)
                ).getContent()
            );
        }

        Set<UUID> userFavoriteIds = new HashSet<>(templateFavoriteRepository.findTemplateIdsByUserId(userId));
        Instant since14Days = Instant.now().minus(14, ChronoUnit.DAYS);

        List<Map<String, Object>> scored = new ArrayList<>();
        for (ProjectTemplate template : candidates) {
            long favoriteCount = templateFavoriteRepository.countByTemplateId(template.getId());
            long recentFavorites = templateFavoriteRepository.countByTemplateIdAndCreatedAtAfter(template.getId(), since14Days);
            long recentRatings = templateRatingRepository.countByTemplateIdAndCreatedAtAfter(template.getId(), since14Days);

            boolean favoritedByCurrentUser = userFavoriteIds.contains(template.getId());
            boolean typeMatch = matchesProjectType(template, contextProjectType);
            boolean difficultyMatch = matchesDifficulty(template, contextDifficulty);
            boolean orgTypeMatch = matchesOrgTypeHint(template, workspaceOrgType);

            double ratingScore = clamp01((template.getRating() == null ? 0.0 : template.getRating()) / 5.0) * 35.0;
            double usageScore = normalizeLog(template.getUsageCount() == null ? 0 : template.getUsageCount(), 200) * 18.0;
            double favoritesScore = normalizeLog(favoriteCount, 120) * 14.0;
            double recencyScore = clamp01((recentFavorites + recentRatings) / 20.0) * 10.0;

            double score = ratingScore + usageScore + favoritesScore + recencyScore;
            if (Boolean.TRUE.equals(template.getIsFeatured())) score += 6.0;
            if (Boolean.TRUE.equals(template.getIsTrending())) score += 6.0;
            if (Boolean.TRUE.equals(template.getIsRecommended())) score += 4.0;
            if (favoritedByCurrentUser) score += 10.0;
            if (typeMatch) score += 7.0;
            if (difficultyMatch) score += 7.0;
            if (orgTypeMatch) score += 4.0;

            score = Math.max(0.0, Math.min(100.0, score));

            List<String> reasons = new ArrayList<>();
            if (favoritedByCurrentUser) reasons.add("Based on your favorites");
            if (typeMatch) reasons.add("Matches requested project type");
            if (difficultyMatch) reasons.add("Matches requested difficulty");
            if (orgTypeMatch) reasons.add("Fits workspace organization context");
            if (Boolean.TRUE.equals(template.getIsTrending())) reasons.add("Trending among users");
            if ((template.getRating() != null && template.getRating() >= 4.2)
                && (template.getRatingCount() != null && template.getRatingCount() >= 3)) {
                reasons.add("Highly rated by community");
            }
            if (template.getUsageCount() != null && template.getUsageCount() >= 10) {
                reasons.add("Frequently used in real projects");
            }
            if (reasons.isEmpty()) {
                reasons.add("Popular template for this context");
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("templateId", template.getId());
            row.put("name", template.getName());
            row.put("templateType", template.getTemplateType());
            row.put("difficultyLevel", template.getDifficultyLevel());
            row.put("score", round1(score));
            row.put("rating", round1(template.getRating() == null ? 0.0 : template.getRating()));
            row.put("ratingCount", template.getRatingCount() == null ? 0 : template.getRatingCount());
            row.put("usageCount", template.getUsageCount() == null ? 0 : template.getUsageCount());
            row.put("favoriteCount", favoriteCount);
            row.put("isFeatured", Boolean.TRUE.equals(template.getIsFeatured()));
            row.put("isTrending", Boolean.TRUE.equals(template.getIsTrending()));
            row.put("isRecommended", Boolean.TRUE.equals(template.getIsRecommended()));
            row.put("favoritedByCurrentUser", favoritedByCurrentUser);
            row.put("reasons", reasons);
            scored.add(row);
        }

        scored.sort((left, right) -> {
            double scoreDelta = ((Number) right.get("score")).doubleValue() - ((Number) left.get("score")).doubleValue();
            if (scoreDelta > 0) return 1;
            if (scoreDelta < 0) return -1;

            int usageDelta = ((Number) right.get("usageCount")).intValue() - ((Number) left.get("usageCount")).intValue();
            if (usageDelta != 0) return usageDelta;

            double ratingDelta = ((Number) right.get("rating")).doubleValue() - ((Number) left.get("rating")).doubleValue();
            if (ratingDelta > 0) return 1;
            if (ratingDelta < 0) return -1;

            return 0;
        });

        if (scored.size() > safeLimit) {
            scored = new ArrayList<>(scored.subList(0, safeLimit));
        }

        Map<String, Object> context = new LinkedHashMap<>();
        context.put("projectType", contextProjectType);
        context.put("difficulty", contextDifficulty);
        context.put("workspaceOrgType", workspaceOrgType);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now());
        payload.put("limit", safeLimit);
        payload.put("count", scored.size());
        payload.put("context", context);
        payload.put("items", scored);
        return payload;
    }

    public Map<String, Object> getTemplateAnalytics(UUID templateId, Long userId) {
        ProjectTemplate template = projectTemplateRepository.findById(templateId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));

        Instant now = Instant.now();
        Instant since7 = now.minus(7, ChronoUnit.DAYS);
        Instant since30 = now.minus(30, ChronoUnit.DAYS);

        long favoriteCount = templateFavoriteRepository.countByTemplateId(templateId);
        long favoritesLast7d = templateFavoriteRepository.countByTemplateIdAndCreatedAtAfter(templateId, since7);
        long favoritesLast30d = templateFavoriteRepository.countByTemplateIdAndCreatedAtAfter(templateId, since30);

        long ratingsLast7d = templateRatingRepository.countByTemplateIdAndCreatedAtAfter(templateId, since7);
        long ratingsLast30d = templateRatingRepository.countByTemplateIdAndCreatedAtAfter(templateId, since30);

        Map<Integer, Long> ratingDistribution = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            ratingDistribution.put(i, 0L);
        }
        for (Object[] row : templateRatingRepository.findRatingDistribution(templateId)) {
            int rating = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (ratingDistribution.containsKey(rating)) {
                ratingDistribution.put(rating, count);
            }
        }

        double avgRating = template.getRating() == null ? 0.0 : template.getRating();
        int ratingCount = template.getRatingCount() == null ? 0 : template.getRatingCount();
        int usageCount = template.getUsageCount() == null ? 0 : template.getUsageCount();

        Instant createdAt = template.getCreatedAt() == null ? now : template.getCreatedAt();
        long ageDays = Math.max(1L, ChronoUnit.DAYS.between(createdAt, now));
        double usageVelocityPerWeek = round1((usageCount * 7.0) / ageDays);

        double qualityScore = Math.min(100.0,
            ((avgRating / 5.0) * 60.0)
                + (Math.min(ratingCount, 100) / 100.0) * 20.0
                + (Math.min(favoriteCount, 100L) / 100.0) * 20.0
        );

        double growthRaw = (favoritesLast30d * 1.5) + (ratingsLast30d * 2.0) + (usageVelocityPerWeek * 3.0);
        double growthScore = Math.min(100.0, round1(growthRaw));

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("favoriteCount", favoriteCount);
        totals.put("ratingCount", ratingCount);
        totals.put("usageCount", usageCount);
        totals.put("averageRating", round1(avgRating));

        Map<String, Object> recent = new LinkedHashMap<>();
        recent.put("favorites7d", favoritesLast7d);
        recent.put("favorites30d", favoritesLast30d);
        recent.put("ratings7d", ratingsLast7d);
        recent.put("ratings30d", ratingsLast30d);

        Map<String, Object> scores = new LinkedHashMap<>();
        scores.put("qualityScore", round1(qualityScore));
        scores.put("growthScore", round1(growthScore));
        scores.put("usageVelocityPerWeek", usageVelocityPerWeek);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("templateId", template.getId());
        payload.put("name", template.getName());
        payload.put("status", template.getStatus());
        payload.put("isPublic", Boolean.TRUE.equals(template.getIsPublic()));
        payload.put("favoritedByCurrentUser", userId != null && isFavorited(templateId, userId));
        payload.put("totals", totals);
        payload.put("recent", recent);
        payload.put("ratingDistribution", ratingDistribution);
        payload.put("scores", scores);
        payload.put("generatedAt", now);
        return payload;
    }

    private boolean matchesProjectType(ProjectTemplate template, String contextProjectType) {
        if (!StringUtils.hasText(contextProjectType)) {
            return false;
        }
        String normalizedContext = contextProjectType.trim().toLowerCase(Locale.ROOT);

        if (template.getTemplateType() != null
            && template.getTemplateType().name().equalsIgnoreCase(contextProjectType.trim())) {
            return true;
        }

        String haystack = (safeLower(template.getName()) + " "
            + safeLower(template.getTags()) + " "
            + safeLower(template.getUseCaseDescription())).trim();
        return haystack.contains(normalizedContext);
    }

    private boolean matchesDifficulty(ProjectTemplate template, String contextDifficulty) {
        if (!StringUtils.hasText(contextDifficulty) || template.getDifficultyLevel() == null) {
            return false;
        }
        return template.getDifficultyLevel().name().equalsIgnoreCase(contextDifficulty.trim());
    }

    private boolean matchesOrgTypeHint(ProjectTemplate template, String workspaceOrgType) {
        if (!StringUtils.hasText(workspaceOrgType)) {
            return false;
        }

        String normalizedOrgType = workspaceOrgType.trim().toLowerCase(Locale.ROOT);
        String haystack = (safeLower(template.getTags()) + " " + safeLower(template.getUseCaseDescription()));

        if (normalizedOrgType.contains("academic")) {
            return haystack.contains("course")
                || haystack.contains("research")
                || haystack.contains("student")
                || haystack.contains("education")
                || haystack.contains("capstone");
        }

        return haystack.contains("business")
            || haystack.contains("enterprise")
            || haystack.contains("product")
            || haystack.contains("market")
            || haystack.contains("client");
    }

    private String safeLower(String input) {
        return input == null ? "" : input.toLowerCase(Locale.ROOT);
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private double normalizeLog(long value, long pivot) {
        if (value <= 0 || pivot <= 0) {
            return 0.0;
        }
        double numerator = Math.log1p(value);
        double denominator = Math.log1p(pivot);
        if (denominator <= 0.0) {
            return 0.0;
        }
        return clamp01(numerator / denominator);
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    // ─── Template Favoriting ───────────────────────────────────────────────────

    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> toggleFavorite(UUID templateId, Long userId) {
        ProjectTemplate t = projectTemplateRepository.findById(templateId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));
        boolean isFav = templateFavoriteRepository.existsByTemplateIdAndUserId(templateId, userId);
        if (isFav) {
            templateFavoriteRepository.deleteByTemplateIdAndUserId(templateId, userId);
        } else {
            templateFavoriteRepository.save(
                TemplateFavorite.builder().templateId(templateId).userId(userId).build());
        }
        long count = templateFavoriteRepository.countByTemplateId(templateId);
        auditTemplate(userId, isFav ? "UNFAVORITE_TEMPLATE" : "FAVORITE_TEMPLATE", t);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("favorited", !isFav);
        result.put("favoriteCount", count);
        return result;
    }

    public Page<ProjectTemplate> getMyFavorites(Long userId, Pageable pageable) {
        List<UUID> ids = templateFavoriteRepository.findTemplateIdsByUserId(userId);
        if (ids.isEmpty()) return Page.empty(pageable);
        List<ProjectTemplate> templates = projectTemplateRepository.findAllByIdIn(ids);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), templates.size());
        List<ProjectTemplate> page = start >= templates.size() ? List.of() : templates.subList(start, end);
        return new PageImpl<>(page, pageable, templates.size());
    }

    public boolean isFavorited(UUID templateId, Long userId) {
        return templateFavoriteRepository.existsByTemplateIdAndUserId(templateId, userId);
    }

    public long getFavoriteCount(UUID templateId) {
        return templateFavoriteRepository.countByTemplateId(templateId);
    }

    public Map<String, Object> getFavoriteStatus(UUID templateId, Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("favorited", isFavorited(templateId, userId));
        result.put("favoriteCount", getFavoriteCount(templateId));
        return result;
    }

    // ─── Fork ─────────────────────────────────────────────────────────────────

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

    public LineageNode getLineage(UUID rootId, int maxDepth) {
        ProjectTemplate requested = projectTemplateRepository.findById(rootId)
            .orElseThrow(() -> new Module2Exception(NOT_FOUND, "Template not found"));

        int safeDepth = Math.max(0, maxDepth);

        // Walk up to the highest ancestor while avoiding broken cycles.
        Set<UUID> ancestorVisited = new HashSet<>();
        ProjectTemplate current = requested;
        ancestorVisited.add(current.getId());

        while (current.getParentTemplateId() != null) {
            UUID parentId = current.getParentTemplateId();
            if (!ancestorVisited.add(parentId)) {
                break;
            }

            Optional<ProjectTemplate> parentOpt = projectTemplateRepository.findById(parentId);
            if (parentOpt.isEmpty()) {
                break;
            }
            current = parentOpt.get();
        }

        return buildTree(current, safeDepth, 0, new HashSet<>());
    }

    private LineageNode buildTree(ProjectTemplate node, int maxDepth, int currentDepth, Set<UUID> pathVisited) {
        if (!pathVisited.add(node.getId())) {
            return null;
        }

        LineageNode ln = new LineageNode();
        ln.id = node.getId();
        ln.name = node.getName();
        ln.createdBy = node.getCreatedBy();
        ln.rating = node.getRating();
        ln.ratingCount = node.getRatingCount();
        ln.usageCount = node.getUsageCount();
        ln.status = node.getStatus();
        ln.createdAt = node.getCreatedAt();
        ln.children = new ArrayList<>();

        if (currentDepth < maxDepth) {
            List<ProjectTemplate> children = projectTemplateRepository.findByParentTemplateId(node.getId());
            for (ProjectTemplate child : children) {
                if (child.getDeletedAt() == null) { // Exclude soft-deleted
                    LineageNode childNode = buildTree(child, maxDepth, currentDepth + 1, pathVisited);
                    if (childNode != null) {
                        ln.children.add(childNode);
                    }
                }
            }
        }

        pathVisited.remove(node.getId());
        return ln;
    }

    private void auditTemplate(Long userId, String actionType, ProjectTemplate t) {
        try {
            auditLogService.writeAudit(userId, null, actionType, "template",
                t.getId().toString(), t.getName(), null, null);
        } catch (Exception ignored) {}
    }
}
