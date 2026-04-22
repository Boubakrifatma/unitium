import { Component, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";

export interface TemplateRejectDialogData {
    templateName: string;
    templateId: string;
}

export interface TemplateRejectDialogResult {
    reason: string;
}

@Component({
    standalone: true,
    selector: "app-template-reject-dialog",
    imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatIconModule],
    template: `
        <h2 mat-dialog-title class="d-flex align-items-center gap-2">
            <mat-icon class="material-icons-outlined theme-red">cancel</mat-icon>
            Reject Template
        </h2>
        <mat-dialog-content>
            <p class="small text-secondary mb-3">
                Rejecting <strong>{{ data.templateName }}</strong>. Please provide a reason so the author can improve their submission.
            </p>
            <mat-form-field appearance="outline" class="w-100">
                <mat-label>Rejection reason</mat-label>
                <textarea matInput
                          [(ngModel)]="reason"
                          rows="4"
                          placeholder="e.g. Missing required phases, unclear description, policy violation…"
                          maxlength="500">
                </textarea>
                <mat-hint align="end">{{ reason.length }}/500</mat-hint>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            <button matButton mat-dialog-close>Cancel</button>
            <button matButton="filled" [disabled]="!reason.trim()" (click)="confirm()"
                    style="background-color: var(--mat-sys-error);">
                <mat-icon class="material-icons-outlined">cancel</mat-icon> Reject
            </button>
        </mat-dialog-actions>
    `,
})
export class TemplateRejectDialogComponent {
    reason = "";

    constructor(
        public dialogRef: MatDialogRef<TemplateRejectDialogComponent, TemplateRejectDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: TemplateRejectDialogData
    ) {}

    confirm(): void {
        if (this.reason.trim()) {
            this.dialogRef.close({ reason: this.reason.trim() });
        }
    }
}
