import { Component, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatCardModule } from "@angular/material/card";
import { trigger, transition, style, animate } from "@angular/animations";

export interface TaskItem {
  taskId: number;
  title: string;
  status: string;
  type: string;
  assignedTo: string;
  assignedToId: number | null;
  assignHours: number;
  loggedHours: number;
  priority: string;
  dueDate: string;
  description: string;
  startDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

@Component({
    selector: "app-view-task-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatCardModule],
    template: `
        <div class="dialog-overlay" [@dialogOverlay]>
            <div class="dialog-container">
                <!-- Header -->
                <div class="dialog-header">
                    <div class="header-icon">
                        <mat-icon>{{ getTypeIcon(data.task.type) }}</mat-icon>
                    </div>
                    <div class="header-content">
                        <h2 class="dialog-title">{{ data.task.title }}</h2>
                        <div class="task-meta">
                            <mat-chip [class]="'status-chip ' + data.task.status.toLowerCase()">
                                {{ data.task.status.replace('_', ' ').toUpperCase() }}
                            </mat-chip>
                            <mat-chip [class]="'priority-chip ' + data.task.priority.toLowerCase()">
                                {{ data.task.priority.toUpperCase() }}
                            </mat-chip>
                        </div>
                    </div>
                    <button mat-icon-button class="close-btn" (click)="onClose()">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>

                <!-- Content -->
                <div class="dialog-content">
                    <!-- Description -->
                    @if (data.task.description) {
                        <div class="content-section">
                            <h3 class="section-title">
                                <mat-icon>description</mat-icon>
                                Description
                            </h3>
                            <p class="description-text">{{ data.task.description }}</p>
                        </div>
                    }

                    <!-- Details Grid -->
                    <div class="details-grid">
                        <div class="detail-item">
                            <mat-icon>category</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Type</span>
                                <span class="detail-value">{{ data.task.type }}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <mat-icon>person</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Assigned To</span>
                                <span class="detail-value">{{ data.task.assignedTo || 'Unassigned' }}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <mat-icon>schedule</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Estimated Hours</span>
                                <span class="detail-value">{{ data.task.assignHours }}h</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <mat-icon>timer</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Logged Hours</span>
                                <span class="detail-value">{{ data.task.loggedHours }}h</span>
                            </div>
                        </div>

                        @if (data.task.startDate) {
                            <div class="detail-item">
                                <mat-icon>play_circle</mat-icon>
                                <div class="detail-content">
                                    <span class="detail-label">Start Date</span>
                                    <span class="detail-value">{{ data.task.startDate | date:'mediumDate' }}</span>
                                </div>
                            </div>
                        }

                        @if (data.task.dueDate) {
                            <div class="detail-item">
                                <mat-icon>event</mat-icon>
                                <div class="detail-content">
                                    <span class="detail-label">Due Date</span>
                                    <span class="detail-value">{{ data.task.dueDate | date:'mediumDate' }}</span>
                                </div>
                            </div>
                        }

                        <div class="detail-item">
                            <mat-icon>person_add</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Created By</span>
                                <span class="detail-value">{{ data.task.createdByName }}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <mat-icon>calendar_today</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Created At</span>
                                <span class="detail-value">{{ data.task.createdAt | date:'medium' }}</span>
                            </div>
                        </div>

                        <div class="detail-item">
                            <mat-icon>update</mat-icon>
                            <div class="detail-content">
                                <span class="detail-label">Updated At</span>
                                <span class="detail-value">{{ data.task.updatedAt | date:'medium' }}</span>
                            </div>
                        </div>

                        @if (data.task.completedAt) {
                            <div class="detail-item">
                                <mat-icon>check_circle</mat-icon>
                                <div class="detail-content">
                                    <span class="detail-label">Completed At</span>
                                    <span class="detail-value">{{ data.task.completedAt | date:'medium' }}</span>
                                </div>
                            </div>
                        }
                    </div>
                </div>

                <!-- Actions -->
                <div class="dialog-actions">
                    <button mat-button class="close-btn" (click)="onClose()">
                        <mat-icon>close</mat-icon>
                        Close
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --border-color: #e5e7eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #3b82f6;
        }

        @media (prefers-color-scheme: dark) {
            :host {
                --text-primary: #f3f4f6;
                --text-secondary: #d1d5db;
                --bg-primary: #1f2937;
                --bg-secondary: #111827;
                --border-color: #374151;
            }
        }

        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 1000;
        }

        .dialog-container {
            background: var(--bg-primary);
            border-radius: 16px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dialog-header {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 32px 32px 24px;
            border-bottom: 1px solid var(--border-color);
            position: relative;
        }

        .header-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .header-icon mat-icon {
            font-size: 30px;
            width: 30px;
            height: 30px;
            color: white;
        }

        .header-content {
            flex: 1;
            min-width: 0;
        }

        .dialog-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 12px 0;
            word-break: break-word;
        }

        .task-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .status-chip {
            background: var(--info-color);
            color: white;
            font-weight: 600;
            font-size: 0.75rem;
        }

        .status-chip.todo {
            background: var(--warning-color);
        }

        .status-chip.in_progress {
            background: var(--info-color);
        }

        .status-chip.review {
            background: #8b5cf6;
        }

        .status-chip.done {
            background: var(--success-color);
        }

        .status-chip.blocked {
            background: var(--danger-color);
        }

        .priority-chip {
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-weight: 600;
            font-size: 0.75rem;
        }

        .priority-chip.high {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }

        .priority-chip.medium {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }

        .priority-chip.low {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }

        .priority-chip.critical {
            background: rgba(239, 68, 68, 0.2);
            color: var(--danger-color);
            font-weight: 700;
        }

        .close-btn {
            color: var(--text-secondary);
            position: absolute;
            top: 16px;
            right: 16px;
        }

        .dialog-content {
            padding: 24px 32px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .content-section {
            margin-bottom: 32px;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 16px 0;
        }

        .section-title mat-icon {
            color: var(--info-color);
        }

        .description-text {
            color: var(--text-secondary);
            line-height: 1.6;
            margin: 0;
            white-space: pre-wrap;
        }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .detail-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }

        .detail-item mat-icon {
            color: var(--info-color);
            flex-shrink: 0;
        }

        .detail-content {
            min-width: 0;
            flex: 1;
        }

        .detail-label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .detail-value {
            display: block;
            font-size: 0.875rem;
            color: var(--text-primary);
            font-weight: 500;
        }

        .dialog-actions {
            padding: 24px 32px 32px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
        }

        .close-btn {
            color: var(--text-secondary);
            font-weight: 600;
            padding: 8px 24px;
        }

        .close-btn:hover {
            background: var(--bg-secondary);
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(40px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @media (max-width: 768px) {
            .dialog-container {
                margin: 10px;
                max-height: calc(100vh - 20px);
            }

            .dialog-header {
                padding: 24px 20px 20px;
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }

            .header-icon {
                width: 50px;
                height: 50px;
            }

            .header-icon mat-icon {
                font-size: 24px;
                width: 24px;
                height: 24px;
            }

            .dialog-title {
                font-size: 1.5rem;
            }

            .dialog-content {
                padding: 20px;
            }

            .details-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .dialog-actions {
                padding: 20px;
                flex-direction: column;
            }

            .close-btn {
                width: 100%;
            }
        }
    `],
    animations: [
        trigger('dialogOverlay', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ViewTaskDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ViewTaskDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { task: TaskItem }
    ) {}

    getTypeIcon(type: string): string {
        const icons: { [key: string]: string } = {
            "bug": "bug_report",
            "epic": "flag",
            "story": "description",
            "subtask": "subdirectory_arrow_right",
            "task": "task_alt",
        };
        return icons[type] || "task_alt";
    }

    onClose(): void {
        this.dialogRef.close();
    }
}