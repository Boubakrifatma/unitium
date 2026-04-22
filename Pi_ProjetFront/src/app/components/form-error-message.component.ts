import { Component, Input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";

export interface FormFieldError {
    error: string;
    message: string;
    hint?: string;
}

@Component({
    selector: "app-form-error-message",
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
        @if (errorValue()) {
            <div class="form-error-container">
                <div class="form-error-content">
                    <mat-icon class="material-icons-outlined form-error-icon">error_outline</mat-icon>
                    <div class="form-error-text">
                        <p class="form-error-message">{{ errorValue()!.message }}</p>
                        @if (errorValue()!.hint) {
                            <p class="form-error-hint">{{ errorValue()!.hint }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        .form-error-container {
            margin-top: 6px;
            margin-bottom: 8px;
        }

        .form-error-content {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            padding: 8px 12px;
            border-radius: 4px;
            background: rgba(220, 38, 38, 0.08);
            border: 1px solid rgba(220, 38, 38, 0.2);
        }

        .form-error-icon {
            color: #dc2626;
            font-size: 18px;
            width: 18px;
            height: 18px;
            margin-top: 2px;
            flex-shrink: 0;
        }

        .form-error-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
        }

        .form-error-message {
            font-size: 12px;
            font-weight: 500;
            color: #991b1b;
            margin: 0;
        }

        .form-error-hint {
            font-size: 11px;
            color: #7f1d1d;
            margin: 0;
            opacity: 0.85;
        }
    `]
})
export class FormErrorMessageComponent {
    readonly errorValue = signal<FormFieldError | null>(null);

    @Input() set error(value: FormFieldError | null) {
        this.errorValue.set(value);
    }
}
