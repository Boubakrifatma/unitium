import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px">
      <div *ngIf="!error">
        <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px"></div>
        <p style="color:#6b7280;font-size:14px;text-align:center">Signing you in with Google…</p>
      </div>
      <div *ngIf="error" style="color:#dc2626;font-size:14px">{{ error }}</div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
})
export class OAuth2CallbackComponent implements OnInit {
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const token     = params['token'];
    const userId    = params['userId'];
    const email     = params['email'];
    const fullName  = params['fullName'];
    const role      = params['role'];
    const avatarUrl = params['avatarUrl'];
    const errorParam = params['error'];

    if (errorParam === 'account_disabled') {
      this.error = 'This account is disabled. Please contact an administrator.';
      setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      return;
    }

    if (!token || !userId) {
      this.error = 'Authentication failed. Redirecting…';
      setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      return;
    }

    // Store session (same as normal login)
    this.authService['setToken'](token);
    this.authService['setUserId'](Number(userId));
    const user = {
      id: Number(userId),
      email,
      fullName,
      role,
      mustChangePassword: false,
      avatarUrl: avatarUrl || null
    };
    this.authService.currentUser.set(user as any);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('session_user', JSON.stringify(user));
    }

    // Redirect based on role
    const redirectMap: Record<string, string> = {
      SUPER_ADMIN: '/app/super-admin',
      PRODUCT_OWNER: '/app/po',
    };
    this.router.navigate([redirectMap[role] ?? '/app/dashboard']);
  }
}
