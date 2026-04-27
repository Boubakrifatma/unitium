package com.example.pi_projet.service;

import com.example.pi_projet.dto.TaskCreateDto;
import com.example.pi_projet.dto.TaskRiskResultDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskPredictionService {

    private final TaskRepository          taskRepository;
    private final RiskPredictionApiClient apiClient;

    public TaskRiskResultDto assess(TaskCreateDto dto) {

        // ── 1. user_workload : somme des heures actives de l'assigné ─────────
        float userWorkload = 0f;
        if (dto.getAssignedToId() != null) {
            Float stored = taskRepository.sumActiveEstimatedHoursByUser(
                    dto.getAssignedToId(), Task.TaskStatus.todo);
            userWorkload = (stored != null) ? stored : 0f;
        }

        // ── 2. user_completion_rate : tâches done / total ─────────────────────
        Float userCompletionRate = null;
        if (dto.getAssignedToId() != null) {
            Long total = taskRepository.countAllByUser(dto.getAssignedToId());
            Long done  = taskRepository.countCompletedByUser(
                    dto.getAssignedToId(), Task.TaskStatus.done);   // ← était "completed" (bug)
            if (total != null && total > 0) {
                userCompletionRate = done.floatValue() / total.floatValue();
            }
        }

        // ── 3. due_in_days ────────────────────────────────────────────────────
        long dueInDays = 30;
        if (dto.getDueDate() != null) {
            dueInDays = ChronoUnit.DAYS.between(LocalDate.now(), dto.getDueDate());
        }

        // ── 4. days_total (durée allouée = startDate → dueDate) ──────────────
        Integer daysTotal = null;
        if (dto.getDueDate() != null) {
            LocalDate from = (dto.getStartDate() != null) ? dto.getStartDate() : LocalDate.now();
            daysTotal = (int) Math.max(1, ChronoUnit.DAYS.between(from, dto.getDueDate()));
        }

        // ── 5. story_points dérivé de la difficulté ───────────────────────────
        Integer storyPoints = difficultyToStoryPoints(dto.getDifficulty());

        // ── 6. num_comments = 0 (tâche vient d'être créée) ───────────────────
        int numComments = 0;

        // ── 7. priority ───────────────────────────────────────────────────────
        String priority = dto.getPriority() != null
                ? capitalise(dto.getPriority())
                : "Medium";

        // ── 8. estimated_hours ────────────────────────────────────────────────
        float estimatedHours = dto.getEstimatedHours() != null ? dto.getEstimatedHours() : 4f;

        // Recaler la charge dans la plage d'entraînement [208, 283]
        float clampedWorkload = Math.max(208f, Math.min(283f, userWorkload + 208f));

        // ── 9. Appel ML API ───────────────────────────────────────────────────
        Map<String, Object> raw = apiClient.predict(
                estimatedHours,
                priority,
                dueInDays,
                clampedWorkload,
                userCompletionRate,
                null,           // user_experience_months (pas dans User → défaut Python)
                storyPoints != null ? storyPoints.floatValue() : null,
                (float) numComments,
                daysTotal != null ? daysTotal.floatValue() : null,
                dto.getTitle(),
                dto.getDescription()
        );

        // ── 10. Fallback si l'API est indisponible ────────────────────────────
        if (raw == null) {
            log.warn("ML API indisponible – fallback pour la tâche '{}'", dto.getTitle());
            return TaskRiskResultDto.builder()
                    .riskScore(0.0)
                    .highRisk(false)
                    .threshold(0.5)
                    .method("fallback")
                    .userWorkload(userWorkload)
                    .fallback(true)
                    .fallbackReason("Le service ML est indisponible. La tâche peut être créée normalement.")
                    .build();
        }

        double  riskScore = toDouble(raw.getOrDefault("risk_score", 0.0));
        boolean highRisk  = Boolean.TRUE.equals(raw.get("high_risk"));
        double  threshold = toDouble(raw.getOrDefault("threshold", 0.5));
        String  method    = (String) raw.getOrDefault("method", "ml_only");
        String  riskLevel = (String) raw.getOrDefault("risk_level", deriveRiskLevel(riskScore));
        String  reasoning = (String) raw.getOrDefault("reasoning", null);

        return TaskRiskResultDto.builder()
                .riskScore(riskScore)
                .highRisk(highRisk)
                .threshold(threshold)
                .method(method)
                .riskLevel(riskLevel)
                .reasoning(reasoning)
                .userWorkload(userWorkload)
                .fallback(false)
                .build();
    }

    private String deriveRiskLevel(double score) {
        if (score >= 0.65) return "high";
        if (score >= 0.35) return "medium";
        return "low";
    }

    private Integer difficultyToStoryPoints(String difficulty) {
        if (difficulty == null || difficulty.isBlank()) return null;
        return switch (difficulty.toLowerCase()) {
            case "easy"   -> 2;
            case "medium" -> 3;
            case "hard"   -> 8;
            default       -> null;
        };
    }

    private String capitalise(String s) {
        if (s == null || s.isBlank()) return "Medium";
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }

    private double toDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
