import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { inject } from '@angular/core';
import { UserDTO } from './user.service';

export interface UserDialogData {
  mode: 'create' | 'edit';
  user?: UserDTO;
  availableRoles: string[];
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatInputModule, MatFormFieldModule, MatIconModule, MatButtonModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h4 mat-dialog-title>{{ data.mode === 'create' ? 'Add New User' : 'Edit User' }}</h4>
    <mat-dialog-content style="min-width:480px">
      <form [formGroup]="form" class="pt-2">
        <div class="row gx-3">

          <!-- Full Name -->
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100 mb-1">
              <mat-label>Full Name</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">person</mat-icon>
              <input matInput formControlName="fullName" placeholder="Alice Martin" />
              <mat-error *ngIf="f['fullName'].hasError('required')">Full name is required</mat-error>
              <mat-error *ngIf="f['fullName'].hasError('minlength')">At least 2 characters</mat-error>
              <mat-error *ngIf="f['fullName'].hasError('maxlength')">100 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Email -->
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100 mb-1">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">email</mat-icon>
              <input matInput formControlName="email" type="email" placeholder="alice@company.com" />
              <mat-error *ngIf="f['email'].hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="f['email'].hasError('email')">Enter a valid email address</mat-error>
              <mat-error *ngIf="f['email'].hasError('maxlength')">150 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Password (create only) -->
          <div class="col-12 col-lg-6" *ngIf="data.mode === 'create'">
            <mat-form-field appearance="outline" class="w-100 mb-1">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">lock</mat-icon>
              <input matInput formControlName="password" [type]="showPassword ? 'text' : 'password'" />
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword" tabindex="-1">
                <mat-icon class="material-icons-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="f['password'].hasError('required')">Password is required</mat-error>
              <mat-error *ngIf="f['password'].hasError('minlength')">At least 8 characters</mat-error>
              <mat-error *ngIf="f['password'].hasError('maxlength')">50 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Role -->
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100 mb-1">
              <mat-label>Role</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">badge</mat-icon>
              <mat-select formControlName="role">
                <mat-option *ngFor="let r of data.availableRoles" [value]="r">{{ r }}</mat-option>
              </mat-select>
              <mat-error *ngIf="f['role'].hasError('required')">Role is required</mat-error>
            </mat-form-field>
          </div>

        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="px-3 pb-3 gap-2">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
        <mat-icon class="material-icons-outlined me-1">{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
        {{ data.mode === 'create' ? 'Create User' : 'Save Changes' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [``]
})
export class UserDialogComponent {
  private fb = inject(FormBuilder);

  form: FormGroup;
  showPassword = false;

  get f() { return this.form.controls; }

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData
  ) {
    const isCreate = data.mode === 'create';
    this.form = this.fb.group({
      fullName: [data.user?.fullName ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email:    [data.user?.email    ?? '', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', isCreate ? [Validators.required, Validators.minLength(8), Validators.maxLength(50)] : []],
      role:     [data.user?.role     ?? data.availableRoles[0], Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
