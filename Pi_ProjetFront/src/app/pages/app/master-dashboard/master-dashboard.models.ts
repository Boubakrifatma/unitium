export interface DashboardPortfolioResponse {
    generatedAt: string;
    metrics: DashboardMetrics;
    globalHealth: DashboardGlobalHealth;
    workspaces: DashboardWorkspaceCard[];
    projects: DashboardProjectCard[];
    milestonesCountdown: DashboardMilestoneCountdown[];
    activity: DashboardActivityItem[];
    templatesTrending: DashboardTemplateCard[];
    warnings: string[];
}

export interface DashboardMetrics {
    workspaces: number;
    projects: number;
    tasks: number;
    members: number;
}

export interface DashboardGlobalHealth {
    score: number;
    state: "HEALTHY" | "WATCH" | "AT_RISK" | string;
    urgentProjects: number;
    label: string;
}

export interface DashboardWorkspaceCard {
    id: string;
    name: string;
    slug?: string;
    orgType?: string;
    projectCount: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    memberCount: number;
    healthScore: number;
    healthState: string;
    urgentProjects: number;
}

export interface DashboardMemberPreview {
    userId: number;
    fullName?: string;
    avatarUrl?: string;
}

export interface DashboardTaskSummary {
    total: number;
    done: number;
    progressPct: number;
    overdue: number;
    status: Record<string, number>;
    priority: Record<string, number>;
}

export interface DashboardTimeline {
    known: boolean;
    startDate?: string | null;
    endDate?: string | null;
    totalDays?: number | null;
    elapsedDays?: number | null;
    daysRemaining?: number | null;
    progressPct: number;
    state: "UNKNOWN" | "UPCOMING" | "ACTIVE" | "PAST_DUE" | string;
}

export interface DashboardPhaseSegment {
    name: string;
    startPct: number;
    endPct: number;
    weightPct: number;
    progressPct: number;
    color: string;
}

export interface DashboardProjectUrgency {
    isUrgent: boolean;
    overdueTasks: number;
    criticalOrBlockedTasks: number;
    overdueMilestones: number;
}

export interface DashboardProjectCard {
    id: string;
    workspaceId: string;
    workspaceName: string;
    name: string;
    status: string;
    visibility: string;
    startDate?: string | null;
    endDate?: string | null;
    healthScore: number;
    riskLevel: string;
    healthSignals: Record<string, unknown>;
    taskSummary: DashboardTaskSummary;
    timeline: DashboardTimeline;
    phaseSegments: DashboardPhaseSegment[];
    members: {
        count: number;
        preview: DashboardMemberPreview[];
    };
    milestoneCount: number;
    urgent: DashboardProjectUrgency;
    activitySparkline: number[];
}

export interface DashboardMilestoneCountdown {
    id: number;
    projectId: string;
    projectName: string;
    name: string;
    dueDate: string;
    daysRemaining: number;
    status: string;
}

export interface DashboardActivityItem {
    workspaceId: string;
    workspaceName: string;
    actor: string;
    type: string;
    entityType?: string;
    entityId?: string;
    message: string;
    createdAt?: string | null;
}

export interface DashboardTemplateCard {
    id: string;
    name: string;
    templateType?: string;
    previewImageUrl?: string;
    rating: number;
    ratingCount: number;
    usageCount: number;
    isTrending: boolean;
    isFeatured: boolean;
}

export interface DashboardFocusProject {
    id: string;
    workspaceId: string;
    workspaceName: string;
    name: string;
    description?: string;
    status: string;
    visibility: string;
    startDate?: string | null;
    endDate?: string | null;
}

export interface DashboardFocusMilestone {
    id: number;
    name: string;
    status: string;
    dueDate?: string | null;
    daysRemaining?: number | null;
    positionPct: number;
    taskCount: number;
}

export interface DashboardFocusTaskSummary {
    total: number;
    completed: number;
    overdue: number;
    status: Record<string, number>;
    priority: Record<string, number>;
}

export interface DashboardFocusResponse {
    generatedAt: string;
    project: DashboardFocusProject;
    health: Record<string, unknown>;
    timeline: DashboardTimeline;
    phases: DashboardPhaseSegment[];
    milestones: DashboardFocusMilestone[];
    upcomingMilestones: DashboardFocusMilestone[];
    tasks: DashboardFocusTaskSummary;
    members: {
        count: number;
        items: DashboardMemberPreview[];
    };
    urgent: {
        overdueTasks: number;
        blockedTasks: number;
        criticalTasks: number;
        overdueMilestones: number;
        isUrgent: boolean;
    };
}

export interface DashboardActivityResponse {
    generatedAt: string;
    items: DashboardActivityItem[];
}

export interface DashboardTemplateResponse {
    generatedAt: string;
    items: DashboardTemplateCard[];
}
