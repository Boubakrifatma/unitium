import { Component, OnInit, ViewChild, AfterViewInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";

import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";

import { TaskService, TaskResponseDto } from "../../../services/TaskService/task.service";

export interface TaskItem {
  taskId: number;
  title: string;
  status: string;
  type: string;
  assignedTo: string;
  assignHours: string;
  loggedHours: string;
  priority: string;
  dueDate: string;
}

@Component({
  selector: "app-all-task",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="container mt-3">

      <h2>📋 Tasks — Milestone #{{ milestoneId }}</h2>

      <mat-form-field appearance="outline" class="w-100 mb-2">
        <mat-label>Rechercher</mat-label>
        <input matInput placeholder="Titre, statut, assigné..." (keyup)="applyFilter($event)">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div *ngIf="dataSource.data.length === 0" class="text-center py-4 text-muted">
        ❌ Aucune tâche trouvée pour ce milestone.
      </div>

      <table mat-table [dataSource]="dataSource" matSort class="w-100 mat-elevation-z2"
             *ngIf="dataSource.data.length > 0">

        <ng-container matColumnDef="taskId">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>#</th>
          <td mat-cell *matCellDef="let task">{{ task.taskId }}</td>
        </ng-container>

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Titre</th>
          <td mat-cell *matCellDef="let task">{{ task.title }}</td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let task">
            <span class="badge-type">{{ task.type }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="assignedTo">
          <th mat-header-cell *matHeaderCellDef>Assigné à</th>
          <td mat-cell *matCellDef="let task">{{ task.assignedTo }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
          <td mat-cell *matCellDef="let task">
            <span [class]="'badge-status ' + task.status">{{ task.status }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Priorité</th>
          <td mat-cell *matCellDef="let task">
            <span [class]="'badge-priority ' + task.priority">{{ task.priority }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="assignHours">
          <th mat-header-cell *matHeaderCellDef>Heures est.</th>
          <td mat-cell *matCellDef="let task">{{ task.assignHours }}h</td>
        </ng-container>

        <ng-container matColumnDef="dueDate">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Échéance</th>
          <td mat-cell *matCellDef="let task">{{ task.dueDate }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

      </table>

      <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons></mat-paginator>

    </div>
  `,
  styles: [`
    .badge-status {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-status.TODO        { background: #e0e0e0; color: #333; }
    .badge-status.IN_PROGRESS { background: #fff3e0; color: #e65100; }
    .badge-status.DONE        { background: #e8f5e9; color: #2e7d32; }

    .badge-priority {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-priority.HIGH   { background: #ffebee; color: #c62828; }
    .badge-priority.MEDIUM { background: #fff8e1; color: #f57f17; }
    .badge-priority.LOW    { background: #e8f5e9; color: #2e7d32; }

    .badge-type {
      padding: 3px 8px;
      border-radius: 8px;
      background: #e3f2fd;
      color: #1565c0;
      font-size: 12px;
    }

    table { width: 100%; }
  `]
})
export class AllTaskComponent implements OnInit, AfterViewInit {

  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'taskId', 'title', 'type', 'assignedTo', 'status', 'priority', 'assignHours', 'dueDate'
  ];

  dataSource = new MatTableDataSource<TaskItem>([]);
  milestoneId!: number;

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

ngOnInit(): void {
  this.route.queryParamMap.subscribe(params => {
    const id = params.get('milestoneId');

    if (!id) {
      console.error("❌ milestoneId manquant");
      return;
    }

    this.milestoneId = Number(id);
    console.log("✅ Milestone ID:", this.milestoneId);

    this.loadTasks();
  });
}

 loadTasks(): void {
  this.taskService.getAllTasks().subscribe({
    next: (tasks) => {

      console.log("🔥 ALL TASKS:", tasks);

      const filtered = tasks.filter(task => {
        console.log("➡️ Task milestone:", task.milestone?.id);
        console.log("➡️ URL milestone:", this.milestoneId);

        return Number(task.milestone?.id) === Number(this.milestoneId);
      });

      console.log("🔥 FILTERED:", filtered);

      this.dataSource.data = filtered.map(task => ({
        taskId: task.id,
        title: task.title,
        status: task.status,
        type: task.taskType,
        assignedTo: task.assignedTo?.fullName || 'Non assigné',
        assignHours: task.estimatedHours?.toString() || '0',
        loggedHours: task.actualHours?.toString() || '0',
        priority: task.priority,
        dueDate: task.dueDate || '-'
      }));

      this.dataSource._updateChangeSubscription();
    },
    error: (err) => {
      console.error("❌ ERREUR:", err);
    }
  });
}

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
