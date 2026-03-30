import { Component } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
    selector: "app-forgot-password",
    standalone: true,
    imports: [RouterModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, RouterModule],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <mat-card class="bg-light-gradient mb-3 mb-lg-4">
                    <mat-card-content class="p-4 p-lg-5">
                        <div class="login-header mb-4">
                            <h1 class="mb-1">Reset Password</h1>
                            <p class="text-secondary">Enter your email to receive reset instructions</p>
                        </div>
                        <br />
                        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="forgot-form">
                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Email</mat-label>
                                <input matInput formControlName="email" type="email" placeholder="Enter your email" />
                                <mat-icon matSuffix>email</mat-icon>
                            </mat-form-field>

                            <button matButton="filled" color="primary" type="submit" class="w-100" [disabled]="forgotForm.invalid">Send Reset Link</button>
                        </form>
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

    constructor(private fb: FormBuilder, private router: Router) {
        this.forgotForm = this.fb.group({
            email: ["", [Validators.required, Validators.email]],
        });
    }

    onSubmit() {
        if (this.forgotForm.valid) {
            const email = this.forgotForm.value.email;
            // Pass the email to change-password page via navigation state
            this.router.navigate(["/auth/change-password"], {
                state: { email }
            });
        }
    }
}
