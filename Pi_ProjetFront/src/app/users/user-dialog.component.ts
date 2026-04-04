import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
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
    <mat-dialog-content>
      <form [formGroup]="form" class="pt-2">
        <div class="row gx-3">
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Full Name</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">person</mat-icon>
              <input matInput formControlName="fullName" />
              <mat-error *ngIf="form.get('fullName')?.invalid">Full name is required</mat-error>
            </mat-form-field>
          </div>
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">email</mat-icon>
              <input matInput formControlName="email" type="email" />
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email format</mat-error>
            </mat-form-field>
          </div>
          <div class="col-12 col-lg-6" *ngIf="data.mode === 'create'">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">lock</mat-icon>
              <input matInput formControlName="password" type="password" />
              <mat-error *ngIf="form.get('password')?.invalid">Password is required (min 6 characters)</mat-error>
            </mat-form-field>
          </div>
          <div class="col-12 col-lg-6">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Role</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">badge</mat-icon>
              <mat-select formControlName="role">
                <mat-option *ngFor="let r of data.availableRoles" [value]="r">{{ r }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton="filled" color="primary" [disabled]="form.invalid" (click)="onSave()">
        {{ data.mode === 'create' ? 'Create User' : 'Save Changes' }}
      </button>
      <button matButton (click)="onCancel()" class="ms-auto theme-red">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [``]
})
export class UserDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData
  ) {
    this.form = new FormGroup({
      fullName: new FormControl(data.user?.fullName ?? '', Validators.required),
      email: new FormControl(data.user?.email ?? '', [Validators.required, Validators.email]),
      password: new FormControl('', data.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []),
      role: new FormControl(data.user?.role ?? data.availableRoles[0])
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
