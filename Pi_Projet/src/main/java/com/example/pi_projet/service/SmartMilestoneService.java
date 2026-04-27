package com.example.pi_projet.service;

import com.example.pi_projet.dto.MilestoneRiskDto;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone.MilestoneStatus;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task;
import com.example.pi_projet.entity.TimeLineAndDeadLine.Task.TaskStatus;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Smart Milestone Service — the intelligence engine.
 *
 * Algorithms:
 * ──────────────────────────────────────────────────────────────
 * 1. Velocity-based date prediction
 *    velocity = doneTasks / elapsedDays (tasks per day)
 *    remainingDays = remainingTasks / velocity
 *    predictedDate = today + remainingDays
 *
 * 2. Risk score (0-100)
 *    score = overdueFactor(40) + velocityFactor(30) + blockingFactor(30)
 *    overdueFactor  = (overdueTasks / totalTasks) * 40
 *    velocityFactor = if actual_velocity < expected_velocity → 30, else 0
 *    blockingFactor = (blockedTasks / totalTasks) * 30
 *
 * 3. Status auto-update
 *    completed   → all tasks done
 *    missed      → dueDate < today AND not completed
 *    at_risk     → riskScore >= 70
 *    in_progress → any task in_progress
 *    pending     → otherwise
 * ──────────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartMilestoneService {

    private final MilestoneRepository milestoneRepo;
    private final TaskRepository      taskRepo;
    private final PulseEventBus       pulseEventBus;

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Analyse one milestone and returns its risk DTO without persisting.
     */
    public MilestoneRiskDto analyse(Long milestoneId) {
        Milestone m = milestoneRepo.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found: " + milestoneId));
        List<Task> tasks = taskRepo.findByMilestoneId(milestoneId);
        return buildRiskDto(m, tasks);
    }

    /**
     * Recalculate smart fields for ALL milestones of a project,
     * persist changes, publish alerts for high-risk ones.
     */
    @Transactional
    public List<MilestoneRiskDto> recalculateForProject(UUID projectId) {
        List<Milestone> milestones = milestoneRepo.findByProject_Id(projectId);
        List<MilestoneRiskDto> results = new ArrayList<>();

        for (Milestone m : milestones) {
            List<Task> tasks = taskRepo.findByMilestoneId(m.getId());
            MilestoneRiskDto dto = buildRiskDto(m, tasks);
            applySmartFields(m, dto);
            milestoneRepo.save(m);
            results.add(dto);

            // Publish alert for high-risk milestones
            if (dto.getRiskScore() >= 70) {
                publishRiskAlert(m, dto);
            }
        }

        return results;
    }

    /**
     * Recalculate smart fields for a single milestone after a task update.
     * Called by TaskService whenever a task is created/updated.
     */
    @Transactional
    public void recalculateOnTaskChange(Long milestoneId) {
        if (milestoneId == null) return;
        Milestone m = milestoneRepo.findByIdWithProject(milestoneId).orElse(null);
        if (m == null) return;

        List<Task> tasks = taskRepo.findByMilestoneId(milestoneId);
        MilestoneRiskDto dto = buildRiskDto(m, tasks);
        applySmartFields(m, dto);
        milestoneRepo.save(m);

        if (dto.getRiskScore() >= 70) {
            publishRiskAlert(m, dto);
        }
    }

    // ── Core algorithm ────────────────────────────────────────────────────

    private MilestoneRiskDto buildRiskDto(Milestone m, List<Task> tasks) {
        LocalDate today = LocalDate.now();
        List<String> alerts = new ArrayList<>();

        int total    = tasks.size();
        int done     = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.done).count();
        int blocked  = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.blocked).count();
        int overdue  = (int) tasks.stream()
                .filter(t -> t.getDueDate() != null
                        && t.getDueDate().isBefore(today)
                        && t.getStatus() != TaskStatus.done)
                .count();

        float completionPct = total == 0 ? 100f : (done * 100f) / total;
        float velocity      = computeVelocity(m, done, today);
        LocalDate predicted = predictDueDate(m, tasks, done, total, velocity, today);
        int delayDays       = computeDelayDays(m.getDueDate(), predicted, today);
        float riskScore     = computeRiskScore(total, done, blocked, overdue, velocity,
                m, today, predicted);
        String riskLevel    = riskLevel(riskScore);

        // ── Generate alerts ───────────────────────────────────────────────
        if (riskScore >= 70) {
            alerts.add(String.format(
                    "🔴 Ce milestone a %.0f%% de risque d'être en retard.", riskScore));
        } else if (riskScore >= 40) {
            alerts.add(String.format(
                    "🟡 Risque modéré (%.0f%%) — surveillez la progression.", riskScore));
        }
        if (delayDays > 0) {
            alerts.add(String.format(
                    "⏰ Retard estimé : %d jour(s). Livraison prévue le %s.", delayDays, predicted));
        }
        if (blocked > 0) {
            alerts.add(String.format(
                    "🚫 %d tâche(s) bloquée(s) — action requise.", blocked));
        }
        if (overdue > 0) {
            alerts.add(String.format(
                    "📅 %d tâche(s) en retard par rapport à leur échéance.", overdue));
        }
        if (velocity > 0 && velocity < expectedVelocity(m, total, today)) {
            alerts.add("📉 Vélocité inférieure au plan — risque de dépassement.");
        }
        if (total > 0 && done == total) {
            alerts.clear();
            alerts.add("✅ Toutes les tâches sont terminées !");
        }

        return MilestoneRiskDto.builder()
                .milestoneId(m.getId())
                .milestoneName(m.getName())
                .plannedDueDate(m.getDueDate())
                .predictedDueDate(predicted)
                .delayDays(delayDays)
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .totalTasks(total)
                .doneTasks(done)
                .blockedTasks(blocked)
                .overdueTasks(overdue)
                .completionPct(completionPct)
                .velocity(velocity)
                .alerts(alerts)
                .build();
    }

    // ── Velocity ──────────────────────────────────────────────────────────

    /**
     * velocity = doneTasks / elapsedDays since milestone creation (or first task start).
     */
    private float computeVelocity(Milestone m, int done, LocalDate today) {
        if (done == 0) return 0f;
        LocalDate start = m.getCreatedAt() != null
                ? m.getCreatedAt().toLocalDate()
                : today.minusDays(1);
        long elapsed = ChronoUnit.DAYS.between(start, today);
        if (elapsed <= 0) return done;
        return (float) done / elapsed;
    }

    private float expectedVelocity(Milestone m, int total, LocalDate today) {
        if (total == 0 || m.getDueDate() == null) return 0f;
        LocalDate start = m.getCreatedAt() != null
                ? m.getCreatedAt().toLocalDate()
                : today;
        long totalDays = ChronoUnit.DAYS.between(start, m.getDueDate());
        if (totalDays <= 0) return total;
        return (float) total / totalDays;
    }

    // ── Date prediction ───────────────────────────────────────────────────

    private LocalDate predictDueDate(Milestone m, List<Task> tasks,
                                     int done, int total,
                                     float velocity, LocalDate today) {
        if (done == total && total > 0) return today; // already done
        if (velocity <= 0) {
            // No velocity data — use due date or add 30% buffer
            if (m.getDueDate() != null) {
                return m.getDueDate().plusDays(Math.max(1, (long)(ChronoUnit.DAYS.between(today, m.getDueDate()) * 0.3)));
            }
            return today.plusDays(30);
        }
        int remaining = total - done;
        long daysNeeded = (long) Math.ceil(remaining / velocity);
        return today.plusDays(daysNeeded);
    }

    // ── Risk score ────────────────────────────────────────────────────────

    private float computeRiskScore(int total, int done, int blocked, int overdue,
                                   float velocity, Milestone m,
                                   LocalDate today, LocalDate predicted) {
        if (total == 0) return 0f;

        // Factor 1 — overdue tasks (weight 40)
        float overdueFactor = Math.min(40f, (overdue * 40f) / total);

        // Factor 2 — velocity below plan (weight 30)
        float velocityFactor = 0f;
        float expected = expectedVelocity(m, total, today);
        if (expected > 0 && velocity < expected) {
            velocityFactor = Math.min(30f, ((expected - velocity) / expected) * 30f);
        }

        // Factor 3 — blocked tasks (weight 20)
        float blockFactor = Math.min(20f, (blocked * 20f) / total);

        // Factor 4 — predicted delay (weight 10)
        float delayFactor = 0f;
        if (m.getDueDate() != null && predicted != null && predicted.isAfter(m.getDueDate())) {
            long delayDays = ChronoUnit.DAYS.between(m.getDueDate(), predicted);
            delayFactor = Math.min(10f, delayDays * 1f);
        }

        // Milestone already past due date → guaranteed at least 60
        float base = overdueFactor + velocityFactor + blockFactor + delayFactor;
        if (m.getDueDate() != null && m.getDueDate().isBefore(today)
                && done < total) {
            base = Math.max(base, 60f);
        }

        return Math.min(100f, base);
    }

    private int computeDelayDays(LocalDate planned, LocalDate predicted, LocalDate today) {
        if (planned == null || predicted == null) return 0;
        return (int) ChronoUnit.DAYS.between(planned, predicted);
    }

    private String riskLevel(float score) {
        if (score >= 70) return "high";
        if (score >= 40) return "medium";
        return "low";
    }

    // ── Persist ───────────────────────────────────────────────────────────

    private void applySmartFields(Milestone m, MilestoneRiskDto dto) {
        m.setRiskScore(dto.getRiskScore());
        m.setPredictedDueDate(dto.getPredictedDueDate());
        m.setDelayDays(dto.getDelayDays());
        m.setLastComputedAt(LocalDateTime.now());
        m.setCompletionPct(dto.getCompletionPct());

        // Auto-update status
        if (dto.getDoneTasks() == dto.getTotalTasks() && dto.getTotalTasks() > 0) {
            m.setStatus(MilestoneStatus.completed);
        } else if (m.getDueDate() != null && m.getDueDate().isBefore(LocalDate.now())
                && m.getStatus() != MilestoneStatus.completed) {
            m.setStatus(MilestoneStatus.missed);
        } else if (dto.getRiskScore() >= 70) {
            m.setStatus(MilestoneStatus.at_risk);
        } else if (dto.getDoneTasks() > 0) {
            m.setStatus(MilestoneStatus.in_progress);
        }
    }

    // ── Events ────────────────────────────────────────────────────────────

    private void publishRiskAlert(Milestone m, MilestoneRiskDto dto) {
        try {
            if (m.getProject() == null || m.getProject().getWorkspace() == null) return;
            String msg = String.format(
                    "⚠️ Milestone \"%s\" — risque %s (%.0f%%). %s",
                    m.getName(),
                    dto.getRiskLevel().toUpperCase(),
                    dto.getRiskScore(),
                    dto.getDelayDays() > 0
                            ? "Retard estimé : " + dto.getDelayDays() + "j."
                            : "");
            pulseEventBus.publish(
                    m.getProject().getWorkspace().getId(),
                    "MILESTONE_RISK_ALERT",
                    msg,
                    "SmartEngine");
        } catch (Exception ignored) {}
    }
}
