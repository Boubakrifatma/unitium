package com.example.pi_projet.port;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.UUID;

@Component
public class NoOpWorkloadDataPort implements WorkloadDataPort {
    @Override public List<MemberLoadSummary> getLatestWorkloadByWorkspace(UUID workspaceId) { return List.of(); }
}
