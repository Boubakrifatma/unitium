import { Component, OnInit, computed, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormGroupDirective, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';

import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../users/user.service';
import { FaceService } from '../../../auth/face.service';
import { FaceCameraComponent } from '../../../components/face-camera/face-camera.component';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('newPassword')?.value;
  const conf = control.get('confirmPassword')?.value;
  return pw && conf && pw !== conf ? { mismatch: true } : null;
}

const NAV_ITEMS = [
  { key: 'profile',       label: 'Profile',       icon: 'person',        subtitle: 'Manage your personal information and avatar' },
  { key: 'security',      label: 'Security',       icon: 'lock',          subtitle: 'Password, Face ID, 2FA and active sessions' },
  { key: 'appearance',    label: 'Appearance',     icon: 'palette',       subtitle: 'Theme, color scheme and display preferences' },
  { key: 'notifications', label: 'Notifications',  icon: 'notifications', subtitle: 'Configure how and when you receive alerts' },
  { key: 'privacy',       label: 'Privacy',        icon: 'shield',        subtitle: 'Control your data and privacy settings' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatDividerModule,
    MatProgressSpinnerModule, MatListModule, FaceCameraComponent
  ],
  template: `
    <div class="settings-page fade-in">

      <!-- ── Mobile section pills ─────────────────────────────────── -->
      <div class="mobile-nav">
        <div class="mobile-nav-scroll">
          <button *ngFor="let item of navItems"
                  class="mobile-nav-btn"
                  [class.active]="activeSection() === item.key"
                  (click)="activeSection.set(item.key)">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- ── Shell ─────────────────────────────────────────────────── -->
      <div class="settings-shell">

        <!-- Sidebar nav (desktop) -->
        <aside class="settings-sidebar">
          <div class="sidebar-inner">
            <div class="sidebar-label">Settings</div>
            <nav class="sidebar-nav">
              <button *ngFor="let item of navItems"
                      class="nav-item"
                      [class.active]="activeSection() === item.key"
                      (click)="activeSection.set(item.key)">
                <div class="nav-icon" [class.active]="activeSection() === item.key">
                  <mat-icon>{{ item.icon }}</mat-icon>
                </div>
                <span class="nav-label">{{ item.label }}</span>
                <mat-icon class="nav-chevron">chevron_right</mat-icon>
              </button>
            </nav>
          </div>
        </aside>

        <!-- ── Main content ─────────────────────────────────────────── -->
        <main class="settings-main">

          <!-- Section header -->
          <div class="section-page-header">
            <div class="sph-icon-wrap">
              <mat-icon>{{ currentNav().icon }}</mat-icon>
            </div>
            <div>
              <h2 class="sph-title">{{ currentNav().label }}</h2>
              <p class="sph-subtitle">{{ currentNav().subtitle }}</p>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!--  PROFILE SECTION                                          -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <ng-container *ngIf="activeSection() === 'profile'">

            <!-- Avatar card -->
            <div class="settings-card mb-4">
              <div class="settings-card-header">
                <h4 class="sc-title">Profile Photo</h4>
                <p class="sc-subtitle">Click on your avatar to upload a new photo</p>
              </div>
              <div class="avatar-section">
                <div class="avatar-wrap" (click)="!avatarUploading && fileInput.click()">
                  <div class="avatar-img" [style.background-image]="'url(' + (avatarPreview || currentUser()?.avatarUrl || defaultAvatar) + ')'"></div>
                  <div class="avatar-overlay" *ngIf="!avatarUploading"><mat-icon>photo_camera</mat-icon></div>
                  <div class="avatar-loading-overlay" *ngIf="avatarUploading">
                    <mat-spinner diameter="28" color="accent"></mat-spinner>
                  </div>
                </div>
                <input #fileInput type="file" accept="image/*" class="d-none" (change)="onFileChange($event)" />
                <div class="avatar-meta">
                  <h3 class="avatar-name">{{ currentUser()?.fullName }}</h3>
                  <p class="avatar-email">{{ currentUser()?.email }}</p>
                  <span class="role-pill">{{ currentUser()?.role }}</span>
                  <p class="feedback success mt-2" *ngIf="avatarMsg">{{ avatarMsg }}</p>
                  <p class="feedback error mt-2" *ngIf="avatarError">{{ avatarError }}</p>
                </div>
              </div>
            </div>

            <!-- Personal info form -->
            <div class="settings-card">
              <div class="settings-card-header">
                <h4 class="sc-title">Personal Information</h4>
                <p class="sc-subtitle">Update your full name and email address</p>
              </div>
              <div class="settings-card-body">
                <form [formGroup]="infoForm" (ngSubmit)="saveInfo()">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Full Name</mat-label>
                      <input matInput formControlName="fullName" />
                      <mat-icon matSuffix class="material-icons-outlined">badge</mat-icon>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Email Address</mat-label>
                      <input matInput formControlName="email" type="email" />
                      <mat-icon matSuffix class="material-icons-outlined">mail</mat-icon>
                      <mat-error *ngIf="infoForm.get('email')?.hasError('email')">Enter a valid email</mat-error>
                    </mat-form-field>
                  </div>
                  <div class="form-actions">
                    <p class="feedback success" *ngIf="infoMsg">{{ infoMsg }}</p>
                    <p class="feedback error" *ngIf="infoError">{{ infoError }}</p>
                    <button matButton="filled" color="primary" type="submit"
                            [disabled]="infoForm.invalid || infoForm.pristine || infoSaving">
                      <mat-spinner diameter="16" *ngIf="infoSaving"></mat-spinner>
                      <mat-icon *ngIf="!infoSaving">save</mat-icon>
                      {{ infoSaving ? 'Saving…' : 'Save Changes' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </ng-container>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!--  SECURITY SECTION                                         -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <ng-container *ngIf="activeSection() === 'security'">

            <!-- Change Password -->
            <div class="settings-card mb-4">
              <div class="settings-card-header">
                <div class="sc-header-icon">
                  <mat-icon class="material-icons-outlined">lock</mat-icon>
                </div>
                <div>
                  <h4 class="sc-title">Change Password</h4>
                  <p class="sc-subtitle">Update your login password regularly to stay secure</p>
                </div>
              </div>
              <div class="settings-card-body">
                <form [formGroup]="pwForm" #pwFormRef="ngForm" (ngSubmit)="changePassword()">
                  <mat-form-field appearance="outline" class="w-100 mb-3">
                    <mat-label>Current Password</mat-label>
                    <input matInput formControlName="oldPassword" [type]="hideOld ? 'password' : 'text'" />
                    <button matIconButton matSuffix type="button" (click)="hideOld = !hideOld">
                      <mat-icon class="material-icons-outlined">{{ hideOld ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    <mat-error *ngIf="pwForm.get('oldPassword')?.hasError('required')">Current password is required</mat-error>
                  </mat-form-field>
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>New Password</mat-label>
                      <input matInput formControlName="newPassword" [type]="hideNew ? 'password' : 'text'" />
                      <button matIconButton matSuffix type="button" (click)="hideNew = !hideNew">
                        <mat-icon class="material-icons-outlined">{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="pwForm.get('newPassword')?.hasError('required')">New password is required</mat-error>
                      <mat-error *ngIf="pwForm.get('newPassword')?.hasError('minlength')">At least 8 characters</mat-error>
                      <mat-error *ngIf="pwForm.get('newPassword')?.hasError('maxlength')">50 characters maximum</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Confirm New Password</mat-label>
                      <input matInput formControlName="confirmPassword" [type]="hideConf ? 'password' : 'text'" />
                      <button matIconButton matSuffix type="button" (click)="hideConf = !hideConf">
                        <mat-icon class="material-icons-outlined">{{ hideConf ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="pwForm.get('confirmPassword')?.hasError('required')">Please confirm your password</mat-error>
                      <mat-error *ngIf="pwForm.hasError('mismatch') && pwForm.get('confirmPassword')?.touched">Passwords do not match</mat-error>
                    </mat-form-field>
                  </div>
                  <div class="form-actions">
                    <p class="feedback success" *ngIf="pwMsg">{{ pwMsg }}</p>
                    <p class="feedback error" *ngIf="pwError">{{ pwError }}</p>
                    <button matButton="filled" color="primary" type="submit" [disabled]="pwSaving">
                      <mat-spinner diameter="16" *ngIf="pwSaving"></mat-spinner>
                      <mat-icon *ngIf="!pwSaving">lock_reset</mat-icon>
                      {{ pwSaving ? 'Updating…' : 'Update Password' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Face ID -->
            <div class="settings-card mb-4">
              <div class="settings-card-header">
                <div class="sc-header-icon">
                  <mat-icon class="material-icons-outlined">face</mat-icon>
                </div>
                <div>
                  <h4 class="sc-title">Face ID</h4>
                  <p class="sc-subtitle">Register your face for passwordless login</p>
                </div>
                <div class="ms-auto">
                  <span class="status-badge" [class.active]="faceRegistered">
                    {{ faceRegistered ? 'Registered' : 'Not set up' }}
                  </span>
                </div>
              </div>
              <div class="settings-card-body">
                <div *ngIf="!showFaceRegistration">
                  <div class="security-status-row" [class.registered]="faceRegistered">
                    <mat-icon class="ssr-icon">{{ faceRegistered ? 'check_circle' : 'face_retouching_off' }}</mat-icon>
                    <div class="ssr-text">
                      <strong>{{ faceRegistered ? 'Face ID is active' : 'Face ID not registered' }}</strong>
                      <span *ngIf="faceRegistered">Registered on {{ faceRegisteredAt | date:'MMMM d, yyyy' }}</span>
                      <span *ngIf="!faceRegistered">Enable passwordless login with your face</span>
                    </div>
                  </div>
                  <div class="d-flex gap-2 mt-3">
                    <button matButton="filled" color="primary" (click)="showFaceRegistration = true">
                      <mat-icon class="material-icons-outlined">{{ faceRegistered ? 'refresh' : 'add_circle' }}</mat-icon>
                      {{ faceRegistered ? 'Update Face ID' : 'Register Face ID' }}
                    </button>
                    <button matButton color="warn" *ngIf="faceRegistered" (click)="removeFace()" [disabled]="faceRemoving">
                      <mat-spinner diameter="16" *ngIf="faceRemoving"></mat-spinner>
                      <mat-icon *ngIf="!faceRemoving">delete</mat-icon>
                      {{ faceRemoving ? 'Removing…' : 'Remove' }}
                    </button>
                  </div>
                  <p class="feedback success mt-2" *ngIf="faceMsg">{{ faceMsg }}</p>
                  <p class="feedback error mt-2" *ngIf="faceError">{{ faceError }}</p>
                </div>
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
              </div>
            </div>

            <!-- Two-Factor Authentication -->
            <div class="settings-card mb-4">
              <div class="settings-card-header">
                <div class="sc-header-icon">
                  <mat-icon class="material-icons-outlined">security</mat-icon>
                </div>
                <div>
                  <h4 class="sc-title">Two-Factor Authentication</h4>
                  <p class="sc-subtitle">Add an extra layer of security with Google Authenticator</p>
                </div>
                <div class="ms-auto">
                  <span class="status-badge" [class.active]="mfaEnabled">
                    {{ mfaEnabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>
              <div class="settings-card-body">
                <!-- 2FA disabled -->
                <div *ngIf="!mfaEnabled && !showMfaSetup">
                  <div class="security-status-row">
                    <mat-icon class="ssr-icon">lock_open</mat-icon>
                    <div class="ssr-text">
                      <strong>2FA is not enabled</strong>
                      <span>Protect your account with a time-based one-time password</span>
                    </div>
                  </div>
                  <button matButton="filled" color="primary" class="mt-3" (click)="startMfaSetup()">
                    <mat-icon class="material-icons-outlined">add_circle</mat-icon>
                    Enable 2FA
                  </button>
                </div>
                <!-- 2FA enabled -->
                <div *ngIf="mfaEnabled && !showMfaDisable">
                  <div class="security-status-row registered">
                    <mat-icon class="ssr-icon">verified_user</mat-icon>
                    <div class="ssr-text">
                      <strong>2FA is active</strong>
                      <span>Your account is protected with Google Authenticator</span>
                    </div>
                  </div>
                  <button matButton color="warn" class="mt-3" (click)="showMfaDisable = true">
                    <mat-icon>block</mat-icon> Disable 2FA
                  </button>
                </div>
                <!-- Setup: QR code -->
                <div *ngIf="showMfaSetup && !mfaEnabled">
                  <p class="small text-secondary mb-3">
                    <strong>Step 1</strong> — Scan this QR code with <strong>Google Authenticator</strong>
                  </p>
                  <div class="qr-wrap" *ngIf="mfaQrUrl">
                    <img [src]="qrImageUrl" alt="QR Code 2FA" class="qr-img"
                         (error)="qrImageUrl = ''" />
                    <p *ngIf="!qrImageUrl" class="small text-secondary mt-1" style="color:#ef4444;font-size:12px">
                      QR code indisponible — utilisez la clé manuelle ci-dessous.
                    </p>
                    <p class="small text-secondary mt-2">
                      Clé manuelle : <code class="secret-code">{{ mfaSecret }}</code>
                    </p>
                  </div>
                  <p class="small text-secondary mb-2 mt-3">
                    <strong>Step 2</strong> — Enter the 6-digit code from the app
                  </p>
                  <mat-form-field appearance="outline" class="w-100 mb-2" style="max-width:220px">
                    <mat-label>6-digit code</mat-label>
                    <input matInput [(ngModel)]="mfaVerifyCode" maxlength="6" placeholder="000000" inputmode="numeric" />
                  </mat-form-field>
                  <div class="d-flex gap-2 mt-1">
                    <button matButton="filled" color="primary"
                            (click)="confirmEnableMfa()"
                            [disabled]="mfaVerifyCode.length !== 6 || mfaSaving">
                      <mat-spinner diameter="16" *ngIf="mfaSaving"></mat-spinner>
                      <mat-icon *ngIf="!mfaSaving">check_circle</mat-icon>
                      {{ mfaSaving ? 'Activating…' : 'Activate 2FA' }}
                    </button>
                    <button matButton (click)="cancelMfaSetup()">Cancel</button>
                  </div>
                </div>
                <!-- Disable: confirm code -->
                <div *ngIf="showMfaDisable && mfaEnabled">
                  <p class="small text-secondary mb-2">
                    Enter your 6-digit code from Google Authenticator to confirm.
                  </p>
                  <mat-form-field appearance="outline" class="w-100 mb-2" style="max-width:220px">
                    <mat-label>6-digit code</mat-label>
                    <input matInput [(ngModel)]="mfaVerifyCode" maxlength="6" placeholder="000000" inputmode="numeric" />
                  </mat-form-field>
                  <div class="d-flex gap-2 mt-1">
                    <button matButton="filled" color="warn"
                            (click)="confirmDisableMfa()"
                            [disabled]="mfaVerifyCode.length !== 6 || mfaSaving">
                      <mat-spinner diameter="16" *ngIf="mfaSaving"></mat-spinner>
                      <mat-icon *ngIf="!mfaSaving">block</mat-icon>
                      {{ mfaSaving ? 'Disabling…' : 'Confirm Disable' }}
                    </button>
                    <button matButton (click)="showMfaDisable = false; mfaVerifyCode = ''">Cancel</button>
                  </div>
                </div>
                <p class="feedback success mt-2" *ngIf="mfaMsg">{{ mfaMsg }}</p>
                <p class="feedback error mt-2" *ngIf="mfaError">{{ mfaError }}</p>
              </div>
            </div>

            <!-- Active Sessions -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="sc-header-icon">
                  <mat-icon class="material-icons-outlined">devices</mat-icon>
                </div>
                <div>
                  <h4 class="sc-title">Active Sessions</h4>
                  <p class="sc-subtitle">Devices currently signed in to your account</p>
                </div>
              </div>
              <div class="sessions-list">
                <div *ngIf="sessions.length === 0" class="empty-sessions">
                  <mat-icon class="material-icons-outlined">devices_other</mat-icon>
                  <p>No active sessions found</p>
                </div>
                <div *ngFor="let s of sessions" class="session-item">
                  <div class="session-icon">
                    <mat-icon class="material-icons-outlined">computer</mat-icon>
                  </div>
                  <div class="session-info">
                    <p class="session-ip">{{ s.ipAddress ?? 'Unknown IP' }}</p>
                    <p class="session-ua">{{ s.userAgent | slice:0:60 }}…</p>
                    <p class="session-date">{{ s.createdAt | date:'MMM d, yyyy · HH:mm' }}</p>
                  </div>
                  <button matButton color="warn" (click)="revokeSession(s)" class="session-revoke">
                    <mat-icon style="font-size:16px;height:16px;width:16px">logout</mat-icon>
                    Revoke
                  </button>
                </div>
              </div>
            </div>

          </ng-container>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!--  APPEARANCE SECTION                                       -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <ng-container *ngIf="activeSection() === 'appearance'">
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="sc-header-icon">
                  <mat-icon class="material-icons-outlined">palette</mat-icon>
                </div>
                <div>
                  <h4 class="sc-title">Theme & Appearance</h4>
                  <p class="sc-subtitle">Customize the look and feel of your interface</p>
                </div>
              </div>
              <div class="settings-card-body">
                <div class="appearance-info-card">
                  <mat-icon class="material-icons-outlined aic-icon">tips_and_updates</mat-icon>
                  <div>
                    <p class="aic-title">Theme settings are in the top toolbar</p>
                    <p class="aic-body">
                      Use the paintbrush icon in the header to switch between light and dark mode,
                      change the color theme, and adjust the sidebar layout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!--  NOTIFICATIONS SECTION (placeholder)                      -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <ng-container *ngIf="activeSection() === 'notifications'">
            <div class="settings-card">
              <div class="settings-card-body">
                <div class="coming-soon">
                  <mat-icon class="material-icons-outlined cs-icon">notifications_none</mat-icon>
                  <h4 class="cs-title">Notification preferences coming soon</h4>
                  <p class="cs-body">You'll be able to control email and in-app notification settings here.</p>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!--  PRIVACY SECTION (placeholder)                            -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <ng-container *ngIf="activeSection() === 'privacy'">
            <div class="settings-card">
              <div class="settings-card-body">
                <div class="coming-soon">
                  <mat-icon class="material-icons-outlined cs-icon">shield_outlined</mat-icon>
                  <h4 class="cs-title">Privacy controls coming soon</h4>
                  <p class="cs-body">Data export, account deletion and privacy preferences will appear here.</p>
                </div>
              </div>
            </div>
          </ng-container>

        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Mobile Nav ──────────────────────────────────────────────── */
    .mobile-nav {
      display: none;
      padding: 12px 16px 0;
      background: var(--mat-sys-surface-container-low, #f8f9fb);
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
    }
    .mobile-nav-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 12px;
      scrollbar-width: none;
    }
    .mobile-nav-scroll::-webkit-scrollbar { display: none; }
    .mobile-nav-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      background: var(--mat-sys-surface-container, #fff);
      border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
      color: var(--mat-sys-on-surface-variant, #6b7280);
      font-size: 13px; font-weight: 500;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      transition: all 0.15s;
    }
    .mobile-nav-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .mobile-nav-btn.active {
      background: var(--mat-sys-primary-container, #eef2ff);
      border-color: var(--mat-sys-primary, #6366f1);
      color: var(--mat-sys-primary, #6366f1);
      font-weight: 600;
    }

    /* ── Shell ───────────────────────────────────────────────────── */
    .settings-page { min-height: 100%; }
    .settings-shell {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 28px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 24px 56px;
      align-items: start;
    }

    /* ── Sidebar ─────────────────────────────────────────────────── */
    .settings-sidebar {
      position: sticky;
      top: 80px;
    }
    .sidebar-inner {
      background: var(--mat-sys-surface-container, #fff);
      border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .sidebar-label {
      padding: 16px 18px 12px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
      border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
    }
    .sidebar-nav { padding: 6px 0; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 10px 14px;
      background: transparent; border: none;
      text-align: left; cursor: pointer;
      border-radius: 0;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      font-size: 14px; font-weight: 500;
      transition: background 0.15s, color 0.15s;
      position: relative;
    }
    .nav-item:hover {
      background: var(--mat-sys-surface-container-high, #f9fafb);
      color: var(--mat-sys-on-surface, #111827);
    }
    .nav-item.active {
      background: var(--mat-sys-primary-container, #eef2ff);
      color: var(--mat-sys-primary, #6366f1);
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: var(--mat-sys-primary, #6366f1);
      border-radius: 0 2px 2px 0;
    }
    .nav-icon {
      width: 32px; height: 32px; border-radius: 9px;
      background: var(--mat-sys-surface-container-high, #f3f4f6);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .nav-icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .nav-icon.active {
      background: var(--mat-sys-primary, #6366f1);
    }
    .nav-icon.active mat-icon { color: white; }
    .nav-label { flex: 1; }
    .nav-chevron {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      opacity: 0.4;
    }
    .nav-item.active .nav-chevron { opacity: 0.8; }

    /* ── Main Content ────────────────────────────────────────────── */
    .settings-main { min-width: 0; }

    /* Section page header */
    .section-page-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
    }
    .sph-icon-wrap {
      width: 48px; height: 48px; border-radius: 14px;
      background: var(--mat-sys-primary-container, #eef2ff);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sph-icon-wrap mat-icon {
      font-size: 24px; width: 24px; height: 24px;
      color: var(--mat-sys-primary, #6366f1);
    }
    .sph-title {
      font-size: 20px; font-weight: 700;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0 0 3px;
    }
    .sph-subtitle {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin: 0;
    }

    /* ── Settings Card ───────────────────────────────────────────── */
    .settings-card {
      border-radius: 16px;
      background: var(--mat-sys-surface-container, #fff);
      border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .settings-card-header {
      display: flex; align-items: center; gap: 12px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
    }
    .sc-header-icon {
      width: 38px; height: 38px; border-radius: 11px;
      background: var(--mat-sys-primary-container, #eef2ff);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sc-header-icon mat-icon {
      font-size: 19px; width: 19px; height: 19px;
      color: var(--mat-sys-primary, #6366f1);
    }
    .sc-title {
      font-size: 15px; font-weight: 700;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0 0 2px;
    }
    .sc-subtitle {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin: 0;
    }
    .settings-card-body { padding: 20px 22px; }

    /* ── Avatar section (in Profile settings) ────────────────────── */
    .avatar-section {
      display: flex; align-items: center; gap: 20px;
      padding: 20px 22px;
    }
    .avatar-wrap {
      width: 80px; height: 80px; border-radius: 50%;
      border: 3px solid var(--mat-sys-primary, #6366f1);
      cursor: pointer; overflow: hidden; position: relative;
      flex-shrink: 0;
      background: var(--mat-sys-surface-container-high, #f3f4f6);
    }
    .avatar-img {
      width: 100%; height: 100%;
      border-radius: 50%;
      background-size: cover; background-position: center;
    }
    .avatar-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s; border-radius: 50%;
    }
    .avatar-overlay mat-icon { color: white; font-size: 24px; }
    .avatar-wrap:hover .avatar-overlay { opacity: 1; }
    .avatar-loading-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.48);
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
    }
    .avatar-meta { flex: 1; min-width: 0; }
    .avatar-name {
      font-size: 16px; font-weight: 700;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0 0 3px;
    }
    .avatar-email {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin: 0 0 8px;
    }
    .role-pill {
      display: inline-block;
      background: var(--mat-sys-primary-container, #eef2ff);
      color: var(--mat-sys-on-primary-container, #4f46e5);
      border-radius: 20px; padding: 2px 12px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .avatar-actions { margin-top: 12px; display: flex; gap: 8px; }

    /* ── Form layout ─────────────────────────────────────────────── */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 4px;
    }
    .form-field { width: 100%; }
    .form-actions {
      display: flex; align-items: center; gap: 16px;
      padding-top: 4px;
      flex-wrap: wrap;
    }

    /* ── Security status row ─────────────────────────────────────── */
    .security-status-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
      background: var(--mat-sys-surface-container-high, #f9fafb);
    }
    .security-status-row.registered {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .ssr-icon {
      font-size: 26px !important; width: 26px !important; height: 26px !important;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
      flex-shrink: 0;
    }
    .security-status-row.registered .ssr-icon { color: #10b981; }
    .ssr-text {
      display: flex; flex-direction: column; gap: 2px;
    }
    .ssr-text strong {
      font-size: 14px;
      color: var(--mat-sys-on-surface, #111827);
    }
    .ssr-text span {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
    }

    /* ── Status badge ────────────────────────────────────────────── */
    .status-badge {
      display: inline-block;
      padding: 3px 10px; border-radius: 14px;
      font-size: 11px; font-weight: 700;
      background: var(--mat-sys-surface-container-high, #f3f4f6);
      color: var(--mat-sys-on-surface-variant, #6b7280);
    }
    .status-badge.active { background: #d1fae5; color: #059669; }

    /* ── 2FA QR ──────────────────────────────────────────────────── */
    .qr-wrap { text-align: center; max-width: 240px; }
    .qr-img { border-radius: 10px; border: 1px solid var(--mat-sys-outline-variant, #e5e7eb); }
    .secret-code {
      background: var(--mat-sys-surface-container-high, #f3f4f6);
      padding: 2px 7px; border-radius: 5px;
      font-size: 13px;
      color: var(--mat-sys-on-surface, #374151);
    }

    /* ── Sessions list ───────────────────────────────────────────── */
    .sessions-list { padding: 0; }
    .empty-sessions {
      display: flex; flex-direction: column; align-items: center;
      padding: 32px 24px; gap: 8px;
    }
    .empty-sessions mat-icon {
      font-size: 36px; width: 36px; height: 36px;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
    }
    .empty-sessions p {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
      margin: 0;
    }
    .session-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 22px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
      transition: background 0.15s;
    }
    .session-item:last-child { border-bottom: none; }
    .session-item:hover { background: var(--mat-sys-surface-container-high, #fafafa); }
    .session-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--mat-sys-surface-container-high, #f3f4f6);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .session-icon mat-icon { font-size: 20px; color: var(--mat-sys-on-surface-variant, #9ca3af); }
    .session-info { flex: 1; min-width: 0; }
    .session-ip {
      font-size: 13px; font-weight: 600;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0 0 2px;
    }
    .session-ua {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin: 0 0 2px;
    }
    .session-date {
      font-size: 11px;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
      margin: 0;
    }
    .session-revoke { font-size: 12px !important; flex-shrink: 0; }

    /* ── Appearance info card ────────────────────────────────────── */
    .appearance-info-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 18px;
      background: var(--mat-sys-primary-container, #eef2ff);
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant, #c7d2fe);
    }
    .aic-icon {
      font-size: 24px !important; width: 24px !important; height: 24px !important;
      color: var(--mat-sys-primary, #6366f1);
      flex-shrink: 0; margin-top: 2px;
    }
    .aic-title {
      font-size: 14px; font-weight: 700;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0 0 4px;
    }
    .aic-body {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, #4b5563);
      margin: 0; line-height: 1.5;
    }

    /* ── Coming soon placeholder ─────────────────────────────────── */
    .coming-soon {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 24px; gap: 10px; text-align: center;
    }
    .cs-icon {
      font-size: 44px !important; width: 44px !important; height: 44px !important;
      color: var(--mat-sys-on-surface-variant, #9ca3af);
    }
    .cs-title {
      font-size: 15px; font-weight: 700;
      color: var(--mat-sys-on-surface, #111827);
      margin: 0;
    }
    .cs-body {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin: 0; max-width: 360px; line-height: 1.5;
    }

    /* ── Feedback ────────────────────────────────────────────────── */
    .feedback { font-size: 13px; margin: 0; }
    .feedback.success { color: #10b981; }
    .feedback.error   { color: #ef4444; }

    /* ── Responsive ──────────────────────────────────────────────── */
    @media (max-width: 900px) {
      .settings-shell {
        grid-template-columns: 1fr;
        padding: 20px 16px 40px;
      }
      .settings-sidebar { display: none; }
      .mobile-nav { display: block; }
      .section-page-header { margin-top: 20px; }
    }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .avatar-section { flex-direction: column; text-align: center; }
    }
  `]
})
export class SettingsComponent implements OnInit {

