import { Component, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";

@Component({
    selector: "app-forgot-password",
    standalone: true,
    imports: [CommonModule, RouterModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <mat-card class="bg-light-gradient mb-3 mb-lg-4">
                    <mat-card-content class="p-4 p-lg-5">
                        <div class="login-header mb-4">
                            <h1 class="mb-1">Reset Password</h1>
                            <p class="text-secondary">Enter your email to receive a password reset link</p>
                        </div>
                        <br />

                        @if (success()) {
                            <div class="alert alert-success text-center mb-3 p-3">
                                <mat-icon class="align-middle me-1" style="vertical-align:middle">mark_email_read</mat-icon>
                                Check your inbox! A reset link has been sent to <strong>{{ sentEmail() }}</strong>.<br>
                                <small class="text-secondary d-block mt-1">Click the link in the email to reset your password. It expires in 10 minutes.</small>
                            </div>
                        } @else {
                            @if (errorMessage()) {
                                <div class="alert alert-danger text-center mb-3">{{ errorMessage() }}</div>
                            }
                            <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="forgot-form">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Email</mat-label>
                                    <input matInput formControlName="email" type="email" placeholder="Enter your email" />
                                    <mat-icon matSuffix>email</mat-icon>
                                </mat-form-field>

                                <button matButton="filled" color="primary" type="submit" class="w-100" [disabled]="forgotForm.invalid || loading()">
                                    {{ loading() ? 'Sending...' : 'Send Reset Link' }}
                                </button>
                            </form>
                        }
                    </mat-card-content>
                </mat-card>
                <div class="text-center">
                    <p class="text-secondary mb-1">Do you know your password?</p>
                    <a matButton routerLink="/auth/login" class="link"><mat-icon class="material-icons-outlined">arrow_back</mat-icon>Back to Sign In</a>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class ForgotPasswordComponent {
    forgotForm: FormGroup;
    loading    = signal(false);
    success    = signal(false);
    sentEmail  = signal('');
    errorMessage = signal('');

    constructor(private fb: FormBuilder, private http: HttpClient) {
        this.forgotForm = this.fb.group({
            email: ["", [Validators.required, Validators.email]],
        });
    }

    onSubmit() {
        if (this.forgotForm.invalid) return;
        this.loading.set(true);
        this.errorMessage.set('');
        const email = this.forgotForm.value.email as string;

        // Store flag so magic-callback redirects to change-password after login
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('pendingPasswordReset', 'true');
        }

        this.http.post('http://localhost:8084/api/auth/magic-link', { email }).subscribe({
            next: () => {
                this.loading.set(false);
                this.success.set(true);
                this.sentEmail.set(email);
            },
            error: (err) => {
                this.loading.set(false);
                this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('pendingPasswordReset');
                }
            }
        });
    }
}
