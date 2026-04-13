import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";

export interface ProjectMemberCardModel {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    role: string;
    assignedAt: string;
}

@Component({
    selector: "app-project-member-card",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    template: `
        <mat-card class="mb-2">
            <mat-card-content>
                <div class="d-flex align-items-center">
                    <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2 bg-light-theme d-flex align-items-center justify-content-center">
                        @if (member.avatarUrl) {
                        <img class="w-100 h-100 rounded-circle" [src]="member.avatarUrl" [alt]="member.fullName" />
                        } @else {
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                        }
                    </span>
                    <span class="align-middle d-inline-block flex-grow-1">
                        <p class="mb-1">{{ member.fullName }}</p>
                        <p class="text-secondary small mb-0">{{ member.email || ('User #' + member.userId) }}</p>
                    </span>
                    <div class="text-end">
                        <span class="badge badge-light" [ngClass]="roleBadgeClass()">{{ roleLabel() }}</span>
                        <p class="text-secondary small mb-0 mt-1">Joined {{ assignedAtLabel() }}</p>
                    </div>
                    @if (canEditRole || canRemoveMember) {
                    <div class="d-flex align-items-center ms-2 gap-1">
                        @if (canEditRole) {
                        <button matIconButton (click)="requestRoleEdit()" title="Edit member role">
                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                        </button>
                        }
                        @if (canRemoveMember) {
                        <button matIconButton class="theme-red" (click)="requestRemoveMember()" title="Unassign from project">
                            <mat-icon class="material-icons-outlined">person_remove</mat-icon>
                        </button>
                        }
                    </div>
                    }
                </div>
            </mat-card-content>
        </mat-card>
    `,
})
export class ProjectMemberCardComponent {
    @Input({ required: true }) member!: ProjectMemberCardModel;
    @Input() canEditRole = false;
    @Input() canRemoveMember = false;

    @Output() readonly editRole = new EventEmitter<ProjectMemberCardModel>();
    @Output() readonly removeMember = new EventEmitter<ProjectMemberCardModel>();

    roleLabel(): string {
        const role = (this.member.role || "").toUpperCase();
        if (role === "PROJECT_MANAGER") {
            return "Project Manager";
        }
        if (role === "PROFESSOR") {
            return "Professor";
        }
        if (role === "DEVELOPER") {
            return "Developer";
        }
        if (role === "REVIEWER") {
            return "Reviewer";
        }
        if (role === "OBSERVER") {
            return "Observer";
        }
        return role || "Member";
    }

    roleBadgeClass(): string {
        const role = (this.member.role || "").toUpperCase();
        if (role === "PROJECT_MANAGER" || role === "PROFESSOR") {
            return "theme-blue";
        }
        if (role === "DEVELOPER" || role === "REVIEWER") {
            return "theme-green";
        }
        return "theme-orange";
    }

    assignedAtLabel(): string {
        if (!this.member.assignedAt) {
            return "-";
        }
        const parsed = new Date(this.member.assignedAt);
        return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
    }

    requestRoleEdit(): void {
        this.editRole.emit(this.member);
    }

    requestRemoveMember(): void {
        this.removeMember.emit(this.member);
    }
}
