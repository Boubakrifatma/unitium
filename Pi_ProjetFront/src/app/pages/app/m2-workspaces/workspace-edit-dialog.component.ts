import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

export interface WorkspaceEditDialogData {
    name: string;
    slug: string;
}

export interface WorkspaceEditDialogResult {
    name: string;
    slug?: string;
}

@Component({
    selector: "app-workspace-edit-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <span class="flex-grow-1">Edit Workspace</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            <form #editForm="ngForm">
                <mat-form-field appearance="outline" class="w-100 mb-2">
                    <mat-label>Workspace Name</mat-label>
                    <input matInput name="wsName" [(ngModel)]="name" required minlength="3" maxlength="100" #nameCtrl="ngModel" />
                    <mat-hint align="end">{{ name.length }}/100</mat-hint>
                    @if (nameCtrl.errors?.['required']) {
                    <mat-error>Workspace name is required.</mat-error>
                    }
                    @if (nameCtrl.errors?.['minlength']) {
                    <mat-error>Name must be at least 3 characters long.</mat-error>
                    }
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-100 mb-0">
                    <mat-label>Workspace Slug <span class="text-secondary">(optional)</span></mat-label>
                    <input matInput name="wsSlug" [(ngModel)]="slug" maxlength="80" [pattern]="slugPattern" #slugCtrl="ngModel" />
                    <mat-hint>Lowercase letters, numbers and hyphens only. E.g. my-workspace</mat-hint>
                    @if (slugCtrl.errors?.['pattern']) {
                    <mat-error>Only lowercase letters, numbers, and single hyphens allowed.</mat-error>
                    }
                </mat-form-field>
            </form>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" (click)="submit(editForm)">Save</button>
        </mat-dialog-actions>
    `,
})
export class WorkspaceEditDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<WorkspaceEditDialogComponent>);
    private readonly data = inject(MAT_DIALOG_DATA) as WorkspaceEditDialogData;

    name = (this.data?.name || "").trim();
    slug = (this.data?.slug || "").trim();

    readonly slugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

    submit(form: NgForm): void {
        form.form.markAllAsTouched();
        if (form.invalid) return;
        this.dialogRef.close({
            name: this.name.trim(),
            slug: this.slug.trim() || undefined,
        } as WorkspaceEditDialogResult);
    }

    close(): void {
        this.dialogRef.close();
    }
}
