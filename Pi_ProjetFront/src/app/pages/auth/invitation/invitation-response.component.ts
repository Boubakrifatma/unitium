import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invitation-response',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:Inter,Arial,sans-serif;background:#f9fafb">
      <div style="width:100%;max-width:460px;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

        <!-- Accepted -->
        <ng-container *ngIf="state === 'accepted'">
          <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:32px">✅</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Invitation Accepted!</h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Your account has been created and is ready to use.</p>

          <!-- Credentials notice -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:left">
            <p style="margin:0 0 6px;font-weight:700;color:#1d4ed8;font-size:14px">📧 Check your email inbox</p>
            <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6">
              We sent you an email with your <strong>login email</strong> and <strong>temporary password</strong>.<br>
              Use them to sign in — you will be asked to set a new password immediately.
            </p>
            <p style="margin:8px 0 0;color:#3b82f6;font-size:12px">
              💡 Don't see it? Check your <strong>spam / junk</strong> folder.
            </p>
          </div>

          <a href="/auth/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">
            Sign In to Unitum →
          </a>
        </ng-container>

        <!-- Declined -->
        <ng-container *ngIf="state === 'declined'">
          <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:32px">👋</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 10px">Invitation Declined</h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 28px">You have declined the invitation. You can safely close this page.</p>
        </ng-container>

        <!-- Error -->
        <ng-container *ngIf="state === 'error'">
          <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:32px">❌</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 10px">Something went wrong</h2>
          <p style="color:#dc2626;font-size:14px;margin:0 0 28px">{{ message }}</p>
          <a href="/auth/login" style="color:#6366f1;font-size:13px;font-weight:600;text-decoration:none">← Back to login</a>
        </ng-container>

      </div>
    </div>
  `
})
export class InvitationResponseComponent implements OnInit {
  state: 'accepted' | 'declined' | 'error' = 'error';
  message = 'Invalid invitation link.';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const state   = this.route.snapshot.queryParams['state'];
    const message = this.route.snapshot.queryParams['message'];

    if (state === 'accepted' || state === 'declined' || state === 'error') {
      this.state = state;
    }
    if (message) {
      this.message = decodeURIComponent(message);
    }
  }
}
