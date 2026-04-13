import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { OrganizationService, OrganizationDTO, OrgMemberDTO } from './organization.service';
import { AddMemberDialogComponent } from './add-member-dialog.component';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, MatMenuModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col-auto">
            <a mat-icon-button routerLink="/app/organizations"><mat-icon>arrow_back</mat-icon></a>
          </div>
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">{{ org?.name ?? 'Organization' }}</h3>
            <p class="small opacity-50">
              <span class="badge badge-light me-2" [ngClass]="org?.orgType === 'ENTERPRISE' ? 'theme-blue' : 'theme-yellow'">{{ org?.orgType }}</span>
              {{ org?.slug }}
            </p>
          </div>
          <div class="col-auto mb-3 mb-xl-0">
            <button mat-flat-button color="primary" (click)="openAddMember()">
              <mat-icon class="material-icons-outlined">person_add</mat-icon> Add Member
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">
      <!-- Stats -->
      <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-12 col-md-4">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue"><mat-icon class="material-icons-outlined">group</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Total Members</p><h3>{{ members.length }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-4">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red"><mat-icon class="material-icons-outlined">manage_accounts</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Admins</p><h3>{{ adminCount }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-4">
          <mat-card class="mb-3">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green"><mat-icon class="material-icons-outlined">person</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Members</p><h3>{{ memberCount }}</h3></div>
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
              <div class="col mb-3"><h3 class="mb-1">Members</h3><p class="text-secondary small">People with access to this organization</p></div>
            </div>
          </div>
        </mat-card-header>

        <table mat-table [dataSource]="members" class="bg-none mb-3 responsive-table">
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let m" class="py-2">
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center"><mat-icon class="material-icons-outlined" style="font-size:18px">person</mat-icon></div></div>
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
              <span class="badge badge-light d-inline-block" [ngClass]="getPlatformRoleBadge(m.platformRole ?? m.role)">
                {{ roleLabel(m.platformRole ?? m.role) }}
              </span>
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
                <button mat-menu-item (click)="changeRole(m, 'OWNER')"><mat-icon class="material-icons-outlined">star</mat-icon><span>Set Owner</span></button>
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

      <!-- Pending Invitations -->
      <mat-card class="mb-3 mb-lg-4" *ngIf="pendingInvitations.length > 0">
        <mat-card-header>
          <div class="w-100">
            <div class="row gx-3 align-items-center">
              <div class="col-auto mb-3"><div class="avatar avatar-40 text-theme rounded theme-yellow"><mat-icon class="material-icons-outlined">schedule_send</mat-icon></div></div>
              <div class="col mb-3">
                <h3 class="mb-1">Pending Invitations <span class="badge badge-light theme-yellow ms-2">{{ pendingInvitations.length }}</span></h3>
                <p class="text-secondary small">Waiting for the recipient's response</p>
              </div>
            </div>
          </div>
        </mat-card-header>
        <div class="px-3 pb-3">
          <div *ngFor="let inv of pendingInvitations" class="pending-row d-flex align-items-center justify-content-between py-2">
            <div class="d-flex align-items-center gap-3">
              <div class="avatar avatar-36 rounded-circle d-flex align-items-center justify-content-center" style="background:#fef3c7">
                <mat-icon class="material-icons-outlined" style="font-size:18px;color:#f59e0b">schedule</mat-icon>
              </div>
              <div>
                <p class="mb-0 fw-semibold small">{{ inv.fullName }}</p>
                <p class="text-secondary mb-0" style="font-size:12px">{{ inv.email }} &nbsp;·&nbsp;
                  <span class="badge badge-light theme-yellow" style="font-size:11px">{{ inv.platformRole }}</span>
                  <span class="badge badge-light theme-cyan ms-1" style="font-size:11px">PENDING</span>
                </p>
              </div>
            </div>
            <button mat-icon-button color="warn" (click)="cancelInvitation(inv)" title="Cancel invitation">
              <mat-icon style="font-size:18px">close</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>

    </div>
  `,
  styles: [`
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .pending-row { border-bottom: 1px solid var(--bs-border-color, #e5e7eb); }
    .pending-row:last-child { border-bottom: none; }
  `]
})
export class OrganizationDetailComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private svc      = inject(OrganizationService);
  private dialog   = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);
  private http     = inject(HttpClient);

  org: OrganizationDTO | null = null;
  members: OrgMemberDTO[] = [];
  pendingInvitations: any[] = [];
  cols = ['user', 'role', 'joinedAt', 'actions'];
  private orgId = '';

  get adminCount()  { return this.members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length; }
  get memberCount() { return this.members.filter(m => m.role === 'MEMBER').length; }

  ngOnInit() {
    this.orgId = this.route.snapshot.paramMap.get('id')!;

    // Load org info and members in parallel — do NOT chain them
    this.svc.getById(this.orgId).subscribe({
      next: o => { this.org = o; this.cdr.detectChanges(); },
      error: () => this.notify('Organization not found', true)
    });

    this.svc.getMembers(this.orgId).subscribe({
      next: d => { this.members = d; this.cdr.detectChanges(); },
      error: () => this.notify('Failed to load members', true)
    });

    this.loadPendingInvitations();
  }

  loadMembers() {
    this.svc.getMembers(this.orgId).subscribe({
      next: d => { this.members = d; this.cdr.detectChanges(); },
      error: () => this.notify('Failed to load members', true)
    });
  }

  loadPendingInvitations() {
    this.http.get<any[]>(`http://localhost:8084/api/organizations/${this.orgId}/invitations`).subscribe({
      next: d => { this.pendingInvitations = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  openAddMember() {
    this.dialog.open(AddMemberDialogComponent, {
      width: '500px',
      autoFocus: false,
      data: { orgId: this.orgId, orgType: this.org?.orgType ?? 'ENTERPRISE' }
    }).afterClosed().subscribe(inv => {
      if (!inv) return;
      this.pendingInvitations = [...this.pendingInvitations, inv];
      this.notify('Invitation sent — waiting for the recipient to accept');
      this.cdr.detectChanges();
    });
  }

  cancelInvitation(inv: any) {
    if (!confirm(`Cancel invitation for "${inv.email}"?`)) return;
    this.http.delete(`http://localhost:8084/api/invitations/${inv.id}`).subscribe({
      next: () => {
        this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== inv.id);
        this.notify('Invitation cancelled');
        this.cdr.detectChanges();
      },
      error: () => this.notify('Failed to cancel invitation', true)
    });
  }

  changeRole(m: OrgMemberDTO, role: string) {
    this.svc.changeRole(this.orgId, m.id, role).subscribe({ next: u => { this.members = this.members.map(x => x.id === u.id ? u : x); this.notify(`Role changed to ${role}`); }, error: () => this.notify('Failed to change role', true) });
  }

  removeMember(m: OrgMemberDTO) {
    if (!confirm(`Remove "${m.userFullName ?? 'this user'}"?`)) return;
    this.svc.removeMember(this.orgId, m.id).subscribe({ next: () => { this.members = this.members.filter(x => x.id !== m.id); this.notify('Member removed'); }, error: () => this.notify('Failed to remove', true) });
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MANAGER: 'Manager',
      EMPLOYEE: 'Employee', PRODUCT_OWNER: 'Product Owner',
      TUTOR: 'Tutor', STUDENT: 'Student', VIEWER: 'Viewer',
      OWNER: 'Owner', MEMBER: 'Member',
    };
    return labels[role] ?? role;
  }

  getPlatformRoleBadge(role: string): string {
    const classes: Record<string, string> = {
      SUPER_ADMIN: 'theme-red', ADMIN: 'theme-orange', OWNER: 'theme-red',
      MANAGER: 'theme-blue', EMPLOYEE: 'theme-cyan', PRODUCT_OWNER: 'theme-purple',
      TUTOR: 'theme-yellow', STUDENT: 'theme-green', VIEWER: 'theme-gray',
      MEMBER: 'theme-green',
    };
    return classes[role] ?? '';
  }

  private notify(msg: string, err = false) { this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: err ? ['snack-error'] : ['snack-success'] }); }
}
