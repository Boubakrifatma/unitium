import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { OrganizationService, OrganizationDTO, OrgMemberDTO } from './organization.service';
import { AddMemberDialogComponent } from './add-member-dialog.component';

@Component({
  selector: 'app-my-organization',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatMenuModule, MatDialogModule, MatSnackBarModule
  ],
  template: `
    <!-- Header -->
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">{{ org?.name ?? 'My Organization' }}</h3>
            <p class="small opacity-50">
              <span class="badge badge-light me-2" [ngClass]="org?.orgType === 'ENTERPRISE' ? 'theme-blue' : 'theme-yellow'">
                {{ org?.orgType }}
              </span>
              {{ org?.slug }}
            </p>
          </div>
          <div class="col-auto mb-3 mb-xl-0" *ngIf="org">
            <button mat-flat-button color="primary" (click)="openAddMember()">
              <mat-icon class="material-icons-outlined">person_add</mat-icon>
              Add Member
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <!-- No org found -->
    <div class="container fade-in" *ngIf="!org && !loading">
      <mat-card class="text-center py-5">
        <mat-icon style="font-size:48px;height:48px;width:48px" class="text-secondary">corporate_fare</mat-icon>
        <h4 class="mt-3">No organization found</h4>
        <p class="text-secondary">You don't own any organization yet.</p>
      </mat-card>
    </div>

    <div class="container fade-in" *ngIf="org">

      <!-- Stats -->
      <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-12 col-md-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue"><mat-icon class="material-icons-outlined">group</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Total Members</p><h3>{{ members.length }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red"><mat-icon class="material-icons-outlined">manage_accounts</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Admins</p><h3>{{ countRole('ADMIN') + countRole('OWNER') }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green"><mat-icon class="material-icons-outlined">person</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Members</p><h3>{{ countRole('MEMBER') }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow"><mat-icon class="material-icons-outlined">email</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Billing Email</p><p class="mb-0 small fw-bold">{{ org.billingEmail ?? '—' }}</p></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Members Table -->
      <mat-card class="mb-3 mb-lg-4">
        <mat-card-header>
          <div class="w-100">
            <div class="row gx-3 align-items-center">
              <div class="col-auto mb-3"><div class="avatar avatar-40 text-theme rounded"><mat-icon class="material-icons-outlined">group</mat-icon></div></div>
              <div class="col mb-3">
                <h3 class="mb-1">Team Members</h3>
                <p class="text-secondary small">People in your organization</p>
              </div>
            </div>
          </div>
        </mat-card-header>

        <table mat-table [dataSource]="members" class="bg-none mb-3 responsive-table">
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>Member</th>
            <td mat-cell *matCellDef="let m" class="py-2">
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center">
                    <mat-icon class="material-icons-outlined" style="font-size:18px">person</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <h4 class="mb-0">{{ m.userFullName ?? 'User #' + m.userId }}</h4>
                  <p class="text-secondary small mb-0">{{ m.userEmail ?? '—' }}</p>
                </div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let m">
              <span class="badge badge-light d-inline-block" [ngClass]="getRoleBadge(m.role)">{{ m.role }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="joinedAt">
            <th mat-header-cell *matHeaderCellDef>Joined</th>
            <td mat-cell *matCellDef="let m" class="small text-secondary">{{ m.joinedAt | date:'MMM d, yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let m">
              <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="changeRole(m, 'ADMIN')"><mat-icon class="material-icons-outlined">manage_accounts</mat-icon><span>Set Admin</span></button>
                <button mat-menu-item (click)="changeRole(m, 'MEMBER')"><mat-icon class="material-icons-outlined">person</mat-icon><span>Set Member</span></button>
                <button mat-menu-item (click)="removeMember(m)"><mat-icon class="material-icons-outlined" color="warn">person_remove</mat-icon><span>Remove</span></button>
              </mat-menu>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center py-4" [attr.colspan]="cols.length">No members yet. Click "Add Member".</td>
          </tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }`]
})
export class MyOrganizationComponent implements OnInit {
  private svc = inject(OrganizationService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  org: OrganizationDTO | null = null;
  members: OrgMemberDTO[] = [];
  loading = true;
  cols = ['user', 'role', 'joinedAt', 'actions'];

  countRole(role: string) { return this.members.filter(m => m.role === role).length; }

  ngOnInit() {
    this.svc.getMyOrganization().subscribe({
      next: o => { this.org = o; this.loading = false; this.loadMembers(); },
      error: () => { this.loading = false; }
    });
  }

  loadMembers() {
    this.svc.getMembers(this.org!.id).subscribe({ next: d => this.members = d });
  }

  openAddMember() {
    this.dialog.open(AddMemberDialogComponent, {
      width: '500px',
      autoFocus: false,
      data: { orgId: this.org!.id, orgType: this.org!.orgType }
    }).afterClosed().subscribe(member => {
      if (!member) return;
      this.members = [...this.members, member];
      this.notify('Invite sent — credentials emailed to the new member');
    });
  }

  changeRole(m: OrgMemberDTO, role: string) {
    this.svc.changeRole(this.org!.id, m.id, role).subscribe({
      next: u => { this.members = this.members.map(x => x.id === u.id ? u : x); this.notify('Role updated'); },
      error: () => this.notify('Failed to update role', true)
    });
  }

  removeMember(m: OrgMemberDTO) {
    if (!confirm(`Remove "${m.userFullName ?? 'this user'}"?`)) return;
    this.svc.removeMember(this.org!.id, m.id).subscribe({
      next: () => { this.members = this.members.filter(x => x.id !== m.id); this.notify('Member removed'); },
      error: () => this.notify('Failed to remove', true)
    });
  }

  getRoleBadge(role: string): string {
    return ({ OWNER: 'theme-red', ADMIN: 'theme-blue', MEMBER: 'theme-green' } as any)[role] ?? 'theme-cyan';
  }

  private notify(msg: string, err = false) {
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: err ? ['snack-error'] : ['snack-success'] });
  }
}
