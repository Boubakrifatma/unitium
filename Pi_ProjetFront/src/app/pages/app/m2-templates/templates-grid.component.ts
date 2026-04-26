import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { M2TemplateService } from "./m2-template.service";
import { TemplateCardItem } from "./templates-cards.component";
import { TemplateDeleteConfirmDialogComponent } from "./template-delete-confirm-dialog.component";

@Component({
    selector: "app-templates-grid",
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule, MatMenuModule,
        MatTableModule, MatPaginatorModule, MatSortModule,
        MatFormFieldModule, MatInputModule, MatSnackBarModule,
    ],
    template: `
        <mat-card>
            <mat-card-header>
                <div class="w-100">
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto mb-3">
                            <div class="avatar avatar-40 text-theme rounded">
                                <mat-icon class="material-icons-outlined">layers</mat-icon>
                            </div>
                        </div>
                        <div class="col mb-3">
                            <h3 class="mb-1">{{ title }}</h3>
                        </div>
                        <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                <mat-label>Search</mat-label>
                                <mat-icon matPrefix>search</mat-icon>
                                <input matInput placeholder="Search" (keyup)="applyFilter($event)" />
                            </mat-form-field>
                        </div>
                    </div>
                </div>
            </mat-card-header>

            <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">
                <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Template</th>
                    <td mat-cell *matCellDef="let item" class="py-2" (click)="openTemplate(item)" style="cursor:pointer;">
                        <p class="mat-mobile-label">Template</p>
                        <div class="row gx-3">
                            <div class="col-auto">
                                <div class="avatar avatar-40 rounded coverimg">
                                    <img [src]="item.image" [alt]="item.name" />
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-0">{{ item.name }}</h4>
                                <p class="text-secondary small mb-0">{{ item.type }}</p>
                            </div>
                        </div>
                    </td>
                </ng-container>

                <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Status</p>
                        <span class="badge"
                            [ngClass]="{
                                'theme-green': item.status === 'APPROVED',
                                'theme-orange': item.status === 'PENDING_APPROVAL',
                                'theme-red': item.status === 'REJECTED'
                            }">
                            {{ statusLabel(item.status) }}
                        </span>
                    </td>
                </ng-container>

                <ng-container matColumnDef="difficulty">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Difficulty</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Difficulty</p>
                        @if (item.difficulty) {
                            <span class="badge"
                                [ngClass]="{
                                    'theme-green': item.difficulty === 'BEGINNER',
                                    'theme-orange': item.difficulty === 'INTERMEDIATE',
                                    'theme-red': item.difficulty === 'ADVANCED'
                                }">
                                {{ item.difficulty | titlecase }}
                            </span>
                        } @else { <span class="text-secondary small">—</span> }
                    </td>
                </ng-container>

                <ng-container matColumnDef="effort">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Effort</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Effort</p>
                        @if (item.effort) {
                            <span class="badge badge-light">{{ item.effort | titlecase }}</span>
                        } @else { <span class="text-secondary small">—</span> }
                    </td>
                </ng-container>

                <ng-container matColumnDef="rating">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Rating</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Rating</p>
                        <span>{{ item.rating | number:'1.1-1' }} ★ ({{ item.ratingCount }})</span>
                    </td>
                </ng-container>

                <ng-container matColumnDef="usageCount">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Uses</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Uses</p>
                        <span>{{ item.usageCount }}</span>
                    </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item">
                        <button matIconButton [matMenuTriggerFor]="actionsMenu" (click)="$event.stopPropagation()">
                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                        </button>
                        <mat-menu #actionsMenu="matMenu">
                            <button mat-menu-item (click)="openTemplate(item)">
                                <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                <span>View Details</span>
                            </button>
                            @if (item.status === 'APPROVED') {
                                <button mat-menu-item (click)="useTemplate(item)">
                                    <mat-icon class="material-icons-outlined">rocket_launch</mat-icon>
                                    <span>Use Template</span>
                                </button>
                            }
                            <button mat-menu-item (click)="forkTemplate(item)">
                                <mat-icon class="material-icons-outlined">fork_right</mat-icon>
                                <span>Fork</span>
                            </button>
                            @if (canEdit(item)) {
                                @if (item.status === 'DRAFT' && item.createdBy === currentUserId) {
                                    <button mat-menu-item (click)="publishTemplate(item)">
                                        <mat-icon class="material-icons-outlined">publish</mat-icon>
                                        <span>Publish</span>
                                    </button>
                                }
                                <button mat-menu-item (click)="deleteTemplate(item)">
                                    <mat-icon class="material-icons-outlined">archive</mat-icon>
                                    <span>Archive</span>
                                </button>
                            }
                        </mat-menu>
                    </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns" class="cursor-pointer" (click)="openTemplate(row)"></tr>
            </table>

            <mat-card-content>
                <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page" class="bg-none"></mat-paginator>
            </mat-card-content>
        </mat-card>
    `,
})
export class TemplatesGridComponent implements OnInit, OnChanges {
    @Input() templatesData: TemplateCardItem[] | null = null;
    @Input() currentUserId = 0;
    @Input() isAdmin = false;
    @Input() title = "Templates";

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);
    private readonly templateService = inject(M2TemplateService);

    dataSource = new MatTableDataSource<TemplateCardItem>([]);
    displayedColumns = ["name", "status", "difficulty", "effort", "rating", "usageCount", "actions"];

    ngOnInit() {
        if (this.templatesData) this.dataSource.data = [...this.templatesData];
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["templatesData"] && this.templatesData) {
            this.dataSource.data = [...this.templatesData];
        }
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (data: TemplateCardItem, filter: string) => {
            const str = [data.name, data.type, data.status, data.difficulty || "", data.effort || "", data.tags || ""].join(" ").toLowerCase();
            return str.includes(filter);
        };
    }

    applyFilter(event: Event) {
        this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    }

    statusLabel(status: string): string {
        switch (status) {
            case "DRAFT": return "Draft";
            case "PENDING_APPROVAL": return "Pending";
            case "APPROVED": return "Approved";
            case "REJECTED": return "Rejected";
            default: return status;
        }
    }

    canEdit(item: TemplateCardItem): boolean {
        return item.createdBy === this.currentUserId || this.isAdmin;
    }

    openTemplate(item: TemplateCardItem): void {
        this.router.navigate(["/app/templates", item.id]);
    }

    useTemplate(item: TemplateCardItem): void {
        this.router.navigate(["/app/templates", item.id]);
    }

    forkTemplate(item: TemplateCardItem): void {
        this.templateService.fork(item.id).subscribe({
            next: (forked) => this.snackBar.open(`"${forked.name}" forked as DRAFT.`, "Close", { duration: 3500 }),
            error: () => this.snackBar.open("Failed to fork template.", "Close", { duration: 4000 }),
        });
    }

    publishTemplate(item: TemplateCardItem): void {
        this.templateService.publish(item.id).subscribe({
            next: (updated) => {
                this.snackBar.open(`"${updated.name}" submitted for approval.`, "Close", { duration: 3500 });
                this.dataSource.data = this.dataSource.data.map(t => t.id === item.id ? { ...t, status: updated.status } : t);
            },
            error: () => this.snackBar.open("Failed to publish template.", "Close", { duration: 4000 }),
        });
    }

    deleteTemplate(item: TemplateCardItem): void {
        const ref = this.dialog.open(TemplateDeleteConfirmDialogComponent, {
            width: "480px", maxWidth: "95vw",
            data: { templateName: item.name },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.templateService.delete(item.id).subscribe({
                next: () => {
                    this.snackBar.open("Template archived.", "Close", { duration: 3500 });
                    this.dataSource.data = this.dataSource.data.filter(t => t.id !== item.id);
                },
                error: () => this.snackBar.open("Failed to archive template.", "Close", { duration: 4000 }),
            });
        });
    }
}
