import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    { email: 'admin@test.com',    password: 'admin123',    role: 'ADMIN'    },
    { email: 'manager@test.com',  password: 'manager123',  role: 'MANAGER'  },
    { email: 'employee@test.com', password: 'employee123', role: 'EMPLOYEE' },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error   = '';
    this.loading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']).then(navigated => {
          if (!navigated) {
            this.loading = false;
            this.error   = '';
            alert('Login successful! (/dashboard route not created yet)');
          }
        });
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
