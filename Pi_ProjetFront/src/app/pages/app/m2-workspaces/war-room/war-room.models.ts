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

export interface TaskVelocityProjectDTO {
  projectId: string;
  projectName: string;
  completedLast7Days: number;
  completedPrevious7Days: number;
  momentumPct: number;
}

export interface TaskMomentumPointDTO {
  date: string;
  completed: number;
}

export interface TaskPhaseOverdueDTO {
  phase: string;
  overdue: number;
}

export interface TaskMemberLoadDTO {
  memberId: number;
  displayName: string;
  openTasks: number;
  overdueTasks: number;
  criticalTasks: number;
  loadPercentage: number;
}

export interface TaskIntelligenceDTO {
  available: boolean;
  priorityDistribution: Record<string, number>;
  blockerPressure: {
    blocked: number;
    critical: number;
    dependencyBlocked: number;
  };
  overdueByPhase: TaskPhaseOverdueDTO[];
  velocityByProject: TaskVelocityProjectDTO[];
  completionMomentum: TaskMomentumPointDTO[];
  memberTaskLoad: TaskMemberLoadDTO[];
  openTasks: number;
  totalTasks: number;
}

export interface MilestoneTimelineItemDTO {
  id: number;
  projectId: string;
  projectName: string;
  name: string;
  dueDate: string;
  daysFromToday: number;
  isOverdue: boolean;
  isGate: boolean;
  phaseKey?: string | null;
  phaseName?: string | null;
  milestoneIndex?: number | null;
  status?: string | null;
  urgency: string;
}

export interface MilestoneTimelineDTO {
  available: boolean;
  items: MilestoneTimelineItemDTO[];
  summary: {
    upcoming7Days: number;
    overdue: number;
    overdueGates: number;
  };
}

export interface ThreeProjectCityPointDTO {
  projectId: string;
  name: string;
  status: string;
  taskCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  criticalTaskCount: number;
  gateOverdueCount: number;
  healthHint: number;
}

export interface ThreeMilestoneOrbitPointDTO {
  id: number;
  projectId: string;
  projectName: string;
  name: string;
  daysFromToday: number;
  isGate: boolean;
  urgencyScore: number;
}

export interface ThreeSignalsDTO {
  available: boolean;
  projectCity: ThreeProjectCityPointDTO[];
  milestoneOrbit: ThreeMilestoneOrbitPointDTO[];
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

export interface TimelineCheckpoint {
  eventAt: string;  // Instant as ISO string
  at: string;       // End of day as ISO string
  kind: string;     // MEMBER_JOINED, MEMBER_LEFT, PROJECT_CREATED, PROJECT_REMOVED
  label: string;    // Human-readable label
}

export interface WarRoomSnapshot {
  workspaceId?: string;
  workspaceName: string;
  workspaceCreatedAt?: string;
  asOf?: string;
  totalProjects: number;
  openTaskCount?: number;
  memberCount: number;
  onTrackPercentage?: number;
  overloadedMemberCount?: number;
  memberWorkloads: MemberWorkloadDTO[];
  projectThroughputs: ProjectThroughputDTO[];
  collaborationEdges: CollaborationEdgeDTO[];
  healthMatrix: ProjectHealthMatrixDTO;
  taskIntelligence?: TaskIntelligenceDTO;
  milestoneTimeline?: MilestoneTimelineDTO;
  threeSignals?: ThreeSignalsDTO;
  dataWarnings: string[];
  // Time machine fields from SnapshotService
  timelineCheckpoints?: TimelineCheckpoint[];
  suggestedDates?: string[];
  workspaceUnavailable?: boolean;
  projects?: any[];
  members?: any[];
}
