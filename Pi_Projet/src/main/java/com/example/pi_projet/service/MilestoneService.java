package com.example.pi_projet.service;

import com.example.pi_projet.entity.TimeLineAndDeadLine.Milestone;
import com.example.pi_projet.repository.MilestoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MilestoneService {

    private final MilestoneRepository repository;

    public List<Milestone> getAll() {
        return repository.findAll();
    }

    public Milestone getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));
    }

    public Milestone create(Milestone milestone) {
        return repository.save(milestone);
    }

    public Milestone update(Long id, Milestone m) {
        Milestone existing = getById(id);

        existing.setName(m.getName());
        existing.setDescription(m.getDescription());
        existing.setDueDate(m.getDueDate());
        existing.setStatus(m.getStatus());
        existing.setCompletionPct(m.getCompletionPct());

        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}