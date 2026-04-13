export interface MemberWorkloadDTO {
  memberId: number;
  displayName: string;
  loadPercentage: number;
}

export interface ProjectThroughputDTO {
  projectId: string;
  name: string;
  last10DayCompletions: number[];
}

export interface CollaborationEdgeDTO {
  memberAId: number;
  nameA: string;
  memberBId: number;
  nameB: string;
  sharedProjectCount: number;
}

export interface ProjectHealthMatrixDTO {
  projectNames: string[];
  scores: number[][];  // rows=projects, cols=4 dimensions
}

export interface HeatmapDay {
  date: string;  // LocalDate as string from backend
  completions: number;
  overdueCount: number;
}

export interface WarRoomEvent {
  type: string;
  message: string;
  actorDisplayName: string;
  timestamp: string;  // Instant as string
}

export interface WarRoomSnapshot {
  workspaceName: string;
  totalProjects: number;
  openTaskCount: number;
  memberCount: number;
  onTrackPercentage: number;
  overloadedMemberCount: number;
  memberWorkloads: MemberWorkloadDTO[];
  projectThroughputs: ProjectThroughputDTO[];
  collaborationEdges: CollaborationEdgeDTO[];
  healthMatrix: ProjectHealthMatrixDTO;
  dataWarnings: string[];
}
