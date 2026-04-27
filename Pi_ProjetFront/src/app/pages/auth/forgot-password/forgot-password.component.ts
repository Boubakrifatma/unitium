import { Component, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";

@Component({
    selector: "app-forgot-password",
    standalone: true,
    imports: [CommonModule, RouterModule, MatIconModule, ReactiveFormsModule],
    template: `
    <div class="auth-root">

      <!-- ══ LEFT — Brand Panel ══════════════════════════════════════ -->
      <div class="brand-panel">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="brand-inner">
          <div class="brand-logo">
            <div class="brand-icon"><mat-icon>hub</mat-icon></div>
            <span class="brand-name">Unitum</span>
          </div>
          <div class="brand-hero">
            <h1>Forgot your<br>password?</h1>
            <p>No worries. Enter your email and we'll<br>send you a secure reset link.</p>
          </div>
          <div class="brand-features">
            <div class="feat">
              <div class="feat-icon">🔒</div>
              <div class="feat-text">
                <strong>Secure reset link</strong>
                <span>Expires in 30 minutes, one-time use</span>
              </div>
            </div>
            <div class="feat">
              <div class="feat-icon">📧</div>
              <div class="feat-text">
                <strong>Sent to your inbox</strong>
                <span>Check spam if you don't see it</span>
              </div>
            </div>
          </div>
          <div class="brand-footer"><span>© 2025 Unitum · Built with care</span></div>
        </div>
      </div>

      <!-- ══ RIGHT — Form Panel ══════════════════════════════════════ -->
      <div class="form-panel">
        <div class="form-inner">

          <button class="back-home" (click)="router.navigate(['/auth/login'])">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to login</span>
          </button>

          <!-- ── SUCCESS STATE ─────────────────────────────────────── -->
          <ng-container *ngIf="sent">
            <div class="success-box">
              <div class="success-icon">📬</div>
              <h2>Check your inbox</h2>
              <p>We've sent a password reset link to <strong>{{ sentEmail }}</strong>.<br>It expires in 30 minutes.</p>
              <button class="signin-btn" (click)="router.navigate(['/auth/login'])">
                <mat-icon>login</mat-icon>
                <span>Back to Sign In</span>
              </button>
            </div>
          </ng-container>

          <!-- ── FORM STATE ─────────────────────────────────────────── -->
          <ng-container *ngIf="!sent">
            <div class="form-header">
              <div class="header-icon">🔑</div>
              <h2>Reset Password</h2>
              <p>Enter your account email and we'll send you a link to reset your password.</p>
            </div>

            <!-- Error alert -->
            <div class="alert alert-error" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
              <div class="field-group">
                <label>Email address</label>
                <div class="input-wrap" [class.error]="forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched">
                  <mat-icon class="input-icon">mail_outline</mat-icon>
                  <input formControlName="email" type="email" placeholder="you@example.com" autocomplete="email" />
                </div>
                <p class="field-error" *ngIf="forgotForm.get('email')?.hasError('email') && forgotForm.get('email')?.touched">
                  Please enter a valid email address.
                </p>
              </div>

              <button type="submit" class="signin-btn" [disabled]="forgotForm.invalid || loading">
                <span class="btn-spinner" *ngIf="loading"></span>
                <mat-icon *ngIf="!loading">send</mat-icon>
                <span>{{ loading ? 'Sending…' : 'Send Reset Link' }}</span>
              </button>
            </form>
          </ng-container>

        </div>
      </div>
    </div>
    `,
    styles: [`
      :host { display: block; height: 100%; }

      .auth-root {
        display: flex;
        min-height: 100vh;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      /* ── Brand Panel ── */
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
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.55;
        animation: drift 10s ease-in-out infinite alternate;
      }
      .orb-1 { width:420px;height:420px;background:radial-gradient(circle,#6366f1,#4338ca);top:-80px;left:-100px;animation-duration:12s; }
      .orb-2 { width:340px;height:340px;background:radial-gradient(circle,#a855f7,#7c3aed);bottom:-60px;right:-80px;animation-duration:9s;animation-delay:-4s; }
      .orb-3 { width:260px;height:260px;background:radial-gradient(circle,#ec4899,#be185d);top:45%;left:55%;animation-duration:14s;animation-delay:-7s; }
      @keyframes drift {
        0%   { transform: translate(0,0) scale(1); }
        50%  { transform: translate(30px,-20px) scale(1.05); }
        100% { transform: translate(-20px,30px) scale(0.97); }
      }
      .brand-inner { position:relative;z-index:2;padding:48px;max-width:480px;width:100%; }
      .brand-logo { display:flex;align-items:center;gap:12px;margin-bottom:56px; }
      .brand-icon { width:40px;height:40px;background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.4);border-radius:10px;display:flex;align-items:center;justify-content:center; }
      .brand-icon mat-icon { color:#a5b4fc;font-size:20px;width:20px;height:20px; }
      .brand-name { color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px; }
      .brand-hero h1 { color:#fff;font-size:38px;font-weight:800;line-height:1.18;letter-spacing:-1px;margin:0 0 16px; }
      .brand-hero p  { color:rgba(255,255,255,0.55);font-size:16px;line-height:1.6;margin:0 0 48px; }
      .brand-features { display:flex;flex-direction:column;gap:20px;margin-bottom:56px; }
      .feat { display:flex;align-items:flex-start;gap:14px; }
      .feat-icon { width:38px;height:38px;flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px; }
      .feat-text strong { display:block;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;margin-bottom:2px; }
      .feat-text span   { color:rgba(255,255,255,0.4);font-size:13px; }
      .brand-footer { color:rgba(255,255,255,0.2);font-size:12px; }

      /* ── Form Panel ── */
      .form-panel {
        width: 48%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
      }
      .form-inner { width:100%;max-width:420px;padding:48px 40px; }

      .back-home {
        display:inline-flex;align-items:center;gap:6px;
        background:none;border:none;cursor:pointer;
        color:#9ca3af;font-size:13px;font-weight:500;
        padding:0;margin-bottom:36px;transition:color 0.15s;
      }
      .back-home:hover { color:#6366f1; }
      .back-home mat-icon { font-size:16px;width:16px;height:16px; }

      .form-header { margin-bottom:28px; }
      .header-icon { font-size:36px;margin-bottom:12px; }
      .form-header h2 { font-size:26px;font-weight:800;color:#0f172a;margin:0 0 6px;letter-spacing:-0.5px; }
      .form-header p  { color:#64748b;font-size:14px;margin:0;line-height:1.6; }

      .alert {
        display:flex;align-items:center;gap:10px;
        border-radius:10px;padding:12px 14px;
        font-size:13px;font-weight:500;margin-bottom:16px;
      }
      .alert mat-icon { font-size:18px;width:18px;height:18px;flex-shrink:0; }
      .alert-error { background:#fef2f2;border:1px solid #fecaca;color:#dc2626; }
      .alert-error mat-icon { color:#dc2626; }

      .field-group { display:flex;flex-direction:column;gap:6px;margin-bottom:16px; }
      label { font-size:13px;font-weight:600;color:#374151; }
      .input-wrap {
        display:flex;align-items:center;
        border:1.5px solid #e2e8f0;border-radius:10px;
        background:#fff;overflow:hidden;
        transition:border-color 0.18s,box-shadow 0.18s;
      }
      .input-wrap:focus-within { border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
      .input-wrap.error { border-color:#f87171; }
      .input-icon { color:#94a3b8;font-size:18px;width:18px;height:18px;margin:0 12px;flex-shrink:0; }
      .input-wrap input {
        flex:1;border:none;outline:none;background:transparent;
        padding:12px 12px 12px 0;font-size:14px;color:#0f172a;
      }
      .input-wrap input::placeholder { color:#cbd5e1; }
      .field-error { font-size:12px;color:#dc2626;margin:2px 0 0; }

      .signin-btn {
        width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
        padding:13px 20px;border:none;border-radius:11px;
        background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);
        color:#fff;font-size:15px;font-weight:600;cursor:pointer;
        transition:all 0.2s ease;box-shadow:0 4px 14px rgba(99,102,241,0.35);
        margin-top:4px;
      }
      .signin-btn:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.45); }
      .signin-btn:disabled { opacity:0.6;cursor:not-allowed;box-shadow:none; }
      .signin-btn mat-icon { font-size:18px;width:18px;height:18px; }

      .btn-spinner {
        width:16px;height:16px;border-radius:50%;
        border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;
        animation:spin 0.7s linear infinite;flex-shrink:0;
      }
      @keyframes spin { to { transform:rotate(360deg); } }

      /* ── Success state ── */
      .success-box {
        text-align:center;
        padding:24px 0;
      }
      .success-icon { font-size:52px;margin-bottom:16px; }
      .success-box h2 { font-size:26px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.5px; }
      .success-box p  { color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px; }
      .success-box .signin-btn { margin-top:0; }
    `],
})
export class ForgotPasswordComponent {
    forgotForm: FormGroup;
    loading = false;
    errorMessage = '';
    sent = false;
    sentEmail = '';

    constructor(
        private fb: FormBuilder,
        public router: Router,
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) {
        this.forgotForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
        });
    }

    onSubmit() {
        if (this.forgotForm.invalid) return;
        this.loading = true;
        this.errorMessage = '';

        const email = this.forgotForm.value.email.trim().toLowerCase();

        this.http.post('http://localhost:8084/api/auth/forgot-password', { email }).subscribe({
            next: () => {
                this.loading = false;
                this.sent = true;
                this.sentEmail = email;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message ?? 'Something went wrong. Please try again.';
                this.cdr.detectChanges();
            }
        });
    }
}
