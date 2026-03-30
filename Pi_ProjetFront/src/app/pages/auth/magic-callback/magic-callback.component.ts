import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-magic-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;font-family:Inter,Arial,sans-serif">
      <ng-container *ngIf="!error">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:8px">
          <span style="font-size:24px">🔑</span>
        </div>
        <div style="width:36px;height:36px;border:3px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <p style="color:#6b7280;font-size:14px">Verifying your sign-in link…</p>
      </ng-container>
      <ng-container *ngIf="error">
        <div style="width:52px;height:52px;background:#fef2f2;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:8px">
          <span style="font-size:24px">❌</span>
        </div>
        <p style="color:#dc2626;font-size:14px;text-align:center;max-width:320px">{{ error }}</p>
        <a href="/auth/login" style="color:#6366f1;font-size:13px;font-weight:600;text-decoration:none">← Back to login</a>
      </ng-container>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
})
export class MagicCallbackComponent implements OnInit {
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.error = 'Invalid link. Please request a new one.';
      return;
    }

    this.http.post<any>('http://localhost:8084/api/auth/magic-link/verify', { token }).subscribe({
      next: (res) => {
        this.authService['setToken'](res.token);
        this.authService['setUserId'](res.id);
        const user = {
          id: res.id,
          email: res.email,
          fullName: res.fullName,
          role: res.role,
          mustChangePassword: res.mustChangePassword,
          avatarUrl: res.avatarUrl ?? null
        };
        this.authService.currentUser.set(user as any);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('session_user', JSON.stringify(user));
        }
        if (res.mustChangePassword) {
          this.router.navigate(['/auth/first-login'], { state: { userId: res.id } });
          return;
        }
        const redirectMap: Record<string, string> = {
          SUPER_ADMIN: '/app/super-admin',
          PRODUCT_OWNER: '/app/po',
        };
        this.router.navigate([redirectMap[res.role] ?? '/app/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message ?? 'This link is invalid or has expired. Please request a new one.';
      }
    });
  }
}
