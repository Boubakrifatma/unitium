import { Component, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { NgIf, NgClass } from "@angular/common";
import { PasswordStrengthComponent } from "../../../components/password-strength/password-strength.component";

@Component({
    selector: "app-signup",
    standalone: true,
    imports: [MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatProgressBarModule, ReactiveFormsModule, RouterModule, PasswordStrengthComponent],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <mat-card class="bg-light-gradient ">
                    <mat-card-content class="p-4 p-lg-5">
                        <div class="login-header mb-4">
                            <h1 class="mb-1">Create Account</h1>
                            <h3 class="text-secondary">Join us today</h3>
                        </div>

                        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="signup-form mb-3 mb-lg-4">
                            <div class="row">
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100">
                                        <mat-label>First Name</mat-label>
                                        <input matInput formControlName="firstName" placeholder="John" />
                                    </mat-form-field>
                                </div>
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100">
                                        <mat-label>Last Name</mat-label>
                                        <input matInput formControlName="lastName" placeholder="Doe" />
                                    </mat-form-field>
                                </div>
                            </div>

                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Email</mat-label>
                                <input matInput formControlName="email" type="email" placeholder="john@example.com" />
                                <mat-icon matSuffix>email</mat-icon>
                            </mat-form-field>

                            <app-password-strength class="w-100"></app-password-strength>

                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Confirm Password</mat-label>
                                <input matInput formControlName="confirmPassword" [type]="hideConfirmPassword ? 'password' : 'text'" placeholder="Confirm your password" />
                                <button matIconButton matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button">
                                    <mat-icon class="material-icons-outlined">{{ hideConfirmPassword ? "visibility_off" : "visibility" }}</mat-icon>
                                </button>
                            </mat-form-field>

                            <button matButton="filled" color="primary" type="submit" class="w-100" [disabled]="signupForm.invalid">Create Account</button>
                        </form>
                        <br />
                        <div class="row gx-3 z-index-1 position-relative">
                            <div class="col">
                                <p>
                                    Already have an account? <br />
                                    Do sign in now
                                </p>
                            </div>
                            <div class="col-auto">
                                <a matButton routerLink="/auth/login">Sign In <mat-icon class="material-icons-outlined" iconPositionEnd>arrow_forward</mat-icon></a>
                            </div>
                        </div>
                    </mat-card-content>
                </mat-card>
            </div>
        </div>
    `,
    styles: [``],
})
export class SignupComponent implements OnInit {
    signupForm: FormGroup;
    hidePassword = true;
    hideConfirmPassword = true;

    hasMinLength = false;
    hasUppercase = false;
    hasLowercase = false;
    hasNumber = false;
    hasSpecialChar = false;

    constructor(private fb: FormBuilder, private router: Router) {
        this.signupForm = this.fb.group({
            firstName: ["", [Validators.required]],
            lastName: ["", [Validators.required]],
            email: ["", [Validators.required, Validators.email]],
            confirmPassword: ["", [Validators.required]],
        });
    }

    ngOnInit() {}

    onSubmit() {
        if (this.signupForm.valid) {
            this.router.navigate(["/auth/signup-success"]);
        }
    }
}
