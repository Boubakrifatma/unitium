import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw      = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-first-login',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="fl-page">
      <div class="fl-box">

        <!-- Top banner -->
        <div class="fl-banner">
          <div class="fl-icon-wrap">
            <mat-icon>key</mat-icon>
          </div>
          <h2>Set Your Password</h2>
          <p>Your account is ready! Create a new password to get started.</p>
        </div>

        <!-- Welcome notice -->
        <div class="fl-notice">
          <mat-icon>verified</mat-icon>
          <div>
            <p class="fl-notice-title">Welcome to Unitum</p>
            <p class="fl-notice-sub">
              Signing in as <strong>{{ email }}</strong>. Please set a new secure password to continue.
            </p>
          </div>
        </div>

        <!-- Error banner -->
        <div class="fl-error" *ngIf="errorMessage">
          <mat-icon>error_outline</mat-icon>
          {{ errorMessage }}
        </div>

        <!-- Success state -->
        <div class="fl-success" *ngIf="success">
          <mat-icon>check_circle</mat-icon>
          <h3>Password updated!</h3>
          <p>Your account is now fully active. Redirecting to login…</p>
        </div>

        <!-- Form -->
        <form *ngIf="!success" [formGroup]="form" (ngSubmit)="submit()">

          <!-- New password -->
          <div class="fl-field">
            <label class="fl-label">New Password</label>
            <div class="fl-input-wrap">
              <input class="fl-input" formControlName="newPassword"
                [type]="hideNew ? 'password' : 'text'"
                placeholder="At least 8 characters">
              <button type="button" class="fl-eye" (click)="hideNew = !hideNew">
                <mat-icon>{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            <span class="fl-err" *ngIf="f['newPassword'].invalid && f['newPassword'].touched">
              <span *ngIf="f['newPassword'].hasError('required')">Password is required</span>
              <span *ngIf="f['newPassword'].hasError('minlength')">Minimum 8 characters</span>
              <span *ngIf="f['newPassword'].hasError('pattern')">Must include uppercase, lowercase &amp; number</span>
            </span>
            <!-- Strength bar -->
            <div class="strength-bar" *ngIf="f['newPassword'].value">
              <div class="strength-track">
                <div class="strength-fill"
                  [style.width.%]="strengthPct()"
                  [style.background]="strengthColor()"></div>
              </div>
              <span class="strength-label" [style.color]="strengthColor()">{{ strengthLabel() }}</span>
            </div>
          </div>

          <!-- Confirm password -->
          <div class="fl-field">
            <label class="fl-label">Confirm Password</label>
            <div class="fl-input-wrap">
              <input class="fl-input" formControlName="confirmPassword"
                [type]="hideConfirm ? 'password' : 'text'"
                placeholder="Repeat your new password">
              <button type="button" class="fl-eye" (click)="hideConfirm = !hideConfirm">
                <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            <span class="fl-err" *ngIf="form.hasError('mismatch') && f['confirmPassword'].touched">
              Passwords do not match
            </span>
          </div>

          <!-- Rules -->
          <div class="fl-rules">
            <p class="fl-rules-title">Password must contain:</p>
            <div class="fl-rule" [class.ok]="hasUppercase()">
              <mat-icon>{{ hasUppercase() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>At least one uppercase letter</span>
            </div>
            <div class="fl-rule" [class.ok]="hasLowercase()">
              <mat-icon>{{ hasLowercase() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>At least one lowercase letter</span>
            </div>
            <div class="fl-rule" [class.ok]="hasNumber()">
              <mat-icon>{{ hasNumber() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>At least one number</span>
            </div>
            <div class="fl-rule" [class.ok]="hasLength()">
              <mat-icon>{{ hasLength() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>Minimum 8 characters</span>
            </div>
          </div>

          <button type="submit" class="fl-submit" [disabled]="form.invalid || loading">
            <mat-icon>lock_reset</mat-icon>
            {{ loading ? 'Saving…' : 'Set New Password & Sign In' }}
          </button>
        </form>

      </div>
    </div>
  `,
  styles: [`
    .fl-page {
      display: flex; align-items: center; justify-content: center;
      min-height: var(--min-height, 100vh);
      padding: 24px 16px; background: #f0f4fa;
    }
    .fl-box {
      width: 100%; max-width: 460px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,.10); overflow: hidden;
    }
    .fl-banner {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      padding: 36px 28px 28px; text-align: center; color: #fff;
    }
    .fl-icon-wrap {
      width: 60px; height: 60px; background: rgba(255,255,255,.18);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .fl-icon-wrap mat-icon { font-size: 28px; width: 28px; height: 28px; color: #fff; }
    .fl-banner h2 { font-size: 1.4rem; font-weight: 800; margin: 0 0 6px; }
    .fl-banner p { font-size: .88rem; opacity: .85; margin: 0; }
    .fl-notice {
      display: flex; align-items: flex-start; gap: 12px;
      background: #ede9fe; padding: 16px 24px; font-size: .84rem; color: #4c1d95;
    }
    .fl-notice mat-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; color: #7c3aed; }
    .fl-notice-title { font-weight: 700; margin-bottom: 2px; }
    .fl-notice-sub { margin: 0; line-height: 1.5; }
    .fl-error {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border-left: 4px solid #ef4444;
      color: #dc2626; padding: 12px 24px; font-size: .84rem;
    }
    .fl-error mat-icon { font-size: 18px; flex-shrink: 0; }
    form { padding: 24px 28px 28px; }
    .fl-field { margin-bottom: 18px; }
    .fl-label {
      display: block; font-size: .8rem; font-weight: 700;
      color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px;
    }
    .fl-input-wrap { position: relative; }
    .fl-input {
      width: 100%; padding: 13px 48px 13px 16px;
      border: 1.5px solid #e2e8f0; border-radius: 12px;
      font-size: .9rem; outline: none; background: #f8fafc;
      color: #1e293b; box-sizing: border-box; transition: border-color .2s;
    }
    .fl-input:focus { border-color: #7c3aed; background: #fff; }
    .fl-input::placeholder { color: #94a3b8; }
    .fl-eye {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0;
      display: flex; align-items: center;
    }
    .fl-eye mat-icon { font-size: 20px; }
    .fl-err { display: block; font-size: .75rem; color: #ef4444; margin-top: 4px; padding-left: 4px; }
    .strength-bar { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .strength-track { flex: 1; height: 5px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
    .strength-fill { height: 100%; border-radius: 10px; transition: width .3s, background .3s; }
    .strength-label { font-size: .72rem; font-weight: 700; white-space: nowrap; }
    .fl-rules { background: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
    .fl-rules-title { font-size: .75rem; font-weight: 700; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .4px; }
    .fl-rule {
      display: flex; align-items: center; gap: 8px;
      font-size: .82rem; color: #94a3b8; margin-bottom: 6px; transition: color .2s;
    }
    .fl-rule mat-icon { font-size: 16px; width: 16px; height: 16px; color: #cbd5e1; transition: color .2s; }
    .fl-rule.ok { color: #1e293b; }
    .fl-rule.ok mat-icon { color: #22c55e; }
    .fl-submit {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff; border: none; border-radius: 12px;
      font-size: .95rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 4px 14px rgba(124,58,237,.35); transition: opacity .2s;
    }
    .fl-submit:disabled { opacity: .55; cursor: not-allowed; }
    .fl-submit mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .fl-success { padding: 48px 28px; text-align: center; }
    .fl-success mat-icon { font-size: 64px; width: 64px; height: 64px; color: #22c55e; display: block; margin: 0 auto 16px; }
    .fl-success h3 { font-size: 1.2rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    .fl-success p { font-size: .88rem; color: #64748b; }
  `]
})
export class FirstLoginComponent implements OnInit {
  email   = '';
  userId  = 0;
  hideNew = true;
  hideConfirm = true;
  loading = false;
  success = false;
  errorMessage = '';

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  get f() { return this.form.controls; }

  ngOnInit() {
    const st = history.state;
    if (st?.email && st?.userId) {
      this.email  = st.email;
      this.userId = st.userId;
    } else {
      // Fallback : essayer depuis le service si déjà connecté
      const user = this.authService.currentUser();
      if (user) {
        this.email  = user.email;
        this.userId = user.id;
      } else {
        this.router.navigate(['/auth/login']);
      }
    }
  }

  private get pw(): string { return this.f['newPassword'].value ?? ''; }
  hasUppercase() { return /[A-Z]/.test(this.pw); }
  hasLowercase() { return /[a-z]/.test(this.pw); }
  hasNumber()    { return /\d/.test(this.pw); }
  hasLength()    { return this.pw.length >= 8; }

  strengthPct(): number {
    let score = 0;
    if (this.hasUppercase()) score++;
    if (this.hasLowercase()) score++;
    if (this.hasNumber())    score++;
    if (this.hasLength())    score++;
    if (this.pw.length >= 12) score++;
    return Math.min(100, score * 20);
  }
  strengthLabel(): string {
    const p = this.strengthPct();
    if (p <= 20) return 'Very Weak';
    if (p <= 40) return 'Weak';
    if (p <= 60) return 'Fair';
    if (p <= 80) return 'Strong';
    return 'Very Strong';
  }
  strengthColor(): string {
    const p = this.strengthPct();
    if (p <= 20) return '#ef4444';
    if (p <= 40) return '#f97316';
    if (p <= 60) return '#eab308';
    if (p <= 80) return '#22c55e';
    return '#16a34a';
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMessage = '';

    const newPassword = this.form.value.newPassword;

    // ── Appel réel au backend POST /api/auth/change-password ──
    this.authService.changePassword(this.userId, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        // Vider la session (token du premier login), rediriger vers login
        this.authService.clearSession();
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message ?? 'Failed to change password. Please try again.';
      }
    });
  }
}
