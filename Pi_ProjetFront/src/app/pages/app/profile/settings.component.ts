import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../users/user.service';
import { FaceService } from '../../../auth/face.service';
import { FaceCameraComponent } from '../../../components/face-camera/face-camera.component';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('newPassword')?.value;
  const conf = control.get('confirmPassword')?.value;
  return pw && conf && pw !== conf ? { mismatch: true } : null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatDividerModule,
    MatProgressSpinnerModule, FaceCameraComponent
  ],
  template: `
    <div class="container settings-page mb-5">

      <!-- Page header -->
      <div class="settings-header mb-4">
        <h2>Settings</h2>
        <p class="text-secondary">Manage your profile, password and security</p>
      </div>

      <div class="row gx-4">

        <!-- ─── Avatar & Info ──────────────────────────────────────── -->
        <div class="col-12 col-lg-4 mb-4">
          <mat-card class="p-4 text-center">
            <!-- Avatar -->
            <div class="avatar-wrap mb-3" (click)="fileInput.click()">
              <div class="avatar-img" [style.background-image]="'url(' + (avatarPreview || currentUser()?.avatarUrl || defaultAvatar) + ')'"></div>
              <div class="avatar-overlay">
                <mat-icon>photo_camera</mat-icon>
              </div>
            </div>
            <input #fileInput type="file" accept="image/*" class="d-none" (change)="onFileChange($event)" />

            <h3 class="mb-0">{{ currentUser()?.fullName }}</h3>
            <p class="text-secondary small">{{ currentUser()?.email }}</p>
            <span class="role-badge">{{ currentUser()?.role }}</span>

            <div class="mt-3" *ngIf="avatarPreview">
              <button matButton color="primary" (click)="uploadAvatar()" [disabled]="avatarUploading">
                <mat-spinner diameter="16" *ngIf="avatarUploading"></mat-spinner>
                <mat-icon *ngIf="!avatarUploading">cloud_upload</mat-icon>
                {{ avatarUploading ? 'Uploading…' : 'Save Photo' }}
              </button>
              <button matButton (click)="cancelAvatar()" class="ms-2">Cancel</button>
            </div>
            <p class="feedback success" *ngIf="avatarMsg">{{ avatarMsg }}</p>
            <p class="feedback error" *ngIf="avatarError">{{ avatarError }}</p>
          </mat-card>
        </div>

        <div class="col-12 col-lg-8">

          <!-- ─── Personal Info ───────────────────────────────────── -->
          <mat-card class="p-4 mb-4">
            <h4 class="section-title">
              <mat-icon class="material-icons-outlined">person</mat-icon>
              Personal Information
            </h4>
            <mat-divider class="mb-3"></mat-divider>

            <form [formGroup]="infoForm" (ngSubmit)="saveInfo()">
              <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName" />
                <mat-icon matSuffix class="material-icons-outlined">badge</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>Email Address</mat-label>
                <input matInput formControlName="email" type="email" />
                <mat-icon matSuffix class="material-icons-outlined">mail</mat-icon>
                <mat-error *ngIf="infoForm.get('email')?.hasError('email')">Enter a valid email</mat-error>
              </mat-form-field>

              <button matButton="filled" color="primary" type="submit"
                      [disabled]="infoForm.invalid || infoForm.pristine || infoSaving">
                <mat-spinner diameter="16" *ngIf="infoSaving"></mat-spinner>
                <mat-icon *ngIf="!infoSaving">save</mat-icon>
                {{ infoSaving ? 'Saving…' : 'Save Changes' }}
              </button>

              <p class="feedback success mt-2" *ngIf="infoMsg">{{ infoMsg }}</p>
              <p class="feedback error mt-2" *ngIf="infoError">{{ infoError }}</p>
            </form>
          </mat-card>

          <!-- ─── Change Password ─────────────────────────────────── -->
          <mat-card class="p-4 mb-4">
            <h4 class="section-title">
              <mat-icon class="material-icons-outlined">lock</mat-icon>
              Change Password
            </h4>
            <mat-divider class="mb-3"></mat-divider>

            <form [formGroup]="pwForm" (ngSubmit)="changePassword()">
              <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>Current Password</mat-label>
                <input matInput formControlName="oldPassword" [type]="hideOld ? 'password' : 'text'" />
                <button matIconButton matSuffix type="button" (click)="hideOld = !hideOld">
                  <mat-icon class="material-icons-outlined">{{ hideOld ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" [type]="hideNew ? 'password' : 'text'" />
                <button matIconButton matSuffix type="button" (click)="hideNew = !hideNew">
                  <mat-icon class="material-icons-outlined">{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="pwForm.get('newPassword')?.hasError('minlength')">At least 8 characters</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>Confirm New Password</mat-label>
                <input matInput formControlName="confirmPassword" [type]="hideConf ? 'password' : 'text'" />
                <button matIconButton matSuffix type="button" (click)="hideConf = !hideConf">
                  <mat-icon class="material-icons-outlined">{{ hideConf ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="pwForm.hasError('mismatch')">Passwords do not match</mat-error>
              </mat-form-field>

              <button matButton="filled" color="primary" type="submit"
                      [disabled]="pwForm.invalid || pwSaving">
                <mat-spinner diameter="16" *ngIf="pwSaving"></mat-spinner>
                <mat-icon *ngIf="!pwSaving">lock_reset</mat-icon>
                {{ pwSaving ? 'Updating…' : 'Update Password' }}
              </button>

              <p class="feedback success mt-2" *ngIf="pwMsg">{{ pwMsg }}</p>
              <p class="feedback error mt-2" *ngIf="pwError">{{ pwError }}</p>
            </form>
          </mat-card>

          <!-- ─── Face ID ────────────────────────────────────────── -->
          <mat-card class="p-4 mb-4">
            <h4 class="section-title">
              <mat-icon class="material-icons-outlined">face</mat-icon>
              Face ID
            </h4>
            <mat-divider class="mb-3"></mat-divider>

            <!-- Registered state -->
            <div class="face-status" *ngIf="!showFaceRegistration">
              <div *ngIf="faceRegistered" class="face-registered">
                <mat-icon class="text-success">check_circle</mat-icon>
                <div>
                  <strong>Face ID is registered</strong>
                  <p class="text-secondary small mb-0">Registered on {{ faceRegisteredAt | date:'MMMM d, yyyy' }}</p>
                </div>
              </div>
              <div *ngIf="!faceRegistered" class="face-not-registered">
                <mat-icon class="text-secondary">face_retouching_off</mat-icon>
                <div>
                  <strong>Face ID not registered</strong>
                  <p class="text-secondary small mb-0">Register your face to enable passwordless login</p>
                </div>
              </div>

              <div class="face-btns mt-3">
                <button matButton color="primary" (click)="showFaceRegistration = true">
                  <mat-icon class="material-icons-outlined">{{ faceRegistered ? 'refresh' : 'add_circle' }}</mat-icon>
                  {{ faceRegistered ? 'Update Face ID' : 'Register Face ID' }}
                </button>
                <button matButton color="warn" *ngIf="faceRegistered" (click)="removeFace()" [disabled]="faceRemoving"
                        class="ms-2">
                  <mat-spinner diameter="16" *ngIf="faceRemoving"></mat-spinner>
                  <mat-icon *ngIf="!faceRemoving">delete</mat-icon>
                  {{ faceRemoving ? 'Removing…' : 'Remove Face ID' }}
                </button>
              </div>
              <p class="feedback success mt-2" *ngIf="faceMsg">{{ faceMsg }}</p>
              <p class="feedback error mt-2" *ngIf="faceError">{{ faceError }}</p>
            </div>

            <!-- Camera for registration -->
            <div *ngIf="showFaceRegistration">
              <p class="text-secondary small mb-3">Position your face in the frame and click Scan.</p>
              <app-face-camera (descriptor)="onFaceDescriptor($event)"></app-face-camera>
              <div class="mt-3">
                <button matButton (click)="showFaceRegistration = false">
                  <mat-icon>close</mat-icon> Cancel
                </button>
              </div>
              <p class="feedback success mt-2" *ngIf="faceMsg">{{ faceMsg }}</p>
              <p class="feedback error mt-2" *ngIf="faceError">{{ faceError }}</p>
            </div>
          </mat-card>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding-top: 24px; }
    .settings-header h2 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }

    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 600; margin: 0 0 12px;
    }
    .section-title mat-icon { color: #6366f1; }

    /* Avatar */
    .avatar-wrap {
      position: relative; width: 120px; height: 120px;
      border-radius: 50%; margin: 0 auto 12px; cursor: pointer; overflow: hidden;
      border: 3px solid #6366f1;
    }
    .avatar-img {
      width: 100%; height: 100%; border-radius: 50%;
      background-size: cover; background-position: center;
    }
    .avatar-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
      border-radius: 50%;
    }
    .avatar-overlay mat-icon { color: white; font-size: 28px; }
    .avatar-wrap:hover .avatar-overlay { opacity: 1; }

    .role-badge {
      display: inline-block; background: #eef2ff; color: #4f46e5;
      border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 600;
    }

    /* Feedback */
    .feedback { font-size: 13px; margin: 0; }
    .feedback.success { color: #10b981; }
    .feedback.error   { color: #ef4444; }

    /* Face */
    .face-status { display: flex; flex-direction: column; }
    .face-registered, .face-not-registered {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; border-radius: 10px;
      border: 1px solid var(--bs-border-color, #e5e7eb);
    }
    .face-registered { background: #f0fdf4; border-color: #bbf7d0; }
    .face-registered mat-icon { color: #10b981; font-size: 28px; width: 28px; height: 28px; }
    .face-not-registered mat-icon { color: #9ca3af; font-size: 28px; width: 28px; height: 28px; }
    .text-success { color: #10b981 !important; }
  `]
})
export class SettingsComponent implements OnInit {

