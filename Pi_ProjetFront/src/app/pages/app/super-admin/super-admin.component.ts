import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { UserService, UserDTO } from '../../../users/user.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, MatChipsModule, RouterModule],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Platform Overview</h3>
            <p class="small opacity-50">Welcome, {{ currentUser?.fullName }} — you have full platform access</p>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">

      <!-- Stats -->
      <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue">
                    <mat-icon class="material-icons-outlined">group</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Total Users</p>
                  <h3>{{ users.length }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Active Users</p>
                  <h3>{{ activeUsers }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                    <mat-icon class="material-icons-outlined">admin_panel_settings</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Admins</p>
                  <h3>{{ adminUsers }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                    <mat-icon class="material-icons-outlined">block</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Inactive Users</p>
                  <h3>{{ users.length - activeUsers }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Users by Role -->
      <div class="row gx-3 gx-lg-4">
        <div class="col-12 col-lg-8">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-header>
              <div class="w-100">
                <div class="row gx-3 align-items-center">
                  <div class="col-auto mb-3">
                    <div class="avatar avatar-40 text-theme rounded">
                      <mat-icon class="material-icons-outlined">manage_accounts</mat-icon>
                    </div>
                  </div>
                  <div class="col mb-3">
                    <h3 class="mb-1">All Platform Users</h3>
                    <p class="text-secondary small">Every registered account across the platform</p>
                  </div>
                  <div class="col-auto mb-3">
                    <a mat-stroked-button routerLink="/app/users">Manage Users</a>
                  </div>
                </div>
              </div>
            </mat-card-header>

            <table mat-table [dataSource]="dataSource" class="bg-none mb-3 responsive-table">
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let u" class="py-2">
                  <div class="row gx-3 align-items-center">
                    <div class="col-auto">
                      <div class="avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center">
                        <mat-icon class="material-icons-outlined" style="font-size:18px">person</mat-icon>
                      </div>
                    </div>
                    <div class="col">
                      <h4 class="mb-0">{{ u.fullName }}</h4>
                      <p class="text-secondary small mb-0">{{ u.email }}</p>
                    </div>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let u">
                  <span class="badge badge-light d-inline-block" [ngClass]="getRoleBadge(u.role)">{{ u.role }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let u">
                  <span class="badge badge-light d-inline-block" [ngClass]="u.isActive ? 'theme-green' : 'theme-red'">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Joined</th>
                <td mat-cell *matCellDef="let u" class="small text-secondary">{{ u.createdAt | date:'MMM d, yyyy' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>

            <mat-card-content>
              <p class="text-secondary small text-center" *ngIf="users.length === 0">No users found.</p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Role Distribution -->
        <div class="col-12 col-lg-4">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-header>
              <div class="col mb-3">
                <h3 class="mb-1">Role Distribution</h3>
                <p class="text-secondary small">Users per role</p>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div *ngFor="let r of roleStats" class="mb-3">
                <div class="d-flex justify-content-between mb-1">
                  <span class="badge badge-light d-inline-block" [ngClass]="getRoleBadge(r.role)">{{ r.role }}</span>
                  <strong>{{ r.count }}</strong>
                </div>
                <div class="progress" style="height:6px; border-radius:4px; background:#f0f0f0">
                  <div class="progress-bar" [ngClass]="getProgressClass(r.role)"
                       [style.width.%]="users.length ? (r.count / users.length) * 100 : 0"
                       style="border-radius:4px; transition: width 0.5s ease">
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .progress-bar { height: 6px; }
  `]
})
export class SuperAdminComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  users: UserDTO[] = [];
  dataSource = new MatTableDataSource<UserDTO>([]);
  cols = ['user', 'role', 'status', 'created'];

  get currentUser() { return this.authService.currentUser(); }
  get activeUsers() { return this.users.filter(u => u.isActive).length; }
  get adminUsers()  { return this.users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length; }

  get roleStats() {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'];
    return roles.map(role => ({
      role,
      count: this.users.filter(u => u.role === role).length
    })).filter(r => r.count > 0);
  }

  ngOnInit() {
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.dataSource.data = data;
      }
    });
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'theme-red', ADMIN: 'theme-yellow',
      MANAGER: 'theme-blue', EMPLOYEE: 'theme-green',
      TUTOR: 'theme-purple', VIEWER: 'theme-cyan'
    };
    return map[role] ?? 'theme-cyan';
  }

  getProgressClass(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'bg-danger', ADMIN: 'bg-warning',
      MANAGER: 'bg-primary', EMPLOYEE: 'bg-success',
      TUTOR: 'bg-purple', VIEWER: 'bg-info'
    };
    return map[role] ?? 'bg-secondary';
  }
}
