import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";

export interface ProjectMemberRoleEditDialogData {
    memberName: string;
    currentRole: string;
    orgType?: string;
}

export interface ProjectMemberRoleEditDialogResult {
    role: string;
}

@Component({
    selector: "app-project-member-role-edit-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
    template: `
        <h3 mat-dialog-title>Edit Project Member Role</h3>
        <mat-dialog-content>
            <p class="small text-secondary mb-2">Member: {{ data.memberName }}</p>
            <mat-form-field appearance="outline" class="w-100 mt-2">
                <mat-label>Role</mat-label>
                <mat-select [(ngModel)]="selectedRole">
                    @for (option of roleOptions(); track option.value) {
                    <mat-option [value]="option.value">{{ option.label }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" (click)="submit()" [disabled]="!selectedRole">Save</button>
        </mat-dialog-actions>
    `,
})
export class ProjectMemberRoleEditDialogComponent {
    readonly dialogRef = inject(MatDialogRef<ProjectMemberRoleEditDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as ProjectMemberRoleEditDialogData;

    selectedRole = (this.data?.currentRole || "").toUpperCase();

    readonly roleOptions = computed(() => {
        const academic = (this.data?.orgType || "").toLowerCase() === "academic";
        if (academic) {
            return [
                { value: "PROFESSOR", label: "Professor" },
                { value: "DEVELOPER", label: "Developer" },
                { value: "REVIEWER", label: "Reviewer" },
                { value: "OBSERVER", label: "Observer" },
            ];
        }
        return [
            { value: "PROJECT_MANAGER", label: "Project Manager" },
            { value: "DEVELOPER", label: "Developer" },
            { value: "REVIEWER", label: "Reviewer" },
            { value: "OBSERVER", label: "Observer" },
        ];
    });

    close(): void {
        this.dialogRef.close();
    }

    submit(): void {
        this.dialogRef.close({ role: this.selectedRole } as ProjectMemberRoleEditDialogResult);
    }
}
