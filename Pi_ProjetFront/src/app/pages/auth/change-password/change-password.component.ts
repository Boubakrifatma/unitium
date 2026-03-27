import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
    selector: "app-change-password",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, RouterModule],
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

                        <!-- Success state -->
                        <div *ngIf="success" class="text-center py-3">
                            <mat-icon style="font-size:48px;width:48px;height:48px;color:#22c55e">check_circle</mat-icon>
                            <h3 class="mt-2">Password updated!</h3>
                            <p class="text-secondary">Redirecting to Sign In…</p>
                        </div>

                        <form *ngIf="!success" [formGroup]="changeForm" (ngSubmit)="onSubmit()" class="change-form">

                            <!-- New Password -->
                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>New Password</mat-label>
                                <input matInput formControlName="newPassword"
                                       [type]="hideNewPassword ? 'password' : 'text'"
                                       placeholder="At least 8 characters" />
                                <button matIconButton matSuffix (click)="hideNewPassword = !hideNewPassword" type="button">
                                    <mat-icon class="material-icons-outlined">{{ hideNewPassword ? "visibility_off" : "visibility" }}</mat-icon>
                                </button>
                                <mat-error *ngIf="changeForm.get('newPassword')?.hasError('required')">Password is required</mat-error>
                                <mat-error *ngIf="changeForm.get('newPassword')?.hasError('minlength')">Minimum 8 characters</mat-error>
                                <mat-error *ngIf="changeForm.get('newPassword')?.hasError('pattern')">Must include uppercase, lowercase &amp; number</mat-error>
                            </mat-form-field>

                            <!-- Confirm Password -->
                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Confirm New Password</mat-label>
                                <input matInput formControlName="confirmPassword"
                                       [type]="hideConfirmPassword ? 'password' : 'text'"
                                       placeholder="Confirm new password" />
                                <button matIconButton matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button">
                                    <mat-icon class="material-icons-outlined">{{ hideConfirmPassword ? "visibility_off" : "visibility" }}</mat-icon>
                                </button>
                                <mat-error *ngIf="changeForm.hasError('mismatch') && changeForm.get('confirmPassword')?.touched">
                                    Passwords do not match
                                </mat-error>
                            </mat-form-field>

                            <!-- Error message -->
                            <div *ngIf="errorMessage" style="color:#ef4444;font-size:13px;margin-bottom:12px">
                                {{ errorMessage }}
                            </div>

                            <button matButton="filled" color="primary" type="submit" class="w-100" [disabled]="changeForm.invalid || loading">
                                {{ loading ? 'Saving…' : 'Update Password' }}
                            </button>
                        </form>
                    </mat-card-content>
                </mat-card>
                <div class="text-center">
                    <p class="text-secondary mb-1">Do you remember your password?</p>
                    <button matButton color="primary" routerLink="/auth/login" class="continue-button">
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon>Back to Sign In
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class ChangePasswordComponent implements OnInit {
    changeForm: FormGroup;
    hideNewPassword = true;
    hideConfirmPassword = true;
    loading = false;
    success = false;
    errorMessage = '';

    // Email received from forgot-password via navigation state
    private email = '';

    constructor(private fb: FormBuilder, private router: Router) {
        this.changeForm = this.fb.group({
            newPassword: ["", [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
            ]],
            confirmPassword: ["", [Validators.required]],
        }, { validators: passwordsMatch });
    }

    ngOnInit() {
        // Receive email from forgot-password page (passed via navigation state)
        const st = history.state;
        if (st?.email) {
            this.email = st.email;
        }
    }

    onSubmit() {
        if (this.changeForm.invalid) {
            this.changeForm.markAllAsTouched();
            return;
        }
        this.loading = true;
        this.errorMessage = '';

        const newPassword = this.changeForm.value.newPassword;

        setTimeout(() => {
            try {
                // ── Update password in cmp_first_login_users if this email is there ──
                const raw = localStorage.getItem('cmp_first_login_users');
                if (raw) {
                    const map = JSON.parse(raw);
                    if (map[this.email]) {
                        // Update temp password to the new one and clear mustChange flag
                        delete map[this.email];
                        localStorage.setItem('cmp_first_login_users', JSON.stringify(map));
                    }
                }

                // ── Save new password so login works ──
                // Store as a "real" user override: email -> newPassword
                const overridesRaw = localStorage.getItem('cmp_password_overrides') ?? '{}';
                const overrides = JSON.parse(overridesRaw);
                overrides[this.email] = newPassword;
                localStorage.setItem('cmp_password_overrides', JSON.stringify(overrides));

            } catch (e) {
                this.errorMessage = 'Something went wrong. Please try again.';
                this.loading = false;
                return;
            }

            this.loading = false;
            this.success = true;
            setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        }, 1000);
    }
}
