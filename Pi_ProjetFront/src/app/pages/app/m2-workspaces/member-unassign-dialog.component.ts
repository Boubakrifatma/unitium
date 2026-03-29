import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

export interface MemberUnassignDialogData {
    memberName: string;
    memberEmail: string;
    workspaceName: string;
    isBulk?: boolean;
    affectedProjectCount?: number;
}

export interface MemberUnassignDialogResult {
    confirm: true;
}

@Component({
    selector: "app-member-unassign-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <span class="flex-grow-1">{{ data.isBulk ? "Unassign Multiple Members" : "Unassign Member" }}</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            <div class="alert-shell mb-3 d-flex align-items-start gap-2">
                <mat-icon class="material-icons-outlined theme-orange">warning</mat-icon>
                <div>
                    <p class="mb-1 fw-medium">This removes workspace access only.</p>
                    <p class="small text-secondary mb-0">The member{{ data.isBulk ? 's remain' : ' remains' }} in the organization and can be re-invited later.</p>
                </div>
            </div>

            @if (data.isBulk) {
                <div class="member-shell mb-3">
                    <p class="small text-secondary mb-1">Removing from workspace:</p>
                    <p class="fw-semibold mb-0">{{ data.memberName }}</p>
                    <p class="small text-secondary mb-0">{{ data.memberEmail }}</p>
                </div>
            } @else {
                <div class="member-shell">
                    <p class="mb-1"><strong>{{ data.memberName }}</strong></p>
                    <p class="small text-secondary mb-0">{{ data.memberEmail || "No email" }}</p>
                </div>
            }

            @if (data.affectedProjectCount !== undefined && data.affectedProjectCount > 0) {
                <div class="impact-info p-2 mt-3 rounded" style="background: rgba(255, 152, 0, 0.08); border-left: 3px solid #ff9800;">
                    <p class="small mb-0">
                        <mat-icon class="material-icons-outlined" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">info</mat-icon>
                        This member is assigned to <strong>{{ data.affectedProjectCount }}</strong> project{{ data.affectedProjectCount !== 1 ? 's' : '' }}
                    </p>
                </div>
            }

            <p class="small text-secondary mt-3 mb-0">Workspace: {{ data.workspaceName }}</p>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" color="warn" (click)="confirm()">{{ data.isBulk ? "Unassign All" : "Unassign" }}</button>
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

            .impact-info {
                display: flex;
                align-items: center;
            }
        `,
    ],
})
export class MemberUnassignDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<MemberUnassignDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as MemberUnassignDialogData;

    confirm(): void {
        this.dialogRef.close({ confirm: true } as MemberUnassignDialogResult);
    }

    close(): void {
        this.dialogRef.close();
    }
}
