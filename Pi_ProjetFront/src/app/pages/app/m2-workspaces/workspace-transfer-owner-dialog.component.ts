import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

export interface WorkspaceTransferOwnerDialogData {
    newOwnerName: string;
    newOwnerEmail: string;
    workspaceName: string;
}

export interface WorkspaceTransferOwnerDialogResult {
    confirm: true;
}

@Component({
    selector: "app-workspace-transfer-owner-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <span class="flex-grow-1">Transfer Ownership</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            <div class="alert-shell mb-3 d-flex align-items-start gap-2">
                <mat-icon class="material-icons-outlined theme-orange">transfer_within_a_station</mat-icon>
                <div>
                    <p class="mb-1 fw-medium">This action changes workspace ownership.</p>
                    <p class="small text-secondary mb-0">
                        You will be demoted to <strong>Admin</strong>. Only a new Owner or an org Admin can reverse this.
                    </p>
                </div>
            </div>

            <p class="small text-secondary mb-2">New owner</p>
            <div class="member-shell mb-3">
                <p class="mb-1"><strong>{{ data.newOwnerName }}</strong></p>
                <p class="small text-secondary mb-0">{{ data.newOwnerEmail || "No email" }}</p>
            </div>

            <p class="small text-secondary mb-0">Workspace: <strong>{{ data.workspaceName }}</strong></p>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" color="primary" (click)="confirm()">Transfer Ownership</button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .alert-shell {
                border: 1px solid rgba(255, 152, 0, 0.35);
                background: rgba(255, 193, 7, 0.08);
                border-radius: 12px;
                padding: 12px;
            }

            .member-shell {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 12px;
                background: #fff;
            }
        `,
    ],
})
export class WorkspaceTransferOwnerDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<WorkspaceTransferOwnerDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as WorkspaceTransferOwnerDialogData;

    confirm(): void {
        this.dialogRef.close({ confirm: true } as WorkspaceTransferOwnerDialogResult);
    }

    close(): void {
        this.dialogRef.close();
    }
}
