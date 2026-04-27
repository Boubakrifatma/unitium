import { Component, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { trigger, transition, style, animate } from "@angular/animations";

@Component({
    selector: "app-cannot-delete-milestone-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="dialog-overlay" [@dialogOverlay]>
            <div class="dialog-container">
                <div class="icon-wrapper">
                    <mat-icon class="block-icon">block</mat-icon>
                </div>

                <h2 class="dialog-title">Cannot Delete Milestone</h2>
                <p class="dialog-message">
                    The milestone <strong>"{{ data.milestoneName }}"</strong> cannot be deleted because it contains
                    <strong>{{ data.taskCount }} task(s)</strong>.
                </p>
                <p class="dialog-info">
                    <mat-icon>info_outline</mat-icon>
                    Please delete or reassign all tasks linked to this milestone before deleting it.
                </p>

                <div class="dialog-actions">
                    <button mat-raised-button class="ok-btn" (click)="onClose()">
                        <mat-icon>check</mat-icon>
                        Understood
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-primary: #ffffff;
            --block-color: #f97316;
        }

        .dialog-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 1000;
        }

        .dialog-container {
            background: var(--bg-primary);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            max-width: 440px;
            width: 100%;
            padding: 40px 32px;
            text-align: center;
            animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1);
        }

        .icon-wrapper {
            width: 80px; height: 80px;
            background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .block-icon {
            font-size: 40px; width: 40px; height: 40px;
            color: var(--block-color);
        }

        .dialog-title {
            font-size: 1.5rem; font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 12px 0;
        }

        .dialog-message {
            font-size: 0.95rem; color: var(--text-secondary);
            margin: 0 0 16px 0; line-height: 1.6;
        }

        .dialog-message strong { color: var(--text-primary); font-weight: 700; }

        .dialog-info {
            display: flex; align-items: center; justify-content: center;
            gap: 8px; font-size: 0.85rem; color: var(--block-color);
            background: rgba(249,115,22,0.1);
            border-radius: 8px; padding: 12px 16px;
            margin: 0 0 32px 0; font-weight: 600;
        }

        .dialog-info mat-icon { font-size: 18px; width: 18px; height: 18px; }

        .dialog-actions { display: flex; justify-content: center; }

        .ok-btn {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white; padding: 8px 32px; font-weight: 600;
            display: flex; gap: 8px; align-items: center;
        }

        .ok-btn:hover { box-shadow: 0 10px 30px rgba(249,115,22,0.3); }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `],
    animations: [
        trigger('dialogOverlay', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class CannotDeleteMilestoneDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<CannotDeleteMilestoneDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { milestoneName: string; taskCount: number }
    ) {}

    onClose(): void {
        this.dialogRef.close();
    }
}

@Component({
    selector: "app-confirm-delete-dialog",
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="dialog-overlay" [@dialogOverlay]>
            <div class="dialog-container">
                <div class="icon-wrapper">
                    <mat-icon class="warning-icon">delete_outline</mat-icon>
                </div>

                <h2 class="dialog-title">Delete Milestone?</h2>
                <p class="dialog-message">
                    Are you sure you want to delete <strong>"{{ data.milestoneName }}"</strong>?
                </p>
                <p class="dialog-warning">
                    <mat-icon>warning</mat-icon>
                    This action cannot be undone.
                </p>

                <div class="dialog-actions">
                    <button mat-button class="cancel-btn" (click)="onCancel()">
                        <mat-icon>close</mat-icon>
                        Cancel
                    </button>
                    <button mat-raised-button class="delete-btn" (click)="onConfirm()">
                        <mat-icon>delete</mat-icon>
                        Delete Milestone
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-primary: #ffffff;
            --danger-color: #ef4444;
        }

        @media (prefers-color-scheme: dark) {
            :host {
                --text-primary: #f3f4f6;
                --text-secondary: #d1d5db;
                --bg-primary: #1f2937;
                --danger-color: #ef4444;
            }
        }

        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
        }

        .dialog-container {
            background: var(--bg-primary);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            max-width: 420px;
            width: 100%;
            padding: 40px 32px;
            text-align: center;
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .icon-wrapper {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .warning-icon {
            font-size: 40px;
            width: 40px;
            height: 40px;
            color: var(--danger-color);
        }

        .dialog-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 12px 0;
        }

        .dialog-message {
            font-size: 0.95rem;
            color: var(--text-secondary);
            margin: 0 0 16px 0;
            line-height: 1.6;
        }

        .dialog-message strong {
            color: var(--text-primary);
            font-weight: 700;
        }

        .dialog-warning {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--danger-color);
            background: rgba(239, 68, 68, 0.1);
            border-radius: 8px;
            padding: 12px 16px;
            margin: 16px 0 32px 0;
            font-weight: 600;
        }

        .dialog-warning mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
        }

        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .cancel-btn {
            color: var(--text-secondary);
            transition: all 0.3s;
            padding: 8px 24px;
            font-weight: 600;
        }

        .cancel-btn:hover {
            background: #f3f4f6;
        }

        .delete-btn {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 8px 24px;
            font-weight: 600;
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .delete-btn:hover {
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 600px) {
            .dialog-container {
                padding: 32px 24px;
            }

            .dialog-actions {
                flex-direction: column;
            }

            .cancel-btn,
            .delete-btn {
                width: 100%;
            }
        }
    `],
    animations: [
        trigger('dialogOverlay', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ConfirmDeleteDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { milestoneName: string }
    ) {}

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}