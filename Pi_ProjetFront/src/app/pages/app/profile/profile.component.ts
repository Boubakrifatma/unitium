import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../../auth/auth.service';
import { UserService, UserDTO } from '../../../users/user.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule, RouterLink,
        MatCardModule, MatIconModule, MatButtonModule,
        MatDividerModule, MatProgressSpinnerModule, MatChipsModule
    ],
    template: `
        <div class="prof-page fade-in">

            <!-- ── Page header ──────────────────────────────────────── -->
            <div class="page-header">
                <div class="page-header-inner">
                    <div class="d-flex align-items-center gap-3">
                        <div class="page-icon">
                            <mat-icon class="material-icons-outlined">person</mat-icon>
                        </div>
                        <div>
                            <h2 class="page-title">My Profile</h2>
                            <p class="page-subtitle">View and manage your account information</p>
                        </div>
                        <div class="ms-auto d-none d-sm-block">
                            <button matButton="filled" routerLink="../settings">
                                <mat-icon class="material-icons-outlined">edit</mat-icon>
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Content ──────────────────────────────────────────── -->
            <div class="page-body">

                <div class="row gx-4 gy-4" *ngIf="user(); else loading">

                    <!-- ── Left: Profile card ─────────────────── -->
                    <div class="col-12 col-lg-4 col-xl-3">

                        <div class="profile-card">

                            <!-- Banner -->
                            <div class="profile-banner">
                                <div class="banner-bg"></div>
                                <div class="banner-shine"></div>
                            </div>

                            <!-- Avatar -->
                            <div class="avatar-section">
                                <div class="avatar-wrap" (click)="fileInput.click()">
                                    <div class="avatar-img"
                                         [style.background-image]="'url(' + (avatarPreview || user()?.avatarUrl || defaultAvatar) + ')'">
                                    </div>
                                    <div class="avatar-overlay">
                                        <mat-icon>photo_camera</mat-icon>
                                    </div>
                                </div>
                                <input #fileInput type="file" accept="image/*" class="d-none"
                                       (change)="onFileChange($event)" />
                            </div>

                            <!-- Avatar upload actions -->
                            <div class="text-center px-4 mb-1" *ngIf="avatarPreview">
                                <div class="d-flex justify-content-center gap-2">
                                    <button matButton="filled" color="primary" (click)="saveAvatar()" [disabled]="uploading">
                                        <mat-spinner diameter="14" *ngIf="uploading"></mat-spinner>
                                        <mat-icon *ngIf="!uploading">cloud_upload</mat-icon>
                                        {{ uploading ? 'Saving…' : 'Save Photo' }}
                                    </button>
                                    <button matButton (click)="cancelAvatar()">Cancel</button>
                                </div>
                            </div>
                            <p class="feedback-ok" *ngIf="uploadMsg">{{ uploadMsg }}</p>
                            <p class="feedback-err" *ngIf="uploadErr">{{ uploadErr }}</p>

                            <!-- Identity -->
                            <div class="identity-block">
                                <h3 class="user-name">{{ user()?.fullName }}</h3>
                                <p class="user-email">{{ user()?.email }}</p>
                                <span class="role-pill">{{ user()?.role }}</span>
                            </div>

                            <div class="card-divider"></div>

                            <!-- Info rows -->
                            <div class="info-rows">

                                <div class="info-row">
                                    <div class="info-icon-bg">
                                        <mat-icon class="material-icons-outlined">verified_user</mat-icon>
                                    </div>
                                    <div class="info-text">
                                        <span class="info-label">Status</span>
                                        <span class="info-value">
                                            <span class="status-dot" [class.active]="user()?.isActive"></span>
                                            {{ user()?.isActive ? 'Active' : 'Inactive' }}
                                        </span>
                                    </div>
                                </div>

                                <div class="info-row">
                                    <div class="info-icon-bg">
                                        <mat-icon class="material-icons-outlined">calendar_today</mat-icon>
                                    </div>
                                    <div class="info-text">
                                        <span class="info-label">Member since</span>
                                        <span class="info-value">{{ user()?.createdAt | date:'MMM d, yyyy' }}</span>
                                    </div>
                                </div>

                                <div class="info-row" *ngIf="user()?.faceRegisteredAt">
                                    <div class="info-icon-bg accent">
                                        <mat-icon class="material-icons-outlined">face</mat-icon>
                                    </div>
                                    <div class="info-text">
                                        <span class="info-label">Face ID</span>
                                        <span class="info-value accent-text">Registered</span>
                                    </div>
                                </div>

                            </div>

                            <!-- Footer link -->
                            <div class="card-footer-link">
                                <button matButton class="settings-btn w-100" routerLink="../settings">
                                    <mat-icon class="material-icons-outlined">settings</mat-icon>
                                    Manage Settings
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- ── Right: Details ─────────────────────── -->
                    <div class="col-12 col-lg-8 col-xl-9">

                        <!-- Account Information -->
                        <div class="detail-card mb-4">
                            <div class="detail-card-header">
                                <div class="card-icon-wrap">
                                    <mat-icon class="material-icons-outlined">person</mat-icon>
                                </div>
                                <div>
                                    <h4 class="card-title">Account Information</h4>
                                    <p class="card-subtitle">Your personal details and account data</p>
                                </div>
                                <button matButton class="ms-auto card-edit-btn" routerLink="../settings" [queryParams]="{section:'profile'}">
                                    <mat-icon class="material-icons-outlined">edit</mat-icon>
                                    Edit
                                </button>
                            </div>

                            <div class="details-grid">
                                <div class="detail-cell">
                                    <p class="cell-label">Full Name</p>
                                    <p class="cell-value">{{ user()?.fullName }}</p>
                                </div>
                                <div class="detail-cell">
                                    <p class="cell-label">Email Address</p>
                                    <p class="cell-value">{{ user()?.email }}</p>
                                </div>
                                <div class="detail-cell">
                                    <p class="cell-label">Role</p>
                                    <p class="cell-value"><span class="role-pill sm">{{ user()?.role }}</span></p>
                                </div>
                                <div class="detail-cell">
                                    <p class="cell-label">Account Status</p>
                                    <p class="cell-value">
                                        <span class="status-badge" [class.active]="user()?.isActive">
                                            {{ user()?.isActive ? 'Active' : 'Inactive' }}
                                        </span>
                                    </p>
                                </div>
                                <div class="detail-cell">
                                    <p class="cell-label">Member Since</p>
                                    <p class="cell-value">{{ user()?.createdAt | date:'MMMM d, yyyy' }}</p>
                                </div>
                               
                            </div>
                        </div>

                        <!-- Security -->
                        <div class="detail-card">
                            <div class="detail-card-header">
                                <div class="card-icon-wrap">
                                    <mat-icon class="material-icons-outlined">security</mat-icon>
                                </div>
                                <div>
                                    <h4 class="card-title">Security</h4>
                                    <p class="card-subtitle">Authentication methods and account protection</p>
                                </div>
                            </div>

                            <div class="security-list">

                                <div class="security-item">
                                    <div class="sec-icon-wrap">
                                        <mat-icon class="material-icons-outlined">lock</mat-icon>
                                    </div>
                                    <div class="sec-text">
                                        <p class="sec-label">Password</p>
                                        <p class="sec-sub">Manage your login password</p>
                                    </div>
                                    <div class="sec-actions">
                                        <span class="sec-value">••••••••</span>
                                        <a routerLink="../settings" [queryParams]="{section:'security'}" class="sec-link">Change</a>
                                    </div>
                                </div>

                                <div class="security-item">
                                    <div class="sec-icon-wrap" [class.active]="user()?.faceRegisteredAt">
                                        <mat-icon class="material-icons-outlined">face</mat-icon>
                                    </div>
                                    <div class="sec-text">
                                        <p class="sec-label">Face ID</p>
                                        <p class="sec-sub" *ngIf="user()?.faceRegisteredAt">
                                            Registered {{ user()?.faceRegisteredAt | date:'MMM d, yyyy' }}
                                        </p>
                                        <p class="sec-sub muted" *ngIf="!user()?.faceRegisteredAt">Not registered</p>
                                    </div>
                                    <div class="sec-actions">
                                        <span class="sec-badge" [class.on]="user()?.faceRegisteredAt">
                                            {{ user()?.faceRegisteredAt ? 'Active' : 'Inactive' }}
                                        </span>
                                        <a routerLink="../settings" [queryParams]="{section:'security'}" class="sec-link">
                                            {{ user()?.faceRegisteredAt ? 'Update' : 'Set up' }}
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

                <ng-template #loading>
                    <div class="text-center py-5">
                        <mat-spinner diameter="40" class="mx-auto"></mat-spinner>
                    </div>
                </ng-template>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        /* ── Page Header ─────────────────────────────────────────────── */
        .page-header {
            background: var(--mat-sys-surface-container-low, #f8f9fb);
            border-bottom: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
            padding: 18px 0;
            margin-bottom: 28px;
        }
        .page-header-inner {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 24px;
        }
        .page-icon {
            width: 44px; height: 44px; border-radius: 12px;
            background: var(--mat-sys-primary-container, #eef2ff);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .page-icon mat-icon {
            font-size: 22px; width: 22px; height: 22px;
            color: var(--mat-sys-primary, #6366f1);
        }
        .page-title {
            font-size: 19px; font-weight: 700;
            color: var(--mat-sys-on-surface, #111827);
            margin: 0 0 2px;
        }
        .page-subtitle {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant, #6b7280);
            margin: 0;
        }

        /* ── Page Body ───────────────────────────────────────────────── */
        .page-body {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 24px 56px;
        }

        /* ── Profile Card ────────────────────────────────────────────── */
        .profile-card {
            border-radius: 18px;
            background: var(--mat-sys-surface-container, #fff);
            border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .profile-banner {
            height: 108px;
            position: relative;
            overflow: hidden;
        }
        .banner-bg {
            position: absolute; inset: 0;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
        }
        .banner-shine {
            position: absolute; inset: 0;
            background:
                radial-gradient(ellipse at 20% 60%, rgba(255,255,255,0.15) 0%, transparent 55%),
                radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 45%);
        }

        /* Avatar */
        .avatar-section {
            display: flex;
            justify-content: center;
            margin-top: -44px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .avatar-wrap {
            width: 88px; height: 88px; border-radius: 50%;
            border: 3px solid var(--mat-sys-surface-container, white);
            box-shadow: 0 4px 16px rgba(0,0,0,0.18);
            cursor: pointer; overflow: hidden; position: relative;
            background: var(--mat-sys-surface-container-high, #f3f4f6);
        }
        .avatar-img {
            width: 100%; height: 100%;
            background-size: cover; background-position: center; border-radius: 50%;
        }
        .avatar-overlay {
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.48);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s; border-radius: 50%;
        }
        .avatar-overlay mat-icon { color: white; font-size: 22px; }
        .avatar-wrap:hover .avatar-overlay { opacity: 1; }

        /* Identity */
        .identity-block {
            text-align: center;
            padding: 4px 20px 14px;
        }
        .user-name {
            font-size: 17px; font-weight: 700;
            color: var(--mat-sys-on-surface, #111827);
            margin: 0 0 4px;
        }
        .user-email {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant, #6b7280);
            margin: 0 0 10px;
        }

        /* Role pill */
        .role-pill {
            display: inline-block;
            background: var(--mat-sys-primary-container, #eef2ff);
            color: var(--mat-sys-on-primary-container, #4f46e5);
            border-radius: 20px; padding: 3px 14px;
            font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        .role-pill.sm { padding: 2px 10px; font-size: 11px; }

        /* Divider */
        .card-divider {
            height: 1px;
            background: var(--mat-sys-outline-variant, #e5e7eb);
            margin: 0 16px 14px;
        }

        /* Info rows */
        .info-rows { padding: 0 20px; }
        .info-row {
            display: flex; align-items: center; gap: 12px;
            padding: 9px 0;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
        }
        .info-row:last-child { border-bottom: none; }
        .info-icon-bg {
            width: 34px; height: 34px; border-radius: 10px;
            background: var(--mat-sys-surface-container-high, #f3f4f6);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .info-icon-bg mat-icon {
            font-size: 17px; width: 17px; height: 17px;
            color: var(--mat-sys-on-surface-variant, #9ca3af);
        }
        .info-icon-bg.accent { background: var(--mat-sys-primary-container, #eef2ff); }
        .info-icon-bg.accent mat-icon { color: var(--mat-sys-primary, #6366f1); }
        .info-text { display: flex; flex-direction: column; gap: 1px; }
        .info-label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
            text-transform: uppercase;
            color: var(--mat-sys-on-surface-variant, #9ca3af);
            margin: 0;
        }
        .info-value {
            font-size: 13px; font-weight: 500;
            color: var(--mat-sys-on-surface, #374151);
            display: flex; align-items: center; gap: 6px;
            margin: 0;
        }
        .info-value.accent-text { color: var(--mat-sys-primary, #6366f1); font-weight: 600; }
        .status-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #9ca3af; display: inline-block; flex-shrink: 0;
        }
        .status-dot.active { background: #10b981; }

        /* Footer link */
        .card-footer-link {
            padding: 12px 20px 20px;
            border-top: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
            margin-top: 10px;
        }
        .settings-btn {
            color: var(--mat-sys-primary, #6366f1) !important;
            font-weight: 600 !important;
            border: 1px solid var(--mat-sys-outline-variant, #e5e7eb) !important;
            border-radius: 10px !important;
        }

        /* ── Detail Cards (right col) ─────────────────────────────────── */
        .detail-card {
            border-radius: 18px;
            background: var(--mat-sys-surface-container, #fff);
            border: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .detail-card-header {
            display: flex; align-items: center; gap: 14px;
            padding: 20px 22px 16px;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #e5e7eb);
        }
        .card-icon-wrap {
            width: 42px; height: 42px; border-radius: 12px;
            background: var(--mat-sys-primary-container, #eef2ff);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .card-icon-wrap mat-icon {
            font-size: 20px; width: 20px; height: 20px;
            color: var(--mat-sys-primary, #6366f1);
        }
        .card-title {
            font-size: 15px; font-weight: 700;
            color: var(--mat-sys-on-surface, #111827);
            margin: 0 0 2px;
        }
        .card-subtitle {
            font-size: 12px;
            color: var(--mat-sys-on-surface-variant, #6b7280);
            margin: 0;
        }
        .card-edit-btn {
            font-size: 13px !important;
            color: var(--mat-sys-on-surface-variant, #6b7280) !important;
        }

        /* Details grid */
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
        .detail-cell {
            padding: 18px 22px;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
            border-right: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
        }
        .detail-cell:nth-child(2n) { border-right: none; }
        .detail-cell:nth-last-child(-n+2) { border-bottom: none; }
        .cell-label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
            text-transform: uppercase;
            color: var(--mat-sys-on-surface-variant, #9ca3af);
            margin: 0 0 5px;
        }
        .cell-value {
            font-size: 14px; font-weight: 500;
            color: var(--mat-sys-on-surface, #111827);
            margin: 0;
        }
        .cell-value.mono { font-family: 'Courier New', monospace; font-size: 13px; }

        /* Status badge */
        .status-badge {
            display: inline-flex; align-items: center;
            border-radius: 20px; padding: 3px 10px;
            font-size: 12px; font-weight: 600;
            background: var(--mat-sys-surface-container-high, #f3f4f6);
            color: var(--mat-sys-on-surface-variant, #6b7280);
        }
        .status-badge.active { background: #d1fae5; color: #059669; }

        /* Security list */
        .security-list { padding: 0; }
        .security-item {
            display: flex; align-items: center; gap: 14px;
            padding: 15px 22px;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6);
            transition: background 0.15s;
        }
        .security-item:last-child { border-bottom: none; }
        .security-item:hover { background: var(--mat-sys-surface-container-high, #fafafa); }
        .sec-icon-wrap {
            width: 40px; height: 40px; border-radius: 12px;
            background: var(--mat-sys-surface-container-high, #f3f4f6);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .sec-icon-wrap mat-icon {
            font-size: 20px; width: 20px; height: 20px;
            color: var(--mat-sys-on-surface-variant, #9ca3af);
        }
        .sec-icon-wrap.active { background: var(--mat-sys-primary-container, #eef2ff); }
        .sec-icon-wrap.active mat-icon { color: var(--mat-sys-primary, #6366f1); }
        .sec-text { flex: 1; min-width: 0; }
        .sec-label {
            font-size: 14px; font-weight: 600;
            color: var(--mat-sys-on-surface, #111827);
            margin: 0 0 2px;
        }
        .sec-sub {
            font-size: 12px;
            color: var(--mat-sys-on-surface-variant, #6b7280);
            margin: 0;
        }
        .sec-sub.muted { font-style: italic; }
        .sec-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .sec-value { font-size: 14px; letter-spacing: 0.1em; color: var(--mat-sys-on-surface-variant, #9ca3af); }
        .sec-badge {
            padding: 3px 9px; border-radius: 14px;
            font-size: 11px; font-weight: 700;
            background: var(--mat-sys-surface-container-high, #f3f4f6);
            color: var(--mat-sys-on-surface-variant, #6b7280);
        }
        .sec-badge.on { background: #d1fae5; color: #059669; }
        .sec-link {
            font-size: 12px; font-weight: 600;
            color: var(--mat-sys-primary, #6366f1);
            text-decoration: none; white-space: nowrap;
        }
        .sec-link:hover { text-decoration: underline; }

        /* Feedback */
        .feedback-ok  { font-size: 12px; color: #10b981; text-align: center; margin: 0 0 8px; }
        .feedback-err { font-size: 12px; color: #ef4444; text-align: center; margin: 0 0 8px; }

        /* Responsive */
        @media (max-width: 768px) {
            .page-body { padding: 0 16px 40px; }
            .details-grid { grid-template-columns: 1fr; }
            .detail-cell { border-right: none !important; }
            .detail-cell:nth-last-child(-n+2) { border-bottom: 1px solid var(--mat-sys-outline-variant, #f3f4f6); }
            .detail-cell:last-child { border-bottom: none; }
        }
    `]
})
export class ProfileComponent implements OnInit {

