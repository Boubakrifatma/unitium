package com.example.pi_projet.port;

import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
public class NoOpAuditDataPort implements AuditDataPort {
    @Override public List<AuditEventSummary> getEventsByWorkspace(UUID workspaceId, LocalDate from, LocalDate to) { return List.of(); }
}
