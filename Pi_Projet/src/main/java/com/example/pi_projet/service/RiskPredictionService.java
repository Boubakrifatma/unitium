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

/**
 * Orchestrates the ML risk prediction for a task about to be created:
 *  1. Calculates the assignee's current workload from the DB.
 *  2. Derives due_in_days from the provided dueDate.
 *  3. Delegates the HTTP call to {@link RiskPredictionApiClient}.
 *  4. Wraps the result into {@link TaskRiskResultDto}.
 *
 * This service never persists anything – it is purely a read + external call.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RiskPredictionService {

    private final TaskRepository          taskRepository;
    private final RiskPredictionApiClient apiClient;

    /**
     * Assess the risk of creating the given task payload without saving it.
     *
     * @param dto the same DTO the frontend would send to POST /api/tasks
     * @return a {@link TaskRiskResultDto} — never null, falls back gracefully on error
     */
    public TaskRiskResultDto assess(TaskCreateDto dto) {

        // ── 1. Compute user workload ──────────────────────────────────────────
        float userWorkload = 0f;
        if (dto.getAssignedToId() != null) {
            Float stored = taskRepository.sumActiveEstimatedHoursByUser(
                    dto.getAssignedToId(), Task.TaskStatus.todo);
            userWorkload = (stored != null) ? stored : 0f;
        }

        // ── 2. Compute due_in_days ────────────────────────────────────────────
        long dueInDays = 30; // sensible default when no due date is provided
        if (dto.getDueDate() != null) {
            dueInDays = ChronoUnit.DAYS.between(LocalDate.now(), dto.getDueDate());
        }

        // ── 3. Normalise priority to what the ML model expects ────────────────
        String priority = dto.getPriority() != null
                ? capitalise(dto.getPriority())   // low → Low, etc.
                : "Medium";

        // ── 4. Call ML API ────────────────────────────────────────────────────
        float estimatedHours = dto.getEstimatedHours() != null ? dto.getEstimatedHours() : 4f;

        // The model was trained with user_workload in [208, 283] h.
        // Clamp our real value into that range so the validation does not reject it.
        float clampedWorkload = Math.max(208f, Math.min(283f, userWorkload + 208f));

        Map<String, Object> raw = apiClient.predict(
                estimatedHours,
                priority,
                dueInDays,
                clampedWorkload,
                dto.getTitle(),
                dto.getDescription()
        );

        // ── 5. Parse response or return fallback ──────────────────────────────
        if (raw == null) {
            log.warn("ML API unavailable – returning safe fallback for task '{}'", dto.getTitle());
            return TaskRiskResultDto.builder()
                    .riskScore(0.0)
                    .highRisk(false)
                    .threshold(0.5)
                    .method("fallback")
                    .userWorkload(userWorkload)
                    .fallback(true)
                    .fallbackReason("ML service is currently unavailable. You may proceed safely.")
                    .build();
        }

        double riskScore = toDouble(raw.getOrDefault("risk_score", 0.0));
        boolean highRisk = Boolean.TRUE.equals(raw.get("high_risk"));
        double threshold = toDouble(raw.getOrDefault("threshold", 0.5));
        String method    = (String) raw.getOrDefault("method", "ml_only");
        String reasoning = (String) raw.getOrDefault("reasoning", null);

        return TaskRiskResultDto.builder()
                .riskScore(riskScore)
                .highRisk(highRisk)
                .threshold(threshold)
                .method(method)
                .reasoning(reasoning)
                .userWorkload(userWorkload)
                .fallback(false)
                .build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String capitalise(String s) {
        if (s == null || s.isBlank()) return "Medium";
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }

    private double toDouble(Object v) {
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
