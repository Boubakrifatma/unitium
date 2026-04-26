import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

export interface ProjectDeleteConfirmDialogData {
    projectName: string;
    /** false/undefined = archive (soft-delete); true = permanent hard-delete */
    permanent?: boolean;
}

export interface ProjectDeleteConfirmDialogResult {
    confirmed: true;
}

@Component({
    selector: "app-project-delete-confirm-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <mat-icon class="material-icons-outlined me-2" [class.theme-orange]="!permanent" [class.theme-red]="permanent">
                {{ permanent ? 'delete_forever' : 'archive' }}
            </mat-icon>
            <span class="flex-grow-1">{{ permanent ? 'Delete Project Permanently' : 'Archive Project' }}</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            @if (permanent) {
            <div class="d-flex align-items-start gap-2 px-3 py-2 rounded mb-3" style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);">
                <mat-icon class="material-icons-outlined flex-shrink-0 mt-1" style="font-size:18px;width:18px;height:18px;color:#dc3545;">warning</mat-icon>
                <div>
                    <p class="small fw-medium mb-1" style="color:#dc3545;">This cannot be undone.</p>
                    <p class="small mb-0">The project and all its members will be permanently removed from the database. There is no recovery.</p>
                </div>
            </div>
            } @else {
            <div class="d-flex align-items-start gap-2 px-3 py-2 rounded mb-3" style="background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.35);">
                <mat-icon class="material-icons-outlined flex-shrink-0 mt-1" style="font-size:18px;width:18px;height:18px;color:#f57c00;">info</mat-icon>
                <div>
                    <p class="small fw-medium mb-1" style="color:#f57c00;">The project will be archived.</p>
                    <p class="small mb-0">It will be hidden from all workspace views. This action sets the status to Archived.</p>
                </div>
            </div>
            }

            <p class="small mb-2">
                Type <strong>{{ projectName }}</strong> to confirm.
            </p>

            <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Project name confirmation</mat-label>
                <input matInput [ngModel]="typedName()" (ngModelChange)="typedName.set(($event || '').toString())" placeholder="Type the project name exactly" />
                @if (typedName().length > 0 && !isExactMatch()) {
                <mat-error>Name does not match. Check for spaces or capitalisation.</mat-error>
                }
            </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            @if (permanent) {
            <button matButton="filled" color="warn" [disabled]="!isExactMatch()" (click)="submit()">
                <mat-icon class="material-icons-outlined">delete_forever</mat-icon>
                Delete Permanently
            </button>
            } @else {
            <button matButton="filled" [disabled]="!isExactMatch()" (click)="submit()" style="background:#f57c00;color:#fff;">
                <mat-icon class="material-icons-outlined">archive</mat-icon>
                Archive Project
            </button>
            }
        </mat-dialog-actions>
    `,
})
export class ProjectDeleteConfirmDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<ProjectDeleteConfirmDialogComponent>);
    private readonly data = inject(MAT_DIALOG_DATA) as ProjectDeleteConfirmDialogData;

    readonly typedName = signal("");
    readonly projectName = (this.data?.projectName || "").trim();
    readonly permanent = this.data?.permanent === true;

    readonly isExactMatch = computed(() => this.typedName().trim() === this.projectName);

    submit(): void {
        if (!this.isExactMatch()) return;
        this.dialogRef.close({ confirmed: true } as ProjectDeleteConfirmDialogResult);
    }

    close(): void {
        this.dialogRef.close();
    }
}