  readonly currentUser = computed(() => this.authService.currentUser());
  defaultAvatar = 'assets/img/user-6.jpg';

  navItems = NAV_ITEMS;
  activeSection = signal('profile');
  currentNav = computed(() => this.navItems.find(n => n.key === this.activeSection()) ?? this.navItems[0]);

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
  @ViewChild('pwFormRef') pwFormDirective!: FormGroupDirective;

  // Sessions
  sessions: any[] = [];

  // Two-Factor Authentication
  mfaEnabled     = false;
  showMfaSetup   = false;
  showMfaDisable = false;
  mfaSecret      = '';
  mfaQrUrl       = '';
  qrImageUrl     = '';
  mfaVerifyCode  = '';
  mfaSaving      = false;
  mfaMsg         = '';
  mfaError       = '';

  // Face ID
  showFaceRegistration = false;
  faceRegistered = false;
  faceRegisteredAt: string | null = null;
  faceRemoving = false;
  faceMsg = '';
  faceError = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
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
      newPassword:     ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    // Navigate to the section requested via query param (e.g. ?section=security)
    const section = this.route.snapshot.queryParamMap.get('section');
    if (section && this.navItems.some(n => n.key === section)) {
      this.activeSection.set(section);
    }

    const u = this.currentUser();
    if (u) {
      this.infoForm.patchValue({ fullName: u.fullName, email: u.email });
    }
    const userId = this.authService.getUserId();
    if (userId) {
      this.userService.getById(userId).subscribe(dto => {
        this.faceRegistered    = !!dto.faceRegisteredAt;
        this.faceRegisteredAt  = dto.faceRegisteredAt ?? null;
        this.mfaEnabled        = !!(dto as any).mfaEnabled;
      });
    }
    this.http.get<any[]>('http://localhost:8084/api/auth/sessions').subscribe({
      next: s => { this.sessions = s; this.cdr.detectChanges(); },
      error: () => {}
    });
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
    this.uploadAvatar();
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
        this.avatarMsg = 'Photo updated successfully!';
        this.authService.patchCurrentUser({ avatarUrl: dto.avatarUrl });
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
        this.authService.patchCurrentUser({ fullName: dto.fullName, email: dto.email });
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
    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      return;
    }
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.pwSaving = true;
    this.pwError  = '';
    this.pwMsg    = '';
    const { oldPassword, newPassword } = this.pwForm.value;
    this.userService.changePassword(userId, oldPassword, newPassword).subscribe({
      next: () => {
        this.pwSaving = false;
        this.pwMsg    = 'Password changed successfully!';
        this.pwFormDirective.resetForm();
        this.cdr.detectChanges();
        setTimeout(() => { this.pwMsg = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.pwSaving = false;
        if (err.status === 0) {
          this.pwError = 'Cannot reach the server. Please try again later.';
        } else {
          this.pwError = err.error?.message
            || (typeof err.error === 'string' ? err.error : null)
            || 'Password change failed.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // ── Sessions ─────────────────────────────────────────────────────
  revokeSession(s: any): void {
    if (!confirm('Revoke this session?')) return;
    this.http.delete(`http://localhost:8084/api/auth/sessions/${s.id}`).subscribe({
      next: () => { this.sessions = this.sessions.filter(x => x.id !== s.id); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ── Two-Factor Authentication ─────────────────────────────────────
  startMfaSetup(): void {
    this.mfaMsg = ''; this.mfaError = '';
    this.authService.setup2FA().subscribe({
      next: (res) => {
        this.mfaSecret    = res.secret;
        this.mfaQrUrl     = res.otpAuthUri;
        this.qrImageUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(res.otpAuthUri)}`;
        this.showMfaSetup = true;
        this.cdr.detectChanges();
      },
      error: () => { this.mfaError = 'Failed to start 2FA setup.'; }
    });
  }

  confirmEnableMfa(): void {
    this.mfaSaving = true; this.mfaError = '';
    this.authService.enable2FA(this.mfaSecret, this.mfaVerifyCode).subscribe({
      next: () => {
        this.mfaSaving     = false;
        this.mfaEnabled    = true;
        this.showMfaSetup  = false;
        this.mfaVerifyCode = '';
        this.mfaSecret     = '';
        this.mfaQrUrl      = '';
        this.mfaMsg = '2FA enabled! Your account is now protected.';
        this.cdr.detectChanges();
        setTimeout(() => { this.mfaMsg = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: (err) => {
        this.mfaSaving     = false;
        this.mfaError      = err.error?.message ?? 'Invalid code. Try again.';
        this.mfaVerifyCode = '';
        this.cdr.detectChanges();
      }
    });
  }

  cancelMfaSetup(): void {
    this.showMfaSetup  = false;
    this.mfaSecret     = '';
    this.mfaQrUrl      = '';
    this.qrImageUrl    = '';
    this.mfaVerifyCode = '';
    this.mfaError      = '';
  }

  confirmDisableMfa(): void {
    this.mfaSaving = true; this.mfaError = '';
    this.authService.disable2FA(this.mfaVerifyCode).subscribe({
      next: () => {
        this.mfaSaving      = false;
        this.mfaEnabled     = false;
        this.showMfaDisable = false;
        this.mfaVerifyCode  = '';
        this.mfaMsg = '2FA has been disabled.';
        this.cdr.detectChanges();
        setTimeout(() => { this.mfaMsg = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.mfaSaving     = false;
        this.mfaError      = err.error?.message ?? 'Invalid code.';
        this.mfaVerifyCode = '';
        this.cdr.detectChanges();
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
