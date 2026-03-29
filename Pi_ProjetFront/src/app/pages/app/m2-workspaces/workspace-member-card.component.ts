import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, computed } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { WorkspaceMember } from "./models/workspace-member.model";

@Component({
    selector: "app-workspace-member-card",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatCheckboxModule],
    template: `
        <mat-card class="mb-2" [class.selected-card]="isSelected">
            <mat-card-content>
                <div class="d-flex align-items-center gap-2">
                    @if (showCheckbox) {
                    <mat-checkbox [checked]="isSelected" (change)="requestToggleSelection()" class="flex-shrink-0"></mat-checkbox>
                    }
                    <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2 bg-light-theme d-flex align-items-center justify-content-center flex-shrink-0">
                        @if (member.avatarUrl) {
                        <img class="w-100 h-100 rounded-circle" [src]="member.avatarUrl" [alt]="member.fullName" />
                        } @else {
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                        }
                    </span>
                    <span class="align-middle d-inline-block flex-grow-1">
                        <p class="mb-1">{{ member.fullName }}</p>
                        <p class="text-secondary small mb-0">{{ member.email }}</p>
                    </span>
                    <div class="text-end">
                        <span class="badge badge-light" [ngClass]="roleBadgeClass()">{{ roleLabel() }}</span>
                        <p class="text-secondary small mb-0 mt-1">Joined {{ joinedAtLabel() }}</p>
                    </div>
                    @if ((canEditRole || canRemoveMember) && !showCheckbox) {
                    <div class="d-flex align-items-center ms-2 gap-1 flex-shrink-0">
                        @if (canEditRole) {
                        <button matIconButton (click)="requestRoleEdit()" title="Edit member role">
                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                        </button>
                        }
                        @if (canRemoveMember) {
                        <button matIconButton class="theme-red" (click)="requestRemoveMember()" title="Unassign from workspace">
                            <mat-icon class="material-icons-outlined">person_remove</mat-icon>
                        </button>
                        }
                    </div>
                    }
                </div>
            </mat-card-content>
        </mat-card>
    `,
    styles: [
        `
            mat-card.selected-card {
                border-color: #0088ff;
                box-shadow: 0 0 0 2px rgba(0, 136, 255, 0.12);
                background: rgba(0, 136, 255, 0.04);
            }
        `,
    ],
})
export class WorkspaceMemberCardComponent {
    @Input({ required: true }) member!: WorkspaceMember;
    @Input() orgType: string = "enterprise";
    @Input() canEditRole = false;
    @Input() canRemoveMember = false;
    @Input() showCheckbox = false;
    @Input() isSelected = false;

    @Output() readonly editRole = new EventEmitter<WorkspaceMember>();
    @Output() readonly removeMember = new EventEmitter<WorkspaceMember>();
    @Output() readonly toggleSelection = new EventEmitter<WorkspaceMember>();

    readonly normalizedOrgType = computed(() => (this.orgType || "enterprise").toLowerCase());

    roleLabel(): string {
        const role = (this.member.workspaceRole || "").toUpperCase();
        if (this.normalizedOrgType() === "academic") {
            if (role === "TA") {
                return "Teaching Assistant";
            }
            if (role === "STUDENT") {
                return "Student";
            }
            if (role === "VIEWER") {
                return "Viewer";
            }
            if (role === "ADMIN") {
                return "Admin";
            }
        }

        if (role === "MANAGER") {
            return "Manager";
        }
        if (role === "EMPLOYEE") {
            return "Employee";
        }
        if (role === "VIEWER") {
            return "Viewer";
        }
        if (role === "ADMIN") {
            return "Admin";
        }

        return role || "Member";
    }

    roleBadgeClass(): string {
        const role = (this.member.workspaceRole || "").toUpperCase();
        if (role === "ADMIN" || role === "MANAGER" || role === "TA") {
            return "theme-blue";
        }
        if (role === "EMPLOYEE" || role === "STUDENT") {
            return "theme-green";
        }
        return "theme-orange";
    }

    joinedAtLabel(): string {
        if (!this.member.joinedAt) {
            return "-";
        }
        const parsed = new Date(this.member.joinedAt);
        return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
    }

    requestRoleEdit(): void {
        this.editRole.emit(this.member);
    }

    requestRemoveMember(): void {
        this.removeMember.emit(this.member);
    }

    requestToggleSelection(): void {
        this.toggleSelection.emit(this.member);
    }
}
