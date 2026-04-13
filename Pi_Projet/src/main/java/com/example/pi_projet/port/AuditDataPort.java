package com.example.pi_projet.port;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AuditDataPort {
    List<AuditEventSummary> getEventsByWorkspace(UUID workspaceId, LocalDate from, LocalDate to);
    record AuditEventSummary(String action, String actorName, Instant occurredAt, String description) {}
}