    user = signal<UserDTO | null>(null);
    defaultAvatar = 'assets/img/user-6.jpg';

    avatarPreview: string | null = null;
    avatarFile: File | null = null;
    uploading = false;
    uploadMsg = '';
    uploadErr = '';

    constructor(
        private authService: AuthService,
        private userService: UserService
    ) {}

    ngOnInit(): void {
        const userId = this.authService.getUserId();
        if (userId) {
            this.userService.getById(userId).subscribe(dto => {
                this.user.set(dto);
                const cur = this.authService.currentUser();
                if (cur && dto.avatarUrl !== cur.avatarUrl) {
                    this.authService.currentUser.set({ ...cur, avatarUrl: dto.avatarUrl });
                }
            });
        }
    }

    onFileChange(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.avatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => this.avatarPreview = e.target?.result as string;
        reader.readAsDataURL(file);
        this.uploadMsg = '';
        this.uploadErr = '';
    }

    cancelAvatar(): void {
        this.avatarPreview = null;
        this.avatarFile    = null;
    }

    saveAvatar(): void {
        const u = this.user();
        if (!this.avatarFile || !u) return;
        this.uploading = true;
        this.uploadErr = '';
        this.userService.uploadAvatar(u.id, this.avatarFile).subscribe({
            next: (dto) => {
                this.uploading = false;
                this.uploadMsg = 'Photo saved!';
                this.avatarPreview = null;
                this.avatarFile    = null;
                this.user.update(prev => prev ? { ...prev, avatarUrl: dto.avatarUrl } : prev);
                const cur = this.authService.currentUser();
                if (cur) this.authService.currentUser.set({ ...cur, avatarUrl: dto.avatarUrl });
                setTimeout(() => this.uploadMsg = '', 3000);
            },
            error: () => {
                this.uploading = false;
                this.uploadErr = 'Upload failed. Please try again.';
            }
        });
    }
}
