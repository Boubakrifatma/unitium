import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";

export interface MemberRoleEditDialogData {
    memberName: string;
    orgType: string;
    currentRole: string;
}

export interface MemberRoleEditDialogResult {
    role: string;
}

@Component({
    selector: "app-member-role-edit-dialog",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatSelectModule,
    ],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <span class="flex-grow-1">Edit Member Role</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="pt-2">
            <p class="small text-secondary mb-3">Member: {{ memberName }}</p>
            <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Workspace Role</mat-label>
                <mat-select [(ngModel)]="selectedRole">
                    @for (option of roleOptions(); track option.value) {
                    <mat-option [value]="option.value">{{ option.label }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" [disabled]="!selectedRole" (click)="submit()">Save Role</button>
        </mat-dialog-actions>
    `,
})
export class MemberRoleEditDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<MemberRoleEditDialogComponent>);
    private readonly data = inject(MAT_DIALOG_DATA) as MemberRoleEditDialogData;

    readonly memberName = this.data?.memberName || "Member";
    selectedRole = (this.data?.currentRole || "").toUpperCase();

    readonly roleOptions = computed(() => {
        const orgType = (this.data?.orgType || "enterprise").toLowerCase();
        if (orgType === "academic") {
            return [
                { value: "TA", label: "Teaching Assistant" },
                { value: "STUDENT", label: "Student" },
                { value: "VIEWER", label: "Viewer" },
            ];
        }
        return [
            { value: "MANAGER", label: "Manager" },
            { value: "EMPLOYEE", label: "Employee" },
            { value: "VIEWER", label: "Viewer" },
        ];
    });

    submit(): void {
        if (!this.selectedRole) {
            return;
        }
        const result: MemberRoleEditDialogResult = {
            role: this.selectedRole,
        };
        this.dialogRef.close(result);
    }

    close(): void {
        this.dialogRef.close();
    }
}
