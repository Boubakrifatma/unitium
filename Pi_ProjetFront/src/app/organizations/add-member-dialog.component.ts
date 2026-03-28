import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

const PLATFORM_ROLES: Record<string, { value: string; label: string }[]> = {
  ENTERPRISE: [
    { value: 'MANAGER',       label: 'Manager' },
    { value: 'EMPLOYEE',      label: 'Employee' },
    { value: 'PRODUCT_OWNER', label: 'Product Owner' },
    { value: 'ADMIN',         label: 'Admin' },
    { value: 'VIEWER',        label: 'Viewer' },
  ],
  ACADEMIC: [
    { value: 'MANAGER', label: 'Manager' },
    { value: 'TUTOR',   label: 'Tutor' },
    { value: 'STUDENT', label: 'Student' },
    { value: 'ADMIN',   label: 'Admin' },
    { value: 'VIEWER',  label: 'Viewer' },
  ]
};

export interface InviteDialogData {
  orgId: string;
  orgType: string;
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="material-icons-outlined align-middle me-2">person_add</mat-icon>
      Invite Member
    </h2>

    <div class="px-3 pb-1">
      <span class="badge badge-light" [ngClass]="data.orgType === 'ENTERPRISE' ? 'theme-blue' : 'theme-yellow'">
        {{ data.orgType }}
      </span>
      <span class="small text-secondary ms-2">
        An account will be created and credentials sent by email.
      </span>
    </div>

    <mat-dialog-content style="min-width:440px">

      <!-- Full Name -->
      <mat-form-field appearance="outline" class="w-100 mt-3">
        <mat-label>Full Name</mat-label>
        <mat-icon matPrefix class="material-icons-outlined">badge</mat-icon>
        <input matInput [(ngModel)]="form.fullName" placeholder="ex: Alice Martin" required />
      </mat-form-field>

      <!-- Email -->
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Email Address</mat-label>
        <mat-icon matPrefix class="material-icons-outlined">email</mat-icon>
        <input matInput type="email" [(ngModel)]="form.email" placeholder="ex: alice@company.com" required />
      </mat-form-field>

      <!-- Platform Role -->
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Platform Role</mat-label>
        <mat-icon matPrefix class="material-icons-outlined">work</mat-icon>
        <mat-select [(ngModel)]="form.platformRole" required>
          <mat-option *ngFor="let r of platformRoles" [value]="r.value">{{ r.label }}</mat-option>
        </mat-select>
        <mat-hint>Defines what the user can do across the platform</mat-hint>
      </mat-form-field>

      <!-- Org Role -->
      <mat-form-field appearance="outline" class="w-100 mt-2">
        <mat-label>Organization Role</mat-label>
        <mat-icon matPrefix class="material-icons-outlined">corporate_fare</mat-icon>
        <mat-select [(ngModel)]="form.orgRole" required>
          <mat-option value="MEMBER">Member</mat-option>
          <mat-option value="ADMIN">Admin</mat-option>
        </mat-select>
        <mat-hint>Admin can manage members in this organization</mat-hint>
      </mat-form-field>

    </mat-dialog-content>

    <mat-dialog-actions align="end" class="px-3 pb-3">
      <button mat-button mat-dialog-close [disabled]="loading">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!isValid() || loading" (click)="submit()">
        <mat-spinner *ngIf="loading" diameter="18" class="d-inline-block me-1"></mat-spinner>
        <mat-icon *ngIf="!loading" class="material-icons-outlined me-1">send</mat-icon>
        Send Invite
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }`]
})
export class AddMemberDialogComponent {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  form = {
    fullName: '',
    email: '',
    platformRole: '',
    orgRole: 'MEMBER'
  };

  loading = false;

  get platformRoles() {
    return PLATFORM_ROLES[this.data.orgType] ?? PLATFORM_ROLES['ENTERPRISE'];
  }

  constructor(
    public dialogRef: MatDialogRef<AddMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InviteDialogData
  ) {}

  isValid(): boolean {
    return !!(
      this.form.fullName.trim() &&
      this.form.email.trim() &&
      this.form.platformRole &&
      this.form.orgRole
    );
  }

  submit() {
    if (!this.isValid()) return;
    this.loading = true;

    this.http.post(
      `http://localhost:8084/api/organizations/${this.data.orgId}/members/invite`,
      {
        fullName: this.form.fullName.trim(),
        email: this.form.email.trim(),
        platformRole: this.form.platformRole,
        orgRole: this.form.orgRole
      }
    ).subscribe({
      next: (member) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.dialogRef.close(member);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Invite error:', err);
        let msg: string;
        if (err.status === 0) {
          msg = 'Cannot connect to server. Make sure the backend is running.';
        } else if (err.status === 404) {
          msg = 'Endpoint not found (404). Please restart the backend server.';
        } else if (err.status === 409) {
          msg = err.error?.message || 'A user with this email already exists.';
        } else {
          msg = err.error?.message || err.error?.error || `Error ${err.status}: Failed to send invite.`;
        }
        this.snackBar.open(msg, 'Close', { duration: 6000, panelClass: ['snack-error'] });
      }
    });
  }
}
