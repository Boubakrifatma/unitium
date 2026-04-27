package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.repository.MilestoneRepository;
import com.example.pi_projet.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MilestoneService {

    private final MilestoneRepository repository;
    private final TaskRepository taskRepository;
    private final PulseEventBus pulseEventBus;

    public List<Milestone> getAll() {
        return repository.findAll();
    }

    public List<Milestone> getByProjectId(UUID projectId) {
        return repository.findByProject_Id(projectId);
    }

    public Milestone getById(Long id) {
        return repository.findByIdWithProject(id)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));
    }

    public Milestone create(Milestone milestone) {
        milestone.setIsGate(Boolean.TRUE.equals(milestone.getIsGate()));
        Milestone saved = repository.save(milestone);
        publishMilestoneEvent(saved, "MILESTONE_CREATED", "Milestone \"" + saved.getName() + "\" created");
        return saved;
    }

    public Milestone update(Long id, Milestone m) {
        Milestone existing = getById(id);

        existing.setName(m.getName());
        existing.setDescription(m.getDescription());
        existing.setDueDate(m.getDueDate());
        existing.setStatus(m.getStatus());
        existing.setCompletionPct(m.getCompletionPct());
        existing.setIsGate(Boolean.TRUE.equals(m.getIsGate()));
        existing.setPhaseKey(m.getPhaseKey());
        existing.setPhaseName(m.getPhaseName());
        existing.setMilestoneIndex(m.getMilestoneIndex());
        existing.setSourceMilestoneKey(m.getSourceMilestoneKey());

        Milestone saved = repository.save(existing);
        publishMilestoneEvent(saved, "MILESTONE_UPDATED", "Milestone \"" + saved.getName() + "\" updated");
        return saved;
    }

    public void delete(Long id) {
        Milestone existing = getById(id);
        long taskCount = taskRepository.findByMilestoneId(id).size();
        if (taskCount > 0) {
            throw new IllegalStateException(
                "Cannot delete milestone \"" + existing.getName() + "\" because it contains " + taskCount + " task(s). Please delete or reassign the tasks first."
            );
        }
        repository.deleteById(id);
        publishMilestoneEvent(existing, "MILESTONE_DELETED", "Milestone \"" + existing.getName() + "\" deleted");
    }

    private void publishMilestoneEvent(Milestone milestone, String type, String message) {
        if (milestone == null || milestone.getProject() == null || milestone.getProject().getWorkspace() == null) {
            return;
        }

        try {
            pulseEventBus.publish(
                milestone.getProject().getWorkspace().getId(),
                type,
                message,
                "System"
            );
        } catch (Exception ignored) {
            // SSE publishing must not break milestone lifecycle operations.
        }
    }
}