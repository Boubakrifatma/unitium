import { Component, OnInit } from '@angular/core';
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
        <!-- Page header -->
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Profile</h3>
                        <p class="text-secondary small">Your account information</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matButton="filled" routerLink="../settings">
                            <mat-icon class="material-icons-outlined">edit</mat-icon> Edit Profile
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <div class="row gx-4" *ngIf="user; else loading">

                <!-- ─── Left col: Avatar + basic info ─────────────── -->
                <div class="col-12 col-lg-4 col-xl-3">
                    <mat-card class="mb-4 overflow-hidden">
                        <!-- Cover banner -->
                        <div class="profile-banner">
                            <div class="banner-bg"></div>
                        </div>

                        <mat-card-content class="pb-0 px-4">
                            <div class="text-center" style="margin-top:-60px;">
                                <!-- Avatar with upload -->
                                <div class="avatar-wrap mb-3" (click)="fileInput.click()">
                                    <div class="avatar-circle"
                                         [style.background-image]="'url(' + (avatarPreview || user.avatarUrl || defaultAvatar) + ')'">
                                    </div>
                                    <div class="avatar-overlay">
                                        <mat-icon>photo_camera</mat-icon>
                                    </div>
                                </div>
                                <input #fileInput type="file" accept="image/*" class="d-none"
                                       (change)="onFileChange($event)" />

                                <!-- Upload actions -->
                                <div *ngIf="avatarPreview" class="mb-2">
                                    <button matButton color="primary" (click)="saveAvatar()" [disabled]="uploading">
                                        <mat-spinner diameter="14" *ngIf="uploading"></mat-spinner>
                                        <mat-icon *ngIf="!uploading">cloud_upload</mat-icon>
                                        {{ uploading ? '' : 'Save' }}
                                    </button>
                                    <button matButton (click)="cancelAvatar()" class="ms-1">Cancel</button>
                                </div>
                                <p class="feedback-ok" *ngIf="uploadMsg">{{ uploadMsg }}</p>
                                <p class="feedback-err" *ngIf="uploadErr">{{ uploadErr }}</p>

                                <h2 class="mb-1">{{ user.fullName }}</h2>
                                <p class="text-secondary mb-2">{{ user.email }}</p>
                                <span class="role-chip">{{ user.role }}</span>
                            </div>

                            <mat-divider class="my-3"></mat-divider>

                            <!-- Quick info -->
                            <div class="info-row">
                                <mat-icon class="material-icons-outlined">verified_user</mat-icon>
                                <div>
                                    <p class="label">Status</p>
                                    <span class="status-badge" [class.active]="user.isActive">
                                        {{ user.isActive ? 'Active' : 'Inactive' }}
                                    </span>
                                </div>
                            </div>

                            <div class="info-row">
                                <mat-icon class="material-icons-outlined">calendar_today</mat-icon>
                                <div>
                                    <p class="label">Member since</p>
                                    <p class="value">{{ user.createdAt | date:'MMMM d, yyyy' }}</p>
                                </div>
                            </div>

                            <div class="info-row" *ngIf="user.faceRegisteredAt">
                                <mat-icon class="material-icons-outlined" style="color:#6366f1">face</mat-icon>
                                <div>
                                    <p class="label">Face ID</p>
                                    <p class="value" style="color:#6366f1;font-weight:600">Registered</p>
                                </div>
                            </div>

                            <div class="pb-3 mt-3 text-center">
                                <button matButton routerLink="../settings" class="settings-link">
                                    <mat-icon class="material-icons-outlined">settings</mat-icon>
                                    Manage Settings
                                </button>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- ─── Right col: Details ─────────────────────────── -->
                <div class="col-12 col-lg-8 col-xl-9">

                    <!-- Account details -->
                    <mat-card class="mb-4">
                        <mat-card-content class="pt-4">
                            <h4 class="section-title mb-3">
                                <mat-icon class="material-icons-outlined">person</mat-icon>
                                Account Information
                            </h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <p class="label">Full Name</p>
                                    <p class="value">{{ user.fullName }}</p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">Email Address</p>
                                    <p class="value">{{ user.email }}</p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">Role</p>
                                    <p class="value">
                                        <span class="role-chip">{{ user.role }}</span>
                                    </p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">Account Status</p>
                                    <p class="value">
                                        <span class="status-badge" [class.active]="user.isActive">
                                            {{ user.isActive ? 'Active' : 'Inactive' }}
                                        </span>
                                    </p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">Member Since</p>
                                    <p class="value">{{ user.createdAt | date:'MMMM d, yyyy' }}</p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">User ID</p>
                                    <p class="value mono">#{{ user.id }}</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <!-- Security -->
                    <mat-card class="mb-4">
                        <mat-card-content class="pt-4">
                            <h4 class="section-title mb-3">
                                <mat-icon class="material-icons-outlined">security</mat-icon>
                                Security
                            </h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <p class="label">Password</p>
                                    <p class="value">
                                        ••••••••
                                        <a routerLink="../settings" class="change-link ms-2">Change</a>
                                    </p>
                                </div>
                                <div class="detail-item">
                                    <p class="label">Face ID</p>
                                    <p class="value">
                                        <span *ngIf="user.faceRegisteredAt" style="color:#10b981;font-weight:600">
                                            <mat-icon style="font-size:16px;vertical-align:middle;width:16px;height:16px">check_circle</mat-icon>
                                            Registered
                                        </span>
                                        <span *ngIf="!user.faceRegisteredAt" class="text-secondary">
                                            Not registered
                                            <a routerLink="../settings" class="change-link ms-2">Set up</a>
                                        </span>
                                    </p>
                                </div>
                                <div class="detail-item" *ngIf="user.faceRegisteredAt">
                                    <p class="label">Face ID registered</p>
                                    <p class="value">{{ user.faceRegisteredAt | date:'MMMM d, yyyy' }}</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                </div>
            </div>

            <!-- Loading state -->
            <ng-template #loading>
                <div class="text-center py-5">
                    <mat-spinner diameter="40" class="mx-auto"></mat-spinner>
                </div>
            </ng-template>
        </div>
    `,
    styles: [`
        .profile-banner {
            height: 120px; position: relative; overflow: hidden;
        }
        .banner-bg {
            width: 100%; height: 100%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
        }

        /* Avatar */
        .avatar-wrap {
            position: relative; width: 120px; height: 120px;
            border-radius: 50%; margin: 0 auto 8px; cursor: pointer; overflow: hidden;
            border: 4px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        }
        .avatar-circle {
            width: 100%; height: 100%;
            background-size: cover; background-position: center; border-radius: 50%;
        }
        .avatar-overlay {
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s; border-radius: 50%;
        }
        .avatar-overlay mat-icon { color: white; font-size: 26px; }
        .avatar-wrap:hover .avatar-overlay { opacity: 1; }

        /* Role chip */
        .role-chip {
            display: inline-block;
            background: #eef2ff; color: #4f46e5;
            border-radius: 20px; padding: 3px 14px;
            font-size: 12px; font-weight: 600; letter-spacing: 0.03em;
        }

        /* Status badge */
        .status-badge {
            display: inline-block; border-radius: 20px;
            padding: 3px 12px; font-size: 12px; font-weight: 600;
            background: #f3f4f6; color: #6b7280;
        }
        .status-badge.active { background: #d1fae5; color: #059669; }

        /* Info rows */
        .info-row {
            display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px;
        }
        .info-row mat-icon { color: #9ca3af; font-size: 20px; width: 20px; height: 20px; margin-top: 2px; }
        .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin: 0 0 2px; }
        .value { font-size: 14px; font-weight: 500; margin: 0; }
        .mono  { font-family: monospace; font-size: 13px; }

        /* Details grid */
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 24px; }
        .detail-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin: 0 0 4px; }
        .detail-item .value { font-size: 14px; font-weight: 500; margin: 0; }
        @media (max-width: 576px) { .details-grid { grid-template-columns: 1fr; } }

        /* Section title */
        .section-title {
            display: flex; align-items: center; gap: 8px;
            font-size: 15px; font-weight: 600; margin: 0;
        }
        .section-title mat-icon { color: #6366f1; font-size: 20px; width: 20px; height: 20px; }

        /* Links */
        .change-link { font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 500; }
        .change-link:hover { text-decoration: underline; }
        .settings-link { color: #6366f1 !important; font-weight: 600 !important; }

        /* Feedback */
        .feedback-ok  { font-size: 12px; color: #10b981; margin: 4px 0 0; }
        .feedback-err { font-size: 12px; color: #ef4444; margin: 4px 0 0; }
    `]
})
export class ProfileComponent implements OnInit {

    user: UserDTO | null = null;
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
                this.user = dto;
                // also sync avatarUrl in signal
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
        if (!this.avatarFile || !this.user) return;
        this.uploading = true;
        this.uploadErr = '';
        this.userService.uploadAvatar(this.user.id, this.avatarFile).subscribe({
            next: (dto) => {
                this.uploading = false;
                this.uploadMsg = 'Photo saved!';
                this.avatarPreview = null;
                this.avatarFile    = null;
                if (this.user) this.user = { ...this.user, avatarUrl: dto.avatarUrl };
                // Update header signal
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
