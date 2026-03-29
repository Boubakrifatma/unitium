import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { M2Workspace, M2WorkspaceMember, M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { M2ProjectService } from "./m2-project.service";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

interface WorkspaceSelectorData {
    workspace: M2Workspace;
    projectCount: number;
    memberCount: number;
    isSelected: boolean;
}

@Component({
    selector: "app-workspace-selector-dialog",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
    ],
    styles: [`
        :host {
            display: block;
        }
        .dialog-header {
            padding: 24px;
            border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .dialog-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #1a202c;
        }
        .dialog-content {
            padding: 24px;
            max-height: 600px;
            overflow-y: auto;
        }
        .search-field {
            margin-bottom: 24px;
        }
        .workspace-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .workspace-card {
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            background: white;
        }
        .workspace-card:hover {
            border-color: #94a3b8;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transform: translateY(-2px);
        }
        .workspace-card.selected {
            border-color: #6366f1;
            background: linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.02) 100%);
            box-shadow: 0 8px 24px rgba(99,102,241,0.12);
        }
        .workspace-card.selected::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
        }
        .workspace-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        .workspace-avatar {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 16px;
        }
        .workspace-title {
            flex: 1;
        }
        .workspace-name {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #1a202c;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .workspace-type {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .workspace-check {
            font-size: 20px;
            color: #6366f1;
        }
        .workspace-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(0,0,0,0.06);
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            display: block;
            font-size: 20px;
            font-weight: 700;
            color: #6366f1;
            margin-bottom: 2px;
        }
        .stat-label {
            display: block;
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .no-results {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
        }
        .no-results mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            opacity: 0.5;
            margin-bottom: 12px;
        }
        .empty-state {
            padding: 40px 20px;
            text-align: center;
        }
        .empty-state mat-icon {
            font-size: 64px;
            width: 64px;
            height: 64px;
            color: #cbd5e1;
            margin-bottom: 16px;
        }
        .dialog-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(0,0,0,0.08);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            background: #f8fafc;
        }
        .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }
    `],
    template: `
        <div class="dialog-header">
            <h2>Switch Workspace</h2>
        </div>
        
        <div class="dialog-content">
            @if (isLoading()) {
                <div class="loading-container">
                    <mat-spinner diameter="40"></mat-spinner>
                </div>
            } @else {
                <div class="search-field">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Search workspaces</mat-label>
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput placeholder="Workspace name..." [(ngModel)]="searchQuery" />
                    </mat-form-field>
                </div>

                @if (filteredWorkspaces().length === 0) {
                    <div class="no-results">
                        <mat-icon>work_outline</mat-icon>
                        <p class="mb-0">No workspaces found</p>
                    </div>
                } @else {
                    <div class="workspace-grid">
                        @for (wsData of filteredWorkspaces(); track wsData.workspace.id) {
                            <div class="workspace-card" 
                                [class.selected]="wsData.isSelected"
                                (click)="selectWorkspace(wsData.workspace)">
                                
                                <div class="workspace-header">
                                    <div class="workspace-avatar">
                                        {{ wsData.workspace.name.charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="workspace-title">
                                        <p class="workspace-name">
                                            {{ wsData.workspace.name }}
                                            @if (wsData.isSelected) {
                                                <mat-icon class="workspace-check">check_circle</mat-icon>
                                            }
                                        </p>
                                        <p class="workspace-type">
                                            {{ wsData.workspace.orgType || 'ENTERPRISE' }}
                                        </p>
                                    </div>
                                </div>

                                <div class="workspace-stats">
                                    <div class="stat-item">
                                        <span class="stat-value">{{ wsData.projectCount }}</span>
                                        <span class="stat-label">Projects</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">{{ wsData.memberCount }}</span>
                                        <span class="stat-label">Members</span>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                }
            }
        </div>

        <div class="dialog-footer">
            <button mat-button (click)="onCancel()">Close</button>
        </div>
    `
})
export class WorkspaceSelectorDialogComponent implements OnInit {
    private dialogRef = inject(MatDialogRef<WorkspaceSelectorDialogComponent>);
    private workspaceService = inject(M2WorkspaceService);
    private projectService = inject(M2ProjectService);

    isLoading = signal(true);
    searchQuery = signal("");
    workspacesData = signal<WorkspaceSelectorData[]>([]);
    currentWorkspaceId = signal<string | null>(null);

    filteredWorkspaces = computed(() => {
        const query = this.searchQuery().toLowerCase();
        return this.workspacesData().filter(ws =>
            ws.workspace.name.toLowerCase().includes(query) ||
            ws.workspace.slug.toLowerCase().includes(query)
        );
    });

    ngOnInit(): void {
        this.loadWorkspaces();
    }

    private loadWorkspaces(): void {
        this.isLoading.set(true);
        this.workspaceService.getWorkspaces().subscribe({
            next: (workspaces) => {
                const workspaceRequests = workspaces.map(ws =>
                    forkJoin({
                        projectCount: this.projectService.getProjects(ws.id, 0, 1).pipe(
                            map(page => page.totalElements || 0),
                            catchError(() => of(0))
                        ),
                        memberCount: this.workspaceService.getWorkspaceMembers(ws.id).pipe(
                            map((members: M2WorkspaceMember[]) => members.length),
                            catchError(() => of(0))
                        )
                    }).pipe(
                        map(result => ({
                            workspace: ws,
                            projectCount: result.projectCount,
                            memberCount: result.memberCount,
                            isSelected: false
                        }))
                    )
                );

                if (workspaceRequests.length === 0) {
                    this.isLoading.set(false);
                    return;
                }

                forkJoin(workspaceRequests).subscribe({
                    next: (data) => {
                        this.workspacesData.set(data);
                        this.isLoading.set(false);
                    },
                    error: () => {
                        this.isLoading.set(false);
                    }
                });
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    selectWorkspace(workspace: M2Workspace): void {
        this.dialogRef.close(workspace);
    }

    onCancel(): void {
        this.dialogRef.close(null);
    }
}
