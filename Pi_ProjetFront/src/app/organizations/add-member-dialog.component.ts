import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { AuthService } from '../auth/auth.service';

/**
 * Roles an ADMIN can assign when inviting a member to their org.
 * SUPER_ADMIN = app owner (cannot be assigned via invite)
 * VIEWER = temporary test role (not a real org member)
 */
const ADMIN_ROLES: Record<string, { value: string; label: string }[]> = {
  ENTERPRISE: [
    { value: 'MANAGER',       label: 'Manager' },
    { value: 'EMPLOYEE',      label: 'Employee' },
    { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  ],
  ACADEMIC: [
    { value: 'TUTOR',   label: 'Tutor' },
    { value: 'STUDENT', label: 'Student' },
  ]
};

/** Full list available to SUPER_ADMIN only */
const SUPERADMIN_ROLES: Record<string, { value: string; label: string }[]> = {
  ENTERPRISE: [
    { value: 'SUPER_ADMIN',   label: 'Super Admin' },
    { value: 'ADMIN',         label: 'Admin' },
    { value: 'MANAGER',       label: 'Manager' },
    { value: 'EMPLOYEE',      label: 'Employee' },
    { value: 'PRODUCT_OWNER', label: 'Product Owner' },
    { value: 'VIEWER',        label: 'Viewer' },
  ],
  ACADEMIC: [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'ADMIN',       label: 'Admin' },
    { value: 'MANAGER',     label: 'Manager' },
    { value: 'TUTOR',       label: 'Tutor' },
    { value: 'STUDENT',     label: 'Student' },
    { value: 'VIEWER',      label: 'Viewer' },
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
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
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
        A new account will be created and credentials sent by email.
      </span>
    </div>

    <mat-dialog-content style="min-width:440px">
      <form [formGroup]="form" class="pt-2">

        <!-- Full Name -->
        <mat-form-field appearance="outline" class="w-100 mb-1">
          <mat-label>Full Name</mat-label>
          <mat-icon matPrefix class="material-icons-outlined">badge</mat-icon>
          <input matInput formControlName="fullName" placeholder="Alice Martin" />
          <mat-error *ngIf="f['fullName'].hasError('required')">Full name is required</mat-error>
          <mat-error *ngIf="f['fullName'].hasError('minlength')">At least 2 characters</mat-error>
          <mat-error *ngIf="f['fullName'].hasError('maxlength')">100 characters maximum</mat-error>
        </mat-form-field>

        <!-- Email -->
        <mat-form-field appearance="outline" class="w-100 mb-1">
          <mat-label>Email Address</mat-label>
          <mat-icon matPrefix class="material-icons-outlined">email</mat-icon>
          <input matInput type="email" formControlName="email" placeholder="alice@company.com" />
          <mat-error *ngIf="f['email'].hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="f['email'].hasError('email')">Enter a valid email address</mat-error>
          <mat-error *ngIf="f['email'].hasError('maxlength')">150 characters maximum</mat-error>
        </mat-form-field>

        <!-- Role -->
        <mat-form-field appearance="outline" class="w-100 mb-1">
          <mat-label>Role</mat-label>
          <mat-icon matPrefix class="material-icons-outlined">work</mat-icon>
          <mat-select formControlName="platformRole">
            <mat-option *ngFor="let r of platformRoles" [value]="r.value">{{ r.label }}</mat-option>
          </mat-select>
          <mat-hint>Defines what the user can do on the platform</mat-hint>
          <mat-error *ngIf="f['platformRole'].hasError('required')">Role is required</mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="px-3 pb-3 gap-2">
      <button mat-button mat-dialog-close [disabled]="loading">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || loading" (click)="submit()">
        <mat-spinner *ngIf="loading" diameter="18" class="d-inline-block me-1"></mat-spinner>
        <mat-icon *ngIf="!loading" class="material-icons-outlined me-1">send</mat-icon>
        Send Invite
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }`]
})
export class AddMemberDialogComponent {
  private http        = inject(HttpClient);
  private snackBar    = inject(MatSnackBar);
  private cdr         = inject(ChangeDetectorRef);
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);

  form: FormGroup;
  loading = false;

  get platformRoles() {
    const isSuperAdmin = this.authService.currentUser()?.role === 'SUPER_ADMIN';
    const map = isSuperAdmin ? SUPERADMIN_ROLES : ADMIN_ROLES;
    return map[this.data.orgType] ?? map['ENTERPRISE'];
  }

  get f() { return this.form.controls; }

  constructor(
    public dialogRef: MatDialogRef<AddMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InviteDialogData
  ) {
    this.form = this.fb.group({
      fullName:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email:        ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      platformRole: ['', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    const { fullName, email, platformRole } = this.form.value;

    this.http.post(
      `http://localhost:8084/api/organizations/${this.data.orgId}/members/invite`,
      { fullName: fullName.trim(), email: email.trim(), platformRole, orgRole: 'MEMBER' }
    ).subscribe({
      next: (member) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.dialogRef.close(member);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        let msg: string;
        const errMsg = err.error?.message || err.error?.detail;
        if      (err.status === 0)   msg = 'Cannot connect to server. Make sure the backend is running.';
        else if (err.status === 404) msg = 'Endpoint not found (404). Please restart the backend server.';
        else if (err.status === 409) msg = errMsg || 'An invitation is already pending for this email.';
        else                         msg = errMsg || `Error ${err.status}: Failed to send invite.`;
        this.snackBar.open(msg, 'Close', { duration: 6000, panelClass: ['snack-error'] });
      }
    });
  }
}
