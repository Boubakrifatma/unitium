import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService, Project } from "../../../services/project-service";
import { MatDialog } from "@angular/material/dialog";
import { CreateEditMilestoneComponent } from "./create-edit-milestone.component";
import { Router } from "@angular/router";

@Component({
    selector: "app-all-milestone",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">All Milestones</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            All Milestones
                        </p>
                    </div>
                    <div class="col-auto order-2 mb-3 mb-xl-0">
                        <button matButton="filled" class="ms-1" (click)="createMilestone()"><mat-icon class="material-icons-outlined">add</mat-icon> Milestone</button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <div class="row gx-3">
                        <div class="col mb-3">
                            <h3 class="mb-1">Milestones</h3>
                            <p class="text-secondary small">Manage project milestones</p>
                        </div>
                        <div class="col-12 col-lg-5 col-xl-4 mb-3">
                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                <input matInput (keyup)="applyFilter($event)" placeholder="Search milestones..." #input />
                                <mat-icon matSuffix>search</mat-icon>
                            </mat-form-field>
                        </div>
                    </div>

                    <table mat-table [dataSource]="dataSource" matSort class="bg-none responsive-table">
                        <ng-container matColumnDef="id">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p class="fw-bold text-theme">{{ milestone.id }}</p>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="name">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p>{{ milestone.name }}</p>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="description">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Description</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p class="text-truncated" style="max-width:200px">{{ milestone.description }}</p>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="dueDate">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Due Date</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p>{{ milestone.dueDate }}</p>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="status">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                            <td mat-cell *matCellDef="let milestone">
                                <span
                                    class="badge"
                                    [ngClass]="{
                                        'theme-orange': milestone.status === 'pending',
                                        'theme-cyan': milestone.status === 'in_progress',
                                        'theme-green': milestone.status === 'completed'
                                    }">
                                    {{ milestone.status | titlecase }}
                                </span>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="completionPct">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Completion %</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p>{{ milestone.completionPct }}%</p>
                            </td>
                        </ng-container>

                        <ng-container matColumnDef="projectName">
                            <th mat-header-cell *matHeaderCellDef mat-sort-header>Project</th>
                            <td mat-cell *matCellDef="let milestone">
                                <p>{{ getProjectName(milestone.projectId) }}</p>
                            </td>
                        </ng-container>

                        <!-- Actions Column -->
                        <ng-container matColumnDef="actions">
                            <th mat-header-cell *matHeaderCellDef>Actions</th>
                            <td mat-cell *matCellDef="let milestone">
                                <button matIconButton (click)="viewTasks(milestone)" title="View Tasks">
                                    <mat-icon class="material-icons-outlined">list</mat-icon>
                                </button>
                                <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions">
                                    <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                </button>
                                <mat-menu #actionsMenu="matMenu">
                                    <button mat-menu-item (click)="editMilestone(milestone)">
                                        <mat-icon class="material-icons-outlined">edit</mat-icon>
                                        <span>Edit</span>
                                    </button>
                                    <button mat-menu-item (click)="deleteMilestone(milestone)">
                                        <mat-icon class="material-icons-outlined">delete</mat-icon>
                                        <span>Delete</span>
                                    </button>
                                </mat-menu>
                            </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                    </table>
                    <mat-paginator [pageSizeOptions]="[5, 10, 25]" aria-label="Select page of milestones" class="bg-none"></mat-paginator>
                </mat-card-content>
            </mat-card>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AllMilestoneComponent implements OnInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    milestones: Milestone[] = [];
    projects: Project[] = [];
    dataSource = new MatTableDataSource<Milestone>(this.milestones);
    displayedColumns: string[] = ["id", "name", "description", "dueDate", "status", "completionPct", "projectName", "actions"];

    constructor(
        private milestoneService: MilestoneService,
        private projectService: ProjectService,
        private dialog: MatDialog,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadMilestones();
        this.loadProjects();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadMilestones() {
        this.milestoneService.getAll().subscribe({
            next: (milestones: Milestone[]) => {
                this.milestones = milestones;
                this.dataSource.data = this.milestones;
            },
            error: (err: any) => {
                console.error('Error loading milestones', err);
            }
        });
    }

    loadProjects() {
        this.projectService.getAll().subscribe({
            next: (projects: Project[]) => {
                this.projects = projects;
            },
            error: (err: any) => {
                console.error('Error loading projects', err);
            }
        });
    }

    getProjectName(projectId: string): string {
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.name : 'Unknown';
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

 viewTasks(milestone: Milestone) {
    this.router.navigate(['/app/all-tasks'], {
        queryParams: { milestoneId: milestone.id }
    });

}

    createMilestone() {
        const dialogRef = this.dialog.open(CreateEditMilestoneComponent, {
            width: '700px',
            maxWidth: '700px',
            panelClass: 'custom-dialog-container',
            autoFocus: false,
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadMilestones();
            }
        });
    }

    editMilestone(milestone: Milestone) {
        const dialogRef = this.dialog.open(CreateEditMilestoneComponent, {
            width: '700px',
            maxWidth: '700px',
            panelClass: 'custom-dialog-container',
            autoFocus: false,
            data: { milestone }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadMilestones();
            }
        });
    }

    deleteMilestone(milestone: Milestone) {
        if (milestone.id && confirm('Are you sure you want to delete this milestone?')) {
            this.milestoneService.delete(milestone.id).subscribe({
                next: () => {
                    this.loadMilestones();
                },
                error: (err: any) => {
                    console.error('Error deleting milestone', err);
                }
            });
        }
    }
}
