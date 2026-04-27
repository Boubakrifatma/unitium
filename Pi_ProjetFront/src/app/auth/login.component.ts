import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email    = '';
  password = '';
  error    = '';
  loading  = false;

  // ── Étape 2FA ──────────────────────────────────────────────────────────────
  step: 'credentials' | 'mfa' = 'credentials';
  mfaCode    = '';
  pendingUserId: number | null = null;

  // Comptes de test — retirer en production
  testAccounts = [
    { email: 'evenixgroup@gmail.com',      password: 'Esprit1234', role: 'ADMIN'    },
    { email: 'yosra.ben.alii17@gmail.com', password: 'Yosra123.',  role: 'ADMIN'    },
    { email: 'admin@test.com',             password: 'admin123',   role: 'ADMIN'    },
    { email: 'manager@test.com',           password: 'manager123', role: 'MANAGER'  },
    { email: 'employee@test.com',          password: 'employee123',role: 'EMPLOYEE' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Étape 1 : connexion avec email + mdp ───────────────────────────────────
  onSubmit(): void {
    this.error   = '';
    this.loading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;

        // Le serveur demande le code 2FA
        if (res.mfaRequired) {
          this.pendingUserId = res.userId;
          this.step = 'mfa';
          this.cdr.detectChanges();
          return;
        }

        // Fetch complete user data including avatarUrl
        this.authService.fetchMe().subscribe({
          next: () => {
            this.cdr.detectChanges();
            const user = this.authService.currentUser();
            if (user?.mustChangePassword) {
              this.router.navigate(['/auth/change-password']);
            } else {
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
              this.router.navigate([returnUrl]);
            }
          },
          error: () => {
            // If fetchMe fails, proceed anyway
            this.cdr.detectChanges();
            const user = this.authService.currentUser();
            if (user?.mustChangePassword) {
              this.router.navigate(['/auth/change-password']);
            } else {
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
              this.router.navigate([returnUrl]);
            }
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.status === 0
          ? 'Cannot reach the server. Please try again later.'
          : (err.error?.message ?? 'Invalid email or password.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Étape 2 : vérifier le code 2FA ────────────────────────────────────────
  onVerify2FA(): void {
    if (!this.pendingUserId || !this.mfaCode) return;
    this.error   = '';
    this.loading = true;

    this.authService.verify2FA(this.pendingUserId, this.mfaCode).subscribe({
      next: () => {
        this.loading = false;
        // Fetch complete user data including avatarUrl
        this.authService.fetchMe().subscribe({
          next: () => {
            this.cdr.detectChanges();
            const user = this.authService.currentUser();
            if (user?.mustChangePassword) {
              this.router.navigate(['/auth/change-password']);
            } else {
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
              this.router.navigate([returnUrl]);
            }
          },
          error: () => {
            // If fetchMe fails, proceed anyway
            this.cdr.detectChanges();
            const user = this.authService.currentUser();
            if (user?.mustChangePassword) {
              this.router.navigate(['/auth/change-password']);
            } else {
              const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
              this.router.navigate([returnUrl]);
            }
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.error?.message ?? 'Invalid code. Please try again.';
        this.mfaCode = '';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Retour à l'étape email/mdp ─────────────────────────────────────────────
  backToCredentials(): void {
    this.step          = 'credentials';
    this.pendingUserId = null;
    this.mfaCode       = '';
    this.error         = '';
  }

  fillAccount(account: { email: string; password: string }): void {
    this.email    = account.email;
    this.password = account.password;
  }
}
