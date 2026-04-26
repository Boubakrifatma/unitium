import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";

export interface ProjectMemberUnassignDialogData {
    memberName: string;
    projectName: string;
}

export interface ProjectMemberUnassignDialogResult {
    confirm: boolean;
}

@Component({
    selector: "app-project-member-unassign-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
        <h3 mat-dialog-title>Remove Project Member</h3>
        <mat-dialog-content>
            <p class="mb-2">Remove <strong>{{ data.memberName }}</strong> from project <strong>{{ data.projectName }}</strong>?</p>
            <p class="small text-secondary mb-0">This member will lose project-level access but can still remain in the workspace.</p>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" class="theme-red" (click)="confirm()">Remove</button>
        </mat-dialog-actions>
    `,
})
export class ProjectMemberUnassignDialogComponent {
    readonly dialogRef = inject(MatDialogRef<ProjectMemberUnassignDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as ProjectMemberUnassignDialogData;

    close(): void {
        this.dialogRef.close();
    }

    confirm(): void {
        this.dialogRef.close({ confirm: true } as ProjectMemberUnassignDialogResult);
    }
}