  // Signal réactif — Angular détecte les changements automatiquement dans le template
  readonly currentUser = computed(() => this.authService.currentUser());
  defaultAvatar = 'assets/img/user-6.jpg';

  // Avatar
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  avatarUploading = false;
  avatarMsg = '';
  avatarError = '';

  // Info form
  infoForm: FormGroup;
  infoSaving = false;
  infoMsg = '';
  infoError = '';

  // Password form
  pwForm: FormGroup;
  pwSaving = false;
  pwMsg = '';
  pwError = '';
  hideOld = true; hideNew = true; hideConf = true;

  // Face ID
  showFaceRegistration = false;
  faceRegistered = false;
  faceRegisteredAt: string | null = null;
  faceRemoving = false;
  faceMsg = '';
  faceError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private faceService: FaceService
  ) {
    this.infoForm = this.fb.group({
      fullName: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]]
    });

    this.pwForm = this.fb.group({
      oldPassword:     ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    const u = this.currentUser();
    if (u) {
      this.infoForm.patchValue({ fullName: u.fullName, email: u.email });
    }
    // Load full user data for face info
    const userId = this.authService.getUserId();
    if (userId) {
      this.userService.getById(userId).subscribe(dto => {
        this.faceRegistered    = !!dto.faceRegisteredAt;
        this.faceRegisteredAt  = dto.faceRegisteredAt ?? null;
      });
    }
  }

  // ── Avatar ──────────────────────────────────────────────────────
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.avatarFile  = file;
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview = e.target?.result as string;
    reader.readAsDataURL(file);
    this.avatarMsg = '';
    this.avatarError = '';
  }

  cancelAvatar(): void {
    this.avatarPreview = null;
    this.avatarFile    = null;
  }

  uploadAvatar(): void {
    if (!this.avatarFile) return;
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.avatarUploading = true;
    this.avatarError = '';
    this.userService.uploadAvatar(userId, this.avatarFile).subscribe({
      next: (dto) => {
        this.avatarUploading = false;
        this.avatarPreview   = null;
        this.avatarFile      = null;
        this.avatarMsg       = 'Photo updated successfully!';
        // Update signal so header reflects immediately
        const cur = this.currentUser();
        if (cur) {
          this.authService.currentUser.set({ ...cur, avatarUrl: dto.avatarUrl });
        }
        setTimeout(() => this.avatarMsg = '', 3000);
      },
      error: () => {
        this.avatarUploading = false;
        this.avatarError = 'Upload failed. Please try again.';
      }
    });
  }

  // ── Info ─────────────────────────────────────────────────────────
  saveInfo(): void {
    if (this.infoForm.invalid) return;
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.infoSaving = true;
    this.infoError  = '';

    const { fullName, email } = this.infoForm.value;
    this.userService.update(userId, { fullName, email }).subscribe({
      next: (dto) => {
        this.infoSaving = false;
        this.infoMsg    = 'Profile updated successfully!';
        const cur = this.currentUser();
        if (cur) {
          this.authService.currentUser.set({ ...cur, fullName: dto.fullName, email: dto.email });
        }
        this.infoForm.markAsPristine();
        setTimeout(() => this.infoMsg = '', 3000);
      },
      error: (err) => {
        this.infoSaving = false;
        this.infoError  = err.error?.message ?? 'Update failed.';
      }
    });
  }

  // ── Password ──────────────────────────────────────────────────────
  changePassword(): void {
    if (this.pwForm.invalid) return;
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.pwSaving = true;
    this.pwError  = '';

    const { oldPassword, newPassword } = this.pwForm.value;
    this.userService.changePassword(userId, oldPassword, newPassword).subscribe({
      next: () => {
        this.pwSaving = false;
        this.pwMsg    = 'Password changed successfully!';
        this.pwForm.reset();
        setTimeout(() => this.pwMsg = '', 3000);
      },
      error: (err) => {
        this.pwSaving = false;
        this.pwError  = err.error?.message ?? 'Password change failed.';
      }
    });
  }

  // ── Face ID ──────────────────────────────────────────────────────
  onFaceDescriptor(descriptor: number[]): void {
    this.faceMsg   = '';
    this.faceError = '';
    this.faceService.registerFace(descriptor).subscribe({
      next: () => {
        this.faceRegistered      = true;
        this.faceRegisteredAt    = new Date().toISOString();
        this.showFaceRegistration = false;
        this.faceMsg = 'Face ID registered successfully!';
        setTimeout(() => this.faceMsg = '', 4000);
      },
      error: (err) => {
        this.showFaceRegistration = false;
        this.faceError = err.error?.message ?? 'Face registration failed.';
      }
    });
  }

  removeFace(): void {
    this.faceRemoving = true;
    this.faceMsg = '';
    this.faceError = '';
    this.faceService.removeFace().subscribe({
      next: () => {
        this.faceRemoving     = false;
        this.faceRegistered   = false;
        this.faceRegisteredAt = null;
        this.faceMsg = 'Face ID removed.';
        setTimeout(() => this.faceMsg = '', 3000);
      },
      error: () => {
        this.faceRemoving = false;
        this.faceError = 'Failed to remove Face ID.';
      }
    });
  }
}
