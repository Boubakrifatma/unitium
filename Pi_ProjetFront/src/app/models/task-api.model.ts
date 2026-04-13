// models/task-api.model.ts

export interface TaskApiResponse {
    id: number;
    title: string;
    description: string;
    status: string;         // "new", "in_progress", "ready_to_test", "completed"
    taskType: string;       // "Development", "Design", "Backend", "Bug"
    priority: string;       // "high", "medium", "low"
    estimatedHours: number;
    actualHours: number;
    project: { id: string; projectName: string; };
    assignedTo: { id: string; fullName: string; avatarUrl?: string; };
  }
