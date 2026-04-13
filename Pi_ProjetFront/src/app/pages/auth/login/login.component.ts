import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDividerModule } from "@angular/material/divider";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";
import { FaceService } from "../../../auth/face.service";
import { FaceCameraComponent } from "../../../components/face-camera/face-camera.component";

@Component({
    selector: "app-login",
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatInputModule,
        MatButtonModule, MatIconModule, MatFormFieldModule, MatDividerModule,
        ReactiveFormsModule, RouterModule, FaceCameraComponent
    ],
    template: `
    <div class="auth-root">

      <!-- ══ LEFT — Brand Panel ══════════════════════════════════════ -->
      <div class="brand-panel">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>

        <div class="brand-inner">
          <div class="brand-logo">
            <div class="brand-icon">
              <mat-icon>hub</mat-icon>
            </div>
            <span class="brand-name">Unitum</span>
          </div>

          <div class="brand-hero">
            <h1>The platform<br>your team deserves.</h1>
            <p>Manage your organization, members,<br>and access — all in one place.</p>
          </div>

          <div class="brand-features">
            <div class="feat">
              <div class="feat-icon">🔐</div>
              <div class="feat-text">
                <strong>Secure by default</strong>
                <span>2FA, Face ID, Magic Link</span>
              </div>
            </div>
            <div class="feat">
              <div class="feat-icon">👥</div>
              <div class="feat-text">
                <strong>Team management</strong>
                <span>Roles, invitations, audit logs</span>
              </div>
            </div>
            <div class="feat">
              <div class="feat-icon">🤖</div>
              <div class="feat-text">
                <strong>AI-powered insights</strong>
                <span>Anomaly detection, activity stats</span>
              </div>
            </div>
          </div>

          <div class="brand-footer">
            <span>© 2025 Unitum · Built with care</span>
          </div>
        </div>
      </div>

      <!-- ══ RIGHT — Form Panel ══════════════════════════════════════ -->
      <div class="form-panel">
        <div class="form-inner">

          <!-- Back to home -->
          <button class="back-home" (click)="goHome()">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to home</span>
          </button>

          <!-- ── STEP : credentials ─────────────────────────────── -->
          <ng-container *ngIf="step === 'credentials'">

            <div class="form-header">
              <h2>Welcome back</h2>
              <p>Sign in to your Unitum account</p>
            </div>

            <!-- Alerts -->
            <div class="alert alert-error" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Tabs -->
            <div class="auth-tabs">
              <button class="tab-btn" [class.active]="loginTab === 'password'" (click)="loginTab = 'password'">
                <mat-icon>lock_outline</mat-icon> Password
              </button>
              <button class="tab-btn" [class.active]="loginTab === 'face'" (click)="loginTab = 'face'">
                <mat-icon>face</mat-icon> Face ID
              </button>
              <button class="tab-btn" [class.active]="loginTab === 'magic'" (click)="loginTab = 'magic'">
                <mat-icon>auto_awesome</mat-icon> Magic Link
              </button>
            </div>

            <!-- Password form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" *ngIf="loginTab === 'password'" class="auth-form">
              <div class="field-group">
                <label>Email address</label>
                <div class="input-wrap" [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
                  <mat-icon class="input-icon">mail_outline</mat-icon>
                  <input formControlName="email" type="email" placeholder="you@example.com" autocomplete="email" />
                </div>
              </div>

              <div class="field-group">
                <div class="field-label-row">
                  <label>Password</label>
                  <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
                </div>
                <div class="input-wrap" [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                  <mat-icon class="input-icon">lock_outline</mat-icon>
                  <input formControlName="password"
                         [type]="hidePassword ? 'password' : 'text'"
                         placeholder="••••••••"
                         autocomplete="current-password" />
                  <button type="button" class="eye-btn" (click)="hidePassword = !hidePassword">
                    <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
              </div>

              <button type="submit" class="signin-btn" [disabled]="loginForm.invalid || loading">
                <span class="btn-spinner" *ngIf="loading"></span>
                <mat-icon *ngIf="!loading">login</mat-icon>
                <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
              </button>
            </form>

            <!-- Face ID -->
            <div *ngIf="loginTab === 'face'" class="face-panel">
              <app-face-camera (descriptor)="onFaceLogin($event)"></app-face-camera>
              <p class="face-error" *ngIf="faceError">{{ faceError }}</p>
            </div>

            <!-- Magic Link -->
            <div *ngIf="loginTab === 'magic'" class="magic-panel">
              <p class="magic-desc">Enter your email and we'll send you a sign-in link — no password needed.</p>
              <div class="field-group">
                <label>Email address</label>
                <div class="input-wrap">
                  <mat-icon class="input-icon">mail_outline</mat-icon>
                  <input [(ngModel)]="magicEmail" type="email" name="magicEmail" placeholder="you@example.com" />
                </div>
              </div>
              <button class="signin-btn" (click)="sendMagicLink()" [disabled]="!magicEmail || magicLoading">
                <span class="btn-spinner" *ngIf="magicLoading"></span>
                <mat-icon *ngIf="!magicLoading">auto_awesome</mat-icon>
                <span>{{ magicLoading ? 'Sending…' : 'Send Magic Link' }}</span>
              </button>
              <div class="magic-sent" *ngIf="magicSent">
                <mat-icon>check_circle</mat-icon>
                <span>Link sent! Check your inbox — expires in 10 minutes.</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="or-divider">
              <span>or</span>
            </div>

            <!-- Google -->
            <button type="button" class="google-btn" (click)="loginWithGoogle()">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <!-- Quick access -->
            <div class="quick-section">
              <p class="quick-label">Demo accounts</p>
              <div class="quick-grid">
                <button class="quick-card" *ngFor="let a of testAccounts" (click)="fillAccount(a)">
                  <div class="quick-dot" [ngClass]="'role-' + getRoleColor(a.role)"></div>
                  <div class="quick-info">
                    <span class="quick-email">{{ a.email }}</span>
                    <span class="quick-role">{{ a.role }}</span>
                  </div>
                  <mat-icon class="quick-arrow">chevron_right</mat-icon>
                </button>
              </div>
            </div>

          </ng-container>

          <!-- ── STEP : 2FA ──────────────────────────────────────── -->
          <ng-container *ngIf="step === 'mfa'">
            <div class="form-header">
              <div class="mfa-badge">🔐</div>
              <h2>Two-Factor Authentication</h2>
              <p>Open <strong>Google Authenticator</strong> and enter the 6-digit code for <strong>PiProjet</strong></p>
            </div>

            <div class="alert alert-error" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <div class="field-group">
              <label>6-digit code</label>
              <div class="input-wrap">
                <mat-icon class="input-icon">pin</mat-icon>
                <input [(ngModel)]="mfaCode" maxlength="6" placeholder="000000"
                       inputmode="numeric" autocomplete="one-time-code" class="otp-input" />
              </div>
              <p class="field-hint">The code refreshes every 30 seconds.</p>
            </div>

            <button class="signin-btn" (click)="onVerify2FA()" [disabled]="mfaCode.length !== 6 || loading">
              <span class="btn-spinner" *ngIf="loading"></span>
              <mat-icon *ngIf="!loading">verified_user</mat-icon>
              <span>{{ loading ? 'Verifying…' : 'Verify Code' }}</span>
            </button>

            <button class="ghost-btn" (click)="backToCredentials()">
              <mat-icon>arrow_back</mat-icon> Back to login
            </button>
          </ng-container>

        </div>
      </div>

    </div>
    `,
    styles: [`
        :host { display: block; height: 100%; }

        /* ── Root layout ───────────────────────────────────────────── */
        .auth-root {
            display: flex;
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ── Brand Panel ───────────────────────────────────────────── */
        .brand-panel {
            position: relative;
            width: 52%;
            background: #06041a;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        @media (max-width: 900px) {
            .brand-panel { display: none; }
            .form-panel  { width: 100%; }
        }

        /* Animated orbs */
        .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.55;
            animation: drift 10s ease-in-out infinite alternate;
        }
        .orb-1 {
            width: 420px; height: 420px;
            background: radial-gradient(circle, #6366f1, #4338ca);
            top: -80px; left: -100px;
            animation-duration: 12s;
        }
        .orb-2 {
            width: 340px; height: 340px;
            background: radial-gradient(circle, #a855f7, #7c3aed);
            bottom: -60px; right: -80px;
            animation-duration: 9s;
            animation-delay: -4s;
        }
        .orb-3 {
            width: 260px; height: 260px;
            background: radial-gradient(circle, #ec4899, #be185d);
            top: 45%; left: 55%;
            animation-duration: 14s;
            animation-delay: -7s;
        }
        @keyframes drift {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(30px, -20px) scale(1.05); }
            100% { transform: translate(-20px, 30px) scale(0.97); }
        }

        /* Brand content */
        .brand-inner {
            position: relative;
            z-index: 2;
            padding: 48px;
            max-width: 480px;
            width: 100%;
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 56px;
        }
        .brand-icon {
            width: 40px; height: 40px;
            background: rgba(99,102,241,0.25);
            border: 1px solid rgba(99,102,241,0.4);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
        }
        .brand-icon mat-icon { color: #a5b4fc; font-size: 20px; width: 20px; height: 20px; }
        .brand-name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }

        .brand-hero h1 {
            color: #fff;
            font-size: 38px;
            font-weight: 800;
            line-height: 1.18;
            letter-spacing: -1px;
            margin: 0 0 16px;
        }
        .brand-hero p {
            color: rgba(255,255,255,0.55);
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 48px;
        }

        .brand-features { display: flex; flex-direction: column; gap: 20px; margin-bottom: 56px; }
        .feat { display: flex; align-items: flex-start; gap: 14px; }
        .feat-icon {
            width: 38px; height: 38px; flex-shrink: 0;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 17px;
        }
        .feat-text strong { display: block; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .feat-text span   { color: rgba(255,255,255,0.4); font-size: 13px; }

        .brand-footer { color: rgba(255,255,255,0.2); font-size: 12px; }

        /* ── Form Panel ────────────────────────────────────────────── */
        .form-panel {
            width: 48%;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
        }

        .form-inner {
            width: 100%;
            max-width: 420px;
            padding: 48px 40px;
        }

        /* Back button */
        .back-home {
            display: inline-flex; align-items: center; gap: 6px;
            background: none; border: none; cursor: pointer;
            color: #9ca3af; font-size: 13px; font-weight: 500;
            padding: 0; margin-bottom: 36px;
            transition: color 0.15s;
        }
        .back-home:hover { color: #6366f1; }
        .back-home mat-icon { font-size: 16px; width: 16px; height: 16px; }

        /* Header */
        .form-header { margin-bottom: 28px; }
        .form-header h2 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.5px; }
        .form-header p  { color: #64748b; font-size: 14px; margin: 0; }
        .mfa-badge { font-size: 36px; margin-bottom: 12px; }

        /* Alerts */
        .alert {
            display: flex; align-items: center; gap: 10px;
            border-radius: 10px; padding: 12px 14px;
            font-size: 13px; font-weight: 500;
            margin-bottom: 16px;
        }
        .alert mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
        .alert-warn  { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .alert-warn mat-icon { color: #f59e0b; }
        .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }

        /* Tabs */
        .auth-tabs {
            display: flex;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 4px;
            gap: 2px;
            margin-bottom: 24px;
        }
        .tab-btn {
            flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
            padding: 9px 6px; border: none; border-radius: 9px;
            background: transparent; cursor: pointer;
            font-size: 13px; font-weight: 500; color: #94a3b8;
            transition: all 0.18s ease;
        }
        .tab-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
        .tab-btn.active {
            background: #fff;
            color: #6366f1;
            box-shadow: 0 1px 6px rgba(0,0,0,0.08);
            font-weight: 600;
        }

        /* Form fields */
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label-row { display: flex; justify-content: space-between; align-items: center; }
        label { font-size: 13px; font-weight: 600; color: #374151; }
        .forgot-link { font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 500; }
        .forgot-link:hover { text-decoration: underline; }
        .field-hint { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }

        .input-wrap {
            display: flex; align-items: center;
            border: 1.5px solid #e2e8f0; border-radius: 10px;
            background: #fff; overflow: hidden;
            transition: border-color 0.18s, box-shadow 0.18s;
        }
        .input-wrap:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .input-wrap.error { border-color: #f87171; }
        .input-icon {
            color: #94a3b8; font-size: 18px; width: 18px; height: 18px;
            margin: 0 12px; flex-shrink: 0;
        }
        .input-wrap input {
            flex: 1; border: none; outline: none; background: transparent;
            padding: 12px 12px 12px 0;
            font-size: 14px; color: #0f172a;
        }
        .input-wrap input::placeholder { color: #cbd5e1; }
        .eye-btn {
            background: none; border: none; cursor: pointer;
            color: #94a3b8; padding: 0 12px;
            display: flex; align-items: center;
        }
        .eye-btn:hover { color: #6366f1; }
        .eye-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
        .otp-input { font-size: 20px !important; font-weight: 700 !important; letter-spacing: 0.4em !important; text-align: center; }

        /* Sign in button */
        .signin-btn {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 13px 20px; border: none; border-radius: 11px;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(99,102,241,0.35);
            margin-top: 4px;
        }
        .signin-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(99,102,241,0.45);
        }
        .signin-btn:active:not(:disabled) { transform: translateY(0); }
        .signin-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        .signin-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

        /* Spinner */
        .btn-spinner {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            animation: spin 0.7s linear infinite;
            flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Ghost button */
        .ghost-btn {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 11px;
            background: transparent; color: #64748b; font-size: 14px; font-weight: 500;
            cursor: pointer; margin-top: 10px; transition: all 0.18s;
        }
        .ghost-btn:hover { border-color: #6366f1; color: #6366f1; background: #f8f7ff; }
        .ghost-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

        /* Divider */
        .or-divider {
            display: flex; align-items: center; gap: 12px;
            color: #cbd5e1; font-size: 13px; font-weight: 500;
            margin: 20px 0;
        }
        .or-divider::before, .or-divider::after {
            content: ''; flex: 1; height: 1px; background: #e2e8f0;
        }

        /* Google button */
        .google-btn {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
            padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 11px;
            background: #fff; font-size: 14px; font-weight: 600; color: #374151;
            cursor: pointer; transition: all 0.18s;
        }
        .google-btn:hover { background: #f8fafc; border-color: #c7d2fe; }

        /* Quick access */
        .quick-section { margin-top: 24px; }
        .quick-label {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: #94a3b8;
            margin-bottom: 10px;
        }
        .quick-grid { display: flex; flex-direction: column; gap: 5px; }
        .quick-card {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: 10px;
            border: 1.5px solid #f1f5f9; background: #fff;
            cursor: pointer; transition: all 0.15s; width: 100%;
        }
        .quick-card:hover { border-color: #c7d2fe; background: #f8f7ff; transform: translateX(2px); }
        .quick-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .role-red    { background: #ef4444; }
        .role-yellow { background: #f59e0b; }
        .role-blue   { background: #3b82f6; }
        .role-green  { background: #10b981; }
        .quick-info  { flex: 1; text-align: left; }
        .quick-email { display: block; font-size: 12px; font-weight: 500; color: #374151; }
        .quick-role  { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .quick-arrow { color: #e2e8f0 !important; font-size: 16px !important; width: 16px !important; height: 16px !important; }

        /* Magic sent */
        .magic-panel { display: flex; flex-direction: column; gap: 16px; }
        .magic-desc  { color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; }
        .magic-sent {
            display: flex; align-items: center; gap: 8px;
            background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
            padding: 12px 14px; color: #065f46; font-size: 13px;
        }
        .magic-sent mat-icon { color: #10b981; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

        /* Face panel */
        .face-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
        .face-error { color: #ef4444; font-size: 13px; text-align: center; }
    `],
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    hidePassword = true;
    loading = false;
    errorMessage = '';
    loginTab: 'password' | 'face' | 'magic' = 'password';
    faceError = '';

    // Magic Link
    magicEmail = '';
    magicLoading = false;
    magicSent = false;

    // ── 2FA ──────────────────────────────────────────────────────────────────
    step: 'credentials' | 'mfa' = 'credentials';
    mfaCode = '';
    pendingUserId: number | null = null;

    testAccounts = [
        { email: 'superadmin@cmp.com',         password: 'superadmin123',   role: 'SUPER_ADMIN'   },
        { email: 'evenixgroup@gmail.com',       password: 'Esprit1234',      role: 'ADMIN'         },
        { email: 'yosra.ben.alii17@gmail.com',  password: 'Yosra123.',       role: 'ADMIN'         },
        { email: 'manager@test.com',            password: 'manager123',      role: 'MANAGER'       },
        { email: 'po@test.com',                 password: 'productowner123', role: 'PRODUCT_OWNER' },
        { email: 'tutor@test.com',              password: 'tutor123',        role: 'TUTOR'         },
        { email: 'student@test.com',            password: 'student123',      role: 'STUDENT'       },
        { email: 'viewer@test.com',             password: 'viewer123',       role: 'VIEWER'        },
        { email: 'employee@test.com',           password: 'employee123',     role: 'EMPLOYEE'      },
    ];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private router: Router,
        private authService: AuthService,
        private faceService: FaceService,
        private cdr: ChangeDetectorRef
    ) {
        this.loginForm = this.fb.group({
            email:    ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
        });
    }

    ngOnInit() {}

    fillAccount(a: { email: string; password: string }): void {
        this.loginForm.patchValue({ email: a.email, password: a.password });
        this.loginTab = 'password';
    }

    getRoleColor(role: string): string {
        const map: Record<string, string> = {
            SUPER_ADMIN: 'red', ADMIN: 'yellow', MANAGER: 'blue', TUTOR: 'green', EMPLOYEE: 'green'
        };
        return map[role] ?? 'blue';
    }

    goHome(): void {
        this.router.navigate(['/web/website']);
    }

    loginWithGoogle(): void {
        window.location.href = 'http://localhost:8084/oauth2/authorization/google';
    }

    sendMagicLink(): void {
        if (!this.magicEmail) return;
        this.magicLoading = true;
        this.magicSent = false;
        this.http.post('http://localhost:8084/api/auth/magic-link', { email: this.magicEmail })
            .subscribe({
                next: () => { this.magicLoading = false; this.magicSent = true; },
                error: () => { this.magicLoading = false; this.magicSent = true; }
            });
    }

    onSubmit() {
        if (this.loginForm.invalid) return;
        this.loading = true;
        this.errorMessage = '';

        const { email, password } = this.loginForm.value;

        this.authService.login({ email, password }).subscribe({
            next: (res) => {
                this.loading = false;

                if (res.mfaRequired) {
                    this.pendingUserId = res.userId;
                    this.step = 'mfa';
                    this.cdr.detectChanges();
                    return;
                }

                if (res.mustChangePassword) {
                    this.router.navigate(['/auth/first-login'], {
                        state: { email, userId: res.id }
                    });
                    return;
                }

                const redirectMap: Record<string, string> = {
                    SUPER_ADMIN: '/app/super-admin',
                    PRODUCT_OWNER: '/app/po',
                };
                const redirect = redirectMap[res.role] ?? '/app/dashboard';
                this.router.navigate([redirect]);
            },
            error: (err) => {
                this.errorMessage = err.error?.message ?? 'Invalid email or password.';
                this.loading = false;
            }
        });
    }

    onVerify2FA(): void {
        if (!this.pendingUserId || this.mfaCode.length !== 6) return;
        this.loading = true;
        this.errorMessage = '';

        this.authService.verify2FA(this.pendingUserId, this.mfaCode).subscribe({
            next: (res) => {
                this.loading = false;
                this.cdr.detectChanges();
                if (res.mustChangePassword) {
                    this.router.navigate(['/auth/first-login'], {
                        state: { userId: res.id }
                    });
                    return;
                }
                const redirectMap: Record<string, string> = {
                    SUPER_ADMIN: '/app/super-admin',
                    PRODUCT_OWNER: '/app/po',
                };
                this.router.navigate([redirectMap[res.role] ?? '/app/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message ?? 'Invalid code. Please try again.';
                this.mfaCode = '';
                this.cdr.detectChanges();
            }
        });
    }

    backToCredentials(): void {
        this.step = 'credentials';
        this.pendingUserId = null;
        this.mfaCode = '';
        this.errorMessage = '';
    }

    onFaceLogin(descriptor: number[]): void {
        this.faceError = '';
        this.faceService.faceLogin(descriptor).subscribe({
            next: (res: any) => {
                this.authService['setToken'](res.token);
                this.authService['setUserId'](res.id);
                this.authService.currentUser.set({
                    id: res.id,
                    email: res.email,
                    fullName: res.fullName,
                    role: res.role,
                    mustChangePassword: res.mustChangePassword,
                    avatarUrl: res.avatarUrl ?? null
                });

                const redirectMap: Record<string, string> = {
                    SUPER_ADMIN: '/app/super-admin',
                    PRODUCT_OWNER: '/app/po',
                };
                const redirect = redirectMap[res.role] ?? '/app/dashboard';
                this.router.navigate([redirect]);
            },
            error: () => {
                this.faceError = 'Face not recognized. Please try again or use password.';
            }
        });
    }
}
