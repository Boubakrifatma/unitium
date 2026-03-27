import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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

  // Comptes de test — retirer en production
  testAccounts = [
    { email: 'evenixgroup@gmail.com', password: 'Esprit1234', role: 'ADMIN'    },
    { email: 'manager@test.com',      password: 'manager123',  role: 'MANAGER'  },
    { email: 'employee@test.com',     password: 'employee123', role: 'EMPLOYEE' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  onSubmit(): void {
    this.error   = '';
    this.loading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        // Check if user must change password on first login
        const user = this.authService.currentUser();
        if (user?.mustChangePassword) {
          this.router.navigate(['/auth/change-password']);
        } else {
          // ── Billing flow: restore checkout and redirect to payment page ──────
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
          this.router.navigate([returnUrl]);
        }
      },
      error: (err) => {
        this.error   = err.error?.message ?? 'An error occurred. Please try again.';
        this.loading = false;
      }
    });
  }

  fillAccount(account: { email: string; password: string }): void {
    this.email    = account.email;
    this.password = account.password;
  }
}
