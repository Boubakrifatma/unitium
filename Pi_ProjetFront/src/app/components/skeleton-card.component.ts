import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";

@Component({
    selector: "app-skeleton-card",
    standalone: true,
    imports: [CommonModule, MatCardModule],
    template: `
        <mat-card class="mb-2 skeleton-card">
            <mat-card-content>
                <div class="d-flex align-items-center gap-2">
                    <div class="skeleton-avatar"></div>
                    <div class="flex-grow-1">
                        <div class="skeleton-text skeleton-text-lg mb-2"></div>
                        <div class="skeleton-text skeleton-text-sm"></div>
                    </div>
                    <div class="d-flex gap-1 flex-shrink-0">
                        <div class="skeleton-badge"></div>
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-icon"></div>
                    </div>
                </div>
            </mat-card-content>
        </mat-card>
    `,
    styles: [
        `
            .skeleton-card {
                border: 1px solid rgba(0, 0, 0, 0.08);
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                flex-shrink: 0;
            }

            .skeleton-text {
                height: 12px;
                border-radius: 6px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
            }

            .skeleton-text-lg {
                height: 16px;
                width: 60%;
            }

            .skeleton-text-sm {
                height: 12px;
                width: 45%;
            }

            .skeleton-badge {
                width: 60px;
                height: 24px;
                border-radius: 12px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
            }

            .skeleton-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
            }

            @keyframes loading {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }
        `,
    ],
})
export class SkeletonCardComponent {}
