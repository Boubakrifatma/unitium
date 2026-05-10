import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDividerModule } from "@angular/material/divider";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";

@Component({
    selector: "app-login",
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatInputModule, MatCheckboxModule,
        MatButtonModule, MatIconModule, MatFormFieldModule, MatDividerModule,
        ReactiveFormsModule, RouterModule
    ],
    template: `
        <div class="login-page">
            <div class="login-box">

                <!-- Header -->
                <div class="login-head">
                    <div class="login-avatar">
                        <mat-icon class="material-icons-outlined">lock</mat-icon>
                    </div>
                    <h2>Sign in to Unitum</h2>
                    <p>Welcome back — enter your credentials to continue</p>
                </div>

                <!-- Error -->
                <div class="login-error" *ngIf="errorMessage">
                    <mat-icon>error_outline</mat-icon>
                    {{ errorMessage }}
                </div>

                <!-- Form -->
                <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                    <mat-form-field appearance="outline" class="w-100 mb-1">
                        <mat-label>Email address</mat-label>
                        <input matInput formControlName="email" type="email" autocomplete="email" />
                        <mat-icon matSuffix class="material-icons-outlined">mail</mat-icon>
                        <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
                        <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Enter a valid email</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-100 mb-1">
                        <mat-label>Password</mat-label>
                        <input matInput formControlName="password"
                               [type]="hidePassword ? 'password' : 'text'"
                               autocomplete="current-password" />
                        <button matIconButton matSuffix type="button" (click)="hidePassword = !hidePassword">
                            <mat-icon class="material-icons-outlined">{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                        </button>
                        <mat-error>Password must be at least 6 characters</mat-error>
                    </mat-form-field>

                    <div class="login-options">
                        <mat-checkbox color="primary">Remember me</mat-checkbox>
                        <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
                    </div>

                    <button matButton="filled" color="primary" type="submit"
                            class="w-100 signin-btn"
                            [disabled]="loginForm.invalid || loading">
                        <mat-icon *ngIf="!loading" class="material-icons-outlined">login</mat-icon>
                        <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
                    </button>
                </form>

                <mat-divider class="my-3"></mat-divider>

                <!-- Quick access -->
                <p class="quick-label">Quick access — demo accounts</p>
                <div class="account-list">
                    <div class="account-item" *ngFor="let a of testAccounts" (click)="fillAccount(a)">
                        <div class="account-dot" [ngClass]="'dot-' + getRoleColor(a.role)"></div>
                        <div class="account-info">
                            <span class="account-email">{{ a.email }}</span>
                            <span class="account-role">{{ a.role }}</span>
                        </div>
                        <mat-icon class="account-arrow">chevron_right</mat-icon>
                    </div>
                </div>

                <p class="signup-line">
                    Don't have an account? <a routerLink="/auth/signup">Sign up free</a>
                </p>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; height: 100%; }

        .login-page {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: var(--min-height, 100vh);
            padding: 24px 16px;
        }

        .login-box {
            width: 100%;
            max-width: 420px;
        }

        /* Header */
        .login-head { text-align: center; margin-bottom: 28px; }
        .login-avatar {
            width: 52px; height: 52px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px;
            box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }
        .login-avatar mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
        .login-head h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.3px; }
        .login-head p { color: var(--bs-secondary-color, #6c757d); font-size: 14px; margin: 0; }

        /* Error */
        .login-error {
            display: flex; align-items: center; gap: 8px;
            background: #fef2f2; border: 1px solid #fecaca;
            color: #dc2626; border-radius: 8px;
            padding: 10px 14px; font-size: 13px;
            margin-bottom: 16px;
        }
        .login-error mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

        /* Options row */
        .login-options {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 20px;
        }
        .forgot-link { font-size: 13px; color: #6366f1; text-decoration: none; font-weight: 500; }
        .forgot-link:hover { text-decoration: underline; }

        /* Sign in button */
        .signin-btn {
            height: 44px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            letter-spacing: 0.01em !important;
            border-radius: 10px !important;
            gap: 6px;
        }

        /* Quick access */
        .quick-label {
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.08em; color: #9ca3af;
            text-align: center; margin-bottom: 10px;
        }
        .account-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
        .account-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 12px; border-radius: 10px;
            border: 1px solid var(--bs-border-color, #e5e7eb);
            cursor: pointer; transition: all 0.15s ease;
            background: var(--bs-body-bg, #fff);
        }
        .account-item:hover {
            border-color: #6366f1;
            background: var(--bs-light, #f8f9fa);
            transform: translateX(3px);
        }
        .account-dot {
            width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .dot-red    { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-blue   { background: #3b82f6; }
        .dot-green  { background: #10b981; }
        .account-info { flex: 1; }
        .account-email { display: block; font-size: 13px; font-weight: 500; }
        .account-role  { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .account-arrow { color: #d1d5db !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

        /* Signup line */
        .signup-line { text-align: center; font-size: 13px; color: #6b7280; margin: 0; }
        .signup-line a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .signup-line a:hover { text-decoration: underline; }
    `],
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    hidePassword = true;
    loading = false;
    errorMessage = '';

    testAccounts = [
        { email: 'superadmin@cmp.com', password: 'superadmin123', role: 'SUPER_ADMIN' },
        { email: 'admin@test.com',     password: 'admin123',      role: 'ADMIN'       },
        { email: 'manager@test.com',   password: 'manager123',    role: 'MANAGER'        },
        { email: 'po@test.com',        password: 'productowner123', role: 'PRODUCT_OWNER'  },
        { email: 'tutor@test.com',     password: 'tutor123',      role: 'TUTOR'          },
        { email: 'student@test.com',   password: 'student123',    role: 'STUDENT'        },
        { email: 'viewer@test.com',    password: 'viewer123',     role: 'VIEWER'         },
        { email: 'employee@test.com',  password: 'employee123',   role: 'EMPLOYEE'       },
    ];

    constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
        this.loginForm = this.fb.group({
            email:    ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
        });
    }

    ngOnInit() {}

    fillAccount(a: { email: string; password: string }): void {
        this.loginForm.patchValue({ email: a.email, password: a.password });
    }

    getRoleColor(role: string): string {
        const map: Record<string, string> = {
            SUPER_ADMIN: 'red', ADMIN: 'yellow', MANAGER: 'blue', TUTOR: 'green', EMPLOYEE: 'green'
        };
        return map[role] ?? 'blue';
    }

    onSubmit() {
        if (this.loginForm.invalid) return;
        this.loading = true;
        this.errorMessage = '';
        const { email, password } = this.loginForm.value;
        this.authService.login({ email, password }).subscribe({
            next: () => {
                const role = this.authService.currentUser()?.role;
                const redirectMap: Record<string, string> = {
                    SUPER_ADMIN: '/app/super-admin',
                    PRODUCT_OWNER: '/app/po',
                };
                const redirect = redirectMap[role ?? ''] ?? '/app/dashboard';
                this.router.navigate([redirect]);
            },
            error: (err) => {
                this.errorMessage = err.error?.message ?? 'Invalid email or password.';
                this.loading = false;
            }
        });
    }
}
