import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";
import { PasswordStrengthComponent } from "../../../components/password-strength/password-strength.component";

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
    selector: "app-change-password",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, RouterModule, PasswordStrengthComponent],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <mat-card class="bg-light-gradient mb-3 mb-lg-4">
                    <mat-card-content class="p-4 p-lg-5">
                        <div class="login-header mb-4">
                            <h1 class="mb-1">Change Password</h1>
                            <p class="text-secondary">Update your account password</p>
                        </div>
                        <br />

                        @if (success) {
                            <div class="alert alert-success text-center mb-3">
                                Password changed successfully! Redirecting to dashboard...
                            </div>
                        }
                        @if (errorMessage) {
                            <div class="alert alert-danger text-center mb-3">{{ errorMessage }}</div>
                        }

                        <form [formGroup]="changeForm" (ngSubmit)="onSubmit()" class="change-form">
                            <app-password-strength class="w-100"></app-password-strength>

                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Confirm New Password</mat-label>
                                <input matInput formControlName="confirmPassword" [type]="hideConfirmPassword ? 'password' : 'text'" placeholder="Confirm new password" />
                                <button matIconButton matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button">
                                    <mat-icon class="material-icons-outlined">{{ hideConfirmPassword ? "visibility_off" : "visibility" }}</mat-icon>
                                </button>
                            </mat-form-field>

                            <button matButton="filled" color="primary" type="submit" class="w-100" [disabled]="changeForm.invalid || loading">
                                {{ loading ? 'Updating...' : 'Update Password' }}
                            </button>
                        </form>
                    </mat-card-content>
                </mat-card>
                <div class="text-center">
                    <p class="text-secondary mb-1">Do you know your password?</p>
                    <button matButton color="primary" routerLink="/auth/login" class="continue-button"><mat-icon class="material-icons-outlined">arrow_back</mat-icon>Back to Sign In</button>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class ChangePasswordComponent {
    changeForm: FormGroup;
    hideConfirmPassword = true;
    loading = false;
    success = false;
    errorMessage = '';

    constructor(
      private fb: FormBuilder,
      private router: Router,
      private authService: AuthService,
      private cdr: ChangeDetectorRef
    ) {
        this.changeForm = this.fb.group({
            newPassword: ["", [Validators.required, Validators.minLength(8)]],
            confirmPassword: ["", [Validators.required]],
        }, { validators: passwordsMatch });
    }

    onSubmit() {
        if (this.changeForm.invalid) return;

        const userId = this.authService.getUserId();
        if (!userId) {
            this.router.navigate(['/auth/login']);
            return;
        }
        this.loading = true;
        this.errorMessage = '';

        const newPassword = this.changeForm.value.newPassword;
        this.authService.changePassword(userId, newPassword).subscribe({
            next: () => {
                const u = this.authService.currentUser();
                if (u) this.authService.currentUser.set({ ...u, mustChangePassword: false });
                this.loading = false;
                this.success = true;
                this.cdr.detectChanges();
                setTimeout(() => this.router.navigate(['/app/dashboard']), 2000);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message ?? 'Something went wrong. Please try again.';
                this.cdr.detectChanges();
            }
        });
    }
}
