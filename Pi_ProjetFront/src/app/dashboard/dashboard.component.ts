import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:40px; font-family:Arial">
      <h1>Welcome, {{ authService.currentUser()?.fullName }}!</h1>
      <p>Role: <strong>{{ authService.currentUser()?.role }}</strong></p>
      <p>Email: {{ authService.currentUser()?.email }}</p>
      <br>
      <button (click)="logout()" style="padding:10px 20px; background:#e74c3c; color:white; border:none; border-radius:6px; cursor:pointer">
        Sign Out
      </button>
    </div>
  `
})
export class DashboardComponent {
  constructor(public authService: AuthService, private router: Router) {}

  logout(): void {
    this.authService.logout();
  }
}
