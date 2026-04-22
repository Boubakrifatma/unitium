import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

export interface WorkspaceDeleteConfirmDialogData {
    workspaceName: string;
}

export interface WorkspaceDeleteConfirmDialogResult {
    confirmName: string;
}

@Component({
    selector: "app-workspace-delete-confirm-dialog",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
    ],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <span class="flex-grow-1">Delete Workspace</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            <div class="alert alert-warning small" role="alert">
                This action will soft-delete the workspace and hide it from active lists.
            </div>
            <p class="small mb-2">
                Type <strong>{{ workspaceName }}</strong> to confirm deletion.
            </p>

            <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Workspace name confirmation</mat-label>
                <input matInput [ngModel]="typedName()" (ngModelChange)="typedName.set(($event || '').toString())" />
            </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" color="warn" [disabled]="!isExactMatch()" (click)="submit()">Delete</button>
        </mat-dialog-actions>
    `,
})
export class WorkspaceDeleteConfirmDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<WorkspaceDeleteConfirmDialogComponent>);
    private readonly data = inject(MAT_DIALOG_DATA) as WorkspaceDeleteConfirmDialogData;

    readonly typedName = signal("");
    readonly workspaceName = (this.data?.workspaceName || "").trim();

    readonly isExactMatch = computed(() => this.typedName().trim() === this.workspaceName);

    submit(): void {
        if (!this.isExactMatch()) {
            return;
        }
        const result: WorkspaceDeleteConfirmDialogResult = {
            confirmName: this.typedName().trim(),
        };
        this.dialogRef.close(result);
    }

    close(): void {
        this.dialogRef.close();
    }
}
