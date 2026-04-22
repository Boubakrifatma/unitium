import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";

export interface CreateProjectChoiceResult {
    choice: "template" | "blank";
}

@Component({
    selector: "app-create-project-choice-dialog",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatDialogModule],
    template: `
        <h3 mat-dialog-title class="mb-3">How would you like to create a project?</h3>

        <mat-dialog-content class="pt-0">
            <p class="text-secondary mb-4">Choose a template to start with a configured structure, or create a blank project to build from scratch.</p>

            <div class="row gx-3">
                <!-- Template Option -->
                <div class="col-12 col-md-6">
                    <mat-card class="choice-card choice-template" (click)="selectTemplate()">
                        <mat-card-content class="p-4">
                            <div class="mb-3">
                                <mat-icon class="choice-icon template-icon">template_outline</mat-icon>
                            </div>
                            <h5 class="mb-2">Start with a Template</h5>
                            <p class="text-secondary small mb-3">
                                Use a pre-configured template (SCRUM, Kanban, Waterfall, etc.) to jumpstart your project with best-practice workflows.
                            </p>
                            <div class="template-badges mb-3">
                                <span class="badge badge-light me-2">SCRUM</span>
                                <span class="badge badge-light">Kanban</span>
                            </div>
                            <button matButton color="primary" class="w-100">
                                Choose Template
                                <mat-icon class="material-icons-outlined ms-2">arrow_forward</mat-icon>
                            </button>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- Blank Option -->
                <div class="col-12 col-md-6">
                    <mat-card class="choice-card choice-blank" (click)="selectBlank()">
                        <mat-card-content class="p-4">
                            <div class="mb-3">
                                <mat-icon class="choice-icon blank-icon">edit_note</mat-icon>
                            </div>
                            <h5 class="mb-2">Create Blank Project</h5>
                            <p class="text-secondary small mb-3">
                                Start with an empty project and configure it exactly how you need. Full control from the beginning.
                            </p>
                            <div class="blank-note mb-3">
                                <p class="small text-secondary mb-0">
                                    <mat-icon class="material-icons-outlined align-middle">info</mat-icon>
                                    You can add members and workflows anytime
                                </p>
                            </div>
                            <button matButton color="primary" class="w-100">
                                Create Blank
                                <mat-icon class="material-icons-outlined ms-2">arrow_forward</mat-icon>
                            </button>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="cancel()">Cancel</button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .choice-card {
                cursor: pointer;
                transition: all 0.3s ease;
                border: 1.5px solid rgba(0, 0, 0, 0.08);
                position: relative;
                overflow: hidden;
            }

            .choice-card::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: transparent;
                transition: background 0.3s ease;
            }

            .choice-template::before {
                background: linear-gradient(90deg, #0088ff, #0055cc);
            }

            .choice-blank::before {
                background: linear-gradient(90deg, #22c55e, #16a34a);
            }

            .choice-card:hover {
                border-color: rgba(0, 136, 255, 0.4);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                transform: translateY(-4px);
            }

            .choice-icon {
                font-size: 48px;
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
            }

            .template-icon {
                background: rgba(0, 136, 255, 0.1);
                color: #0088ff;
            }

            .blank-icon {
                background: rgba(34, 197, 94, 0.1);
                color: #22c55e;
            }

            .template-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .blank-note {
                padding: 8px 12px;
                border-left: 3px solid #22c55e;
                border-radius: 4px;
                background: rgba(34, 197, 94, 0.05);
            }

            h5 {
                font-weight: 600;
                margin-bottom: 12px;
                color: #1a1a1a;
            }

            p.text-secondary {
                color: #666;
                line-height: 1.4;
            }
        `,
    ],
})
export class CreateProjectChoiceDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<CreateProjectChoiceDialogComponent>);

    selectTemplate(): void {
        this.dialogRef.close({ choice: "template" } as CreateProjectChoiceResult);
    }

    selectBlank(): void {
        this.dialogRef.close({ choice: "blank" } as CreateProjectChoiceResult);
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
