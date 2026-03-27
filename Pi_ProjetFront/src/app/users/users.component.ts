import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService, UserDTO } from './user.service';
import { UserDialogComponent } from './user-dialog.component';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatDialogModule, MatMenuModule, MatFormFieldModule,
    MatInputModule, MatTooltipModule, MatChipsModule, MatSnackBarModule
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">User Management</h3>
            <p class="small opacity-50">Manage your team members and their roles</p>
          </div>
          <div class="col-auto mb-3 mb-xl-0">
            <button mat-flat-button color="primary" (click)="openAddDialog()">
              <mat-icon class="material-icons-outlined">person_add</mat-icon>
              Add User
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">
      <!-- Stats cards -->
      <div class="row gx-3 gx-lg-4">
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue">
                    <mat-icon class="material-icons-outlined">group</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Total Users</p>
                  <h3>{{ dataSource.data.length }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Active</p>
                  <h3>{{ activeCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                    <mat-icon class="material-icons-outlined">block</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Inactive</p>
                  <h3>{{ dataSource.data.length - activeCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                    <mat-icon class="material-icons-outlined">admin_panel_settings</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Admins</p>
                  <h3>{{ adminCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Table card -->
      <div class="row gx-3 gx-lg-4">
        <div class="col-12">
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
                    <h3 class="mb-1">All Users</h3>
                    <p class="text-secondary small">Team members & access control</p>
                  </div>
                  <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                    <mat-form-field appearance="outline" class="w-100 inline-small">
                      <mat-label>Search</mat-label>
                      <mat-icon matPrefix>search</mat-icon>
                      <input matInput placeholder="Search users..." (keyup)="applyFilter($event)" #searchInput />
                    </mat-form-field>
                  </div>
                </div>
              </div>
            </mat-card-header>

            <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">

              <!-- User Info Column -->
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>User</th>
                <td mat-cell *matCellDef="let user" class="py-2">
                  <div class="row gx-3 align-items-center">
                    <div class="col-auto">
                      <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center">
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                      </div>
                    </div>
                    <div class="col">
                      <h4 class="mb-0">{{ user.fullName }}</h4>
                      <p class="text-secondary small">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                <td mat-cell *matCellDef="let user">
                  <span class="badge badge-light d-inline-block" [ngClass]="getRoleBadgeClass(user.role)">
                    {{ user.role }}
                  </span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="isActive">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let user">
                  <span class="badge badge-light d-inline-block" [ngClass]="user.isActive ? 'theme-green' : 'theme-red'">
                    <mat-icon class="text-sm align-middle" style="font-size:14px;height:14px;width:14px">
                      {{ user.isActive ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </ng-container>

              <!-- Created Column -->
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
                <td mat-cell *matCellDef="let user">
                  <p class="mb-0 small">{{ user.createdAt | date: 'MMM d, yyyy' }}</p>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="openEditDialog(user)">
                      <mat-icon class="material-icons-outlined">edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="toggleStatus(user)">
                      <mat-icon class="material-icons-outlined">{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
                      <span>{{ user.isActive ? 'Deactivate' : 'Activate' }}</span>
                    </button>
                    <button mat-menu-item (click)="deleteUser(user)" class="text-danger">
                      <mat-icon class="material-icons-outlined" color="warn">delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell text-center py-4" [attr.colspan]="displayedColumns.length">
                  No users matching "{{ searchInput.value }}"
                </td>
              </tr>
            </table>

            <mat-card-content>
              <mat-paginator [pageSizeOptions]="[5, 10, 25]" aria-label="Select page" class="bg-none"></mat-paginator>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  `]
})
export class UsersComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  dataSource = new MatTableDataSource<UserDTO>([]);
  displayedColumns = ['fullName', 'role', 'isActive', 'createdAt', 'actions'];

  get activeCount() { return this.dataSource.data.filter(u => u.isActive).length; }
  get adminCount() { return this.dataSource.data.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length; }

  // Admin cannot assign ADMIN role — only MANAGER, EMPLOYEE, VIEWER
  get availableRoles(): string[] {
    const currentRole = this.authService.currentUser()?.role;
    if (currentRole === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'TUTOR', 'VIEWER'];
    }
    return ['MANAGER', 'EMPLOYEE', 'TUTOR', 'VIEWER'];
  }

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: UserDTO, filter: string) =>
      `${data.fullName} ${data.email} ${data.role}`.toLowerCase().includes(filter);
  }

  loadUsers() {
    this.userService.getAll().subscribe({
      next: (data) => {
        // Filter users based on current user's role
        const currentRole = this.authService.currentUser()?.role;

        if (currentRole === 'SUPER_ADMIN') {
          // SUPER_ADMIN sees all users
          this.dataSource.data = data;
        } else if (currentRole === 'ADMIN') {
          // ADMIN cannot see SUPER_ADMIN or other ADMINs
          // Filter based on organization type
          this.dataSource.data = data.filter(user => {
            // Hide SUPER_ADMIN and ADMIN users
            if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
              return false;
            }

            // For ENTERPRISE: show MANAGER, EMPLOYEE, VIEWER, PRODUCT_OWNER
            if (user.orgType === 'enterprise') {
              return ['MANAGER', 'EMPLOYEE', 'VIEWER', 'PRODUCT_OWNER'].includes(user.role);
            }

            // For ACADEMIC: show TUTOR, STUDENT, VIEWER
            if (user.orgType === 'academic') {
              return ['TUTOR', 'STUDENT', 'VIEWER'].includes(user.role);
            }

            // Default: show lower roles
            return ['MANAGER', 'EMPLOYEE', 'TUTOR', 'VIEWER', 'STUDENT', 'PRODUCT_OWNER'].includes(user.role);
          });
        } else {
          // Other roles see only their own data or no data
          this.dataSource.data = [];
        }
      },
      error: () => this.notify('Failed to load users', true)
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = value;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openAddDialog() {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '560px',
      autoFocus: false,
      data: { mode: 'create', availableRoles: this.availableRoles }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.userService.create({ fullName: result.fullName, email: result.email, password: result.password, role: result.role }).subscribe({
        next: (created) => { this.dataSource.data = [...this.dataSource.data, created]; this.notify('User created successfully'); },
        error: (err) => this.notify(err.error?.message || 'Failed to create user', true)
      });
    });
  }

  openEditDialog(user: UserDTO) {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '560px',
      autoFocus: false,
      data: { mode: 'edit', user, availableRoles: this.availableRoles }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      // Update name/email
      this.userService.update(user.id, { fullName: result.fullName, email: result.email }).subscribe({
        next: (updated) => {
          // Then update role if changed
          if (result.role !== user.role) {
            this.userService.changeRole(updated.id, result.role).subscribe({
              next: (final) => { this.replaceUser(final); this.notify('User updated successfully'); },
              error: () => this.notify('Failed to update role', true)
            });
          } else {
            this.replaceUser(updated);
            this.notify('User updated successfully');
          }
        },
        error: () => this.notify('Failed to update user', true)
      });
    });
  }

  toggleStatus(user: UserDTO) {
    this.userService.changeStatus(user.id, !user.isActive).subscribe({
      next: (updated) => { this.replaceUser(updated); this.notify(`User ${updated.isActive ? 'activated' : 'deactivated'}`); },
      error: () => this.notify('Failed to change status', true)
    });
  }

  deleteUser(user: UserDTO) {
    if (!confirm(`Delete "${user.fullName}"? This action cannot be undone.`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => { this.dataSource.data = this.dataSource.data.filter(u => u.id !== user.id); this.notify('User deleted'); },
      error: () => this.notify('Failed to delete user', true)
    });
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'theme-red',
      ADMIN: 'theme-yellow',
      MANAGER: 'theme-blue',
      EMPLOYEE: 'theme-green',
      TUTOR: 'theme-purple',
      VIEWER: 'theme-cyan'
    };
    return map[role] ?? 'theme-cyan';
  }

  private replaceUser(updated: UserDTO) {
    this.dataSource.data = this.dataSource.data.map(u => u.id === updated.id ? updated : u);
  }

  private notify(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : ['snack-success']
    });
  }
}
