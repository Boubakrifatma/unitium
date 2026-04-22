export interface WorkspaceMember {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    workspaceRole: string;
    orgRole: string;
    joinedAt: string;
    status: string;
}

export interface AvailableOrgMember {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    orgRole: string;
}

export interface WorkspaceMemberCapacity {
    currentMembers: number;
    organizationMembers: number;
    maxMembers: number;
    remainingMembers: number;
    planName: string;
    orgType: string;
}
