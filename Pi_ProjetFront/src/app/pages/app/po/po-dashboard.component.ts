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
  selector: 'app-po-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, MatChipsModule, RouterModule],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Product Owner Dashboard</h3>
            <p class="small opacity-50">Welcome, {{ currentUser?.fullName }} — manage your product backlog and team</p>
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
                  <p class="small text-secondary mb-1">Team Members</p>
                  <h3>{{ teamMembers.length }}</h3>
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
                  <p class="small text-secondary mb-1">Active Members</p>
                  <h3>{{ activeMembers }}</h3>
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
                    <mat-icon class="material-icons-outlined">school</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Tutors</p>
                  <h3>{{ tutorCount }}</h3>
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
                    <mat-icon class="material-icons-outlined">person_search</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Students</p>
                  <h3>{{ studentCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Team table + Role distribution -->
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
                    <h3 class="mb-1">Team Overview</h3>
                    <p class="text-secondary small">All members in your scope</p>
                  </div>
                  <div class="col-auto mb-3">
                    <a mat-stroked-button routerLink="/app/users">Manage Team</a>
                  </div>
                </div>
              </div>
            </mat-card-header>

            <table mat-table [dataSource]="dataSource" class="bg-none mb-3 responsive-table">
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>Member</th>
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
              <p class="text-secondary small text-center" *ngIf="teamMembers.length === 0">No team members found.</p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Role Distribution -->
        <div class="col-12 col-lg-4">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-header>
              <div class="col mb-3">
                <h3 class="mb-1">Role Distribution</h3>
                <p class="text-secondary small">Members per role</p>
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
                       [style.width.%]="teamMembers.length ? (r.count / teamMembers.length) * 100 : 0"
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
export class PoDashboardComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  teamMembers: UserDTO[] = [];
  dataSource = new MatTableDataSource<UserDTO>([]);
  cols = ['user', 'role', 'status', 'created'];

  get currentUser() { return this.authService.currentUser(); }
  get activeMembers() { return this.teamMembers.filter(u => u.isActive).length; }
  get tutorCount() { return this.teamMembers.filter(u => u.role === 'TUTOR').length; }
  get studentCount() { return this.teamMembers.filter(u => u.role === 'STUDENT').length; }

  get roleStats() {
    const roles = ['MANAGER', 'EMPLOYEE', 'TUTOR', 'STUDENT', 'VIEWER'];
    return roles.map(role => ({
      role,
      count: this.teamMembers.filter(u => u.role === role).length
    })).filter(r => r.count > 0);
  }

  ngOnInit() {
    this.userService.getAll().subscribe({
      next: (data) => {
        // PO sees: managers, employees, tutors, students, viewers (not super_admin or admin)
        this.teamMembers = data.filter(u =>
          ['MANAGER', 'EMPLOYEE', 'TUTOR', 'STUDENT', 'VIEWER'].includes(u.role)
        );
        this.dataSource.data = this.teamMembers;
      }
    });
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      MANAGER: 'theme-blue', EMPLOYEE: 'theme-green',
      TUTOR: 'theme-purple', STUDENT: 'theme-cyan', VIEWER: 'theme-cyan'
    };
    return map[role] ?? 'theme-cyan';
  }

  getProgressClass(role: string): string {
    const map: Record<string, string> = {
      MANAGER: 'bg-primary', EMPLOYEE: 'bg-success',
      TUTOR: 'bg-purple', STUDENT: 'bg-info', VIEWER: 'bg-secondary'
    };
    return map[role] ?? 'bg-secondary';
  }
}
