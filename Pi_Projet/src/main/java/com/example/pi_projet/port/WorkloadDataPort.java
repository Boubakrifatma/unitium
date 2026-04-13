package com.example.pi_projet.port;

import java.util.List;
import java.util.UUID;

public interface WorkloadDataPort {
    List<MemberLoadSummary> getLatestWorkloadByWorkspace(UUID workspaceId);
    record MemberLoadSummary(UUID memberId, int loadPercentage) {}
}
