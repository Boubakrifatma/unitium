import { Component, Input, Renderer2, Output, EventEmitter, signal, computed, effect, Inject, inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { AuthService } from "../../auth/auth.service";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatBadgeModule } from "@angular/material/badge";
import { MatDividerModule } from "@angular/material/divider";
import { MatSidenav } from "@angular/material/sidenav";
import { Router, RouterLink } from "@angular/router";
import { MatListModule } from "@angular/material/list";
import { ScheduledNotificationService, ScheduledNotification } from "../../pages/app/applications/chat/scheduled-notification.service";
import { NotificationService, DeliverableNotification } from "../../services/notification.service";

@Component({
    selector: "app-app-header",
    standalone: true,
    imports: [CommonModule, RouterLink, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, MatDividerModule],
    template: `
        <mat-toolbar class="app-header" color="primary">

            <!-- Left: hamburger + logo -->
            <button matIconButton (click)="drawers.toggle()" class="hdr-icon-btn menu-btn">
                <mat-icon>menu</mat-icon>
            </button>
            <span class="hdr-logo">
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style="flex-shrink:0">
                    <rect width="32" height="32" rx="8" fill="#6366f1"/>
                    <path d="M8 10C8 8.9 8.9 8 10 8H14C15.1 8 16 8.9 16 10V16C16 17.1 15.1 18 14 18H10C8.9 18 8 17.1 8 16V10Z" fill="white"/>
                    <path d="M18 14C18 12.9 18.9 12 20 12H22C23.1 12 24 12.9 24 14V22C24 23.1 23.1 24 22 24H20C18.9 24 18 23.1 18 22V14Z" fill="white" fill-opacity="0.75"/>
                    <path d="M8 22C8 20.9 8.9 20 10 20H16C17.1 20 18 20.9 18 22C18 23.1 17.1 24 16 24H10C8.9 24 8 23.1 8 22Z" fill="white" fill-opacity="0.5"/>
                </svg>
                <span class="hdr-logo-text d-none d-md-inline">Unitum</span>
            </span>

            <!-- Centre: search bar (desktop) -->
            <div class="hdr-search d-none d-lg-flex">
                <mat-icon class="hdr-search-icon">search</mat-icon>
                <input class="hdr-search-input" placeholder="Search…" />
            </div>

            <!-- Mobile search overlay -->
            @if(isSearchActive){
            <div class="hdr-search-overlay">
                <button matIconButton (click)="toggleSearch()" class="hdr-icon-btn">
                    <mat-icon>arrow_back</mat-icon>
                </button>
                <div class="hdr-search hdr-search-full">
                    <mat-icon class="hdr-search-icon">search</mat-icon>
                    <input class="hdr-search-input" placeholder="Search…" autofocus />
                </div>
            </div>
            }

            <span class="hdr-spacer"></span>

            <!-- Right: actions -->
            <div class="hdr-actions">

                <!-- Mobile search -->
                <button matIconButton (click)="toggleSearch()" class="hdr-icon-btn d-lg-none">
                    <mat-icon>search</mat-icon>
                </button>

                <!-- Dark / light mode -->
                <button matIconButton (click)="toggleMode()" class="hdr-icon-btn" [title]="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
                    <mat-icon class="dark">dark_mode</mat-icon>
                    <mat-icon class="light">sunny</mat-icon>
                </button>

                <!-- Notifications -->
                <button matIconButton class="hdr-icon-btn"
                        [matMenuTriggerFor]="notifMenu"
                        (menuOpened)="onNotifMenuOpened()"
                        [matBadge]="totalUnread() > 0 ? totalUnread() : null"
                        [class.notif-bell-pulse]="notifService.bellPulsing()"
                        matBadgeColor="warn"
                        matBadgeSize="small">
                    <mat-icon>notifications_none</mat-icon>
                </button>
                <mat-menu #notifMenu="matMenu" xPosition="before" class="notif-dropdown">
                    <div class="notif-panel-header" (click)="$event.stopPropagation()">
                        <span>Notifications</span>
                        <div style="display:flex;align-items:center;gap:2px">
                            <button mat-icon-button style="width:28px;height:28px;line-height:28px"
                                    (click)="toggleMute()" [title]="notifMuted() ? 'Unmute' : 'Mute'">
                                <mat-icon style="font-size:18px;width:18px;height:18px">{{ notifMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
                            </button>
                            @if (allNotifications().length > 0) {
                                <button mat-button style="font-size:11px;min-width:0;padding:0 6px;height:24px;color:#94a3b8"
                                        (click)="onClearAll()">Clear all</button>
                                <button mat-button style="font-size:11px;min-width:0;padding:0 6px;height:24px"
                                        (click)="onNotifMenuOpened()">Mark read</button>
                            }
                        </div>
                    </div>
                    <mat-divider></mat-divider>
                    @if (allNotifications().length === 0) {
                        <div class="notif-empty">
                            <mat-icon style="font-size:32px;width:32px;height:32px;opacity:.35">notifications_none</mat-icon>
                            <p>No notifications yet</p>
                        </div>
                    }
                    @for (n of allNotifications(); track n.id) {
                        <div class="notif-entry" [class.notif-unread]="!n.read" (click)="$event.stopPropagation()">
                            <mat-icon [style.color]="n.iconColor" style="font-size:20px;width:20px;height:20px;flex-shrink:0;margin-top:1px">{{ n.icon }}</mat-icon>
                            <div class="notif-entry-body">
                                <div class="notif-msg">{{ n.message }}</div>
                                <div class="notif-time">{{ formatRelativeTime(n.timestamp) }}</div>
                                @if (n.type === 'SCHEDULED_REMINDER') {
                                    <button mat-stroked-button class="notif-action-btn" (click)="onViewRoom(n.roomId)">View Room</button>
                                }
                                @if (n.type === 'SCHEDULED_FAILED') {
                                    <button mat-stroked-button class="notif-action-btn" (click)="onRetry(n)">Retry</button>
                                }
                                @if (n.type === 'MEETING_REMINDER') {
                                    <button mat-stroked-button class="notif-action-btn" style="color:#4caf50;border-color:#4caf50" (click)="onJoinMeeting(n)">
                                        <mat-icon style="font-size:14px;width:14px;height:14px;margin-right:3px;vertical-align:middle">video_call</mat-icon>
                                        Join Now
                                    </button>
                                }
                                @if ($any(n).type === 'MENTION' || $any(n).type === 'ADDED_TO_ROOM') {
                                    <button mat-stroked-button class="notif-action-btn" (click)="onViewRoom(n.roomId)">
                                        {{ $any(n).type === 'ADDED_TO_ROOM' ? 'Open Room' : 'Go to Room' }}
                                    </button>
                                }
                                @if ($any(n).type === 'MENTION' && n.originalContent) {
                                    <div class="notif-msg-preview">"{{ (n.originalContent || '').slice(0, 60) }}..."</div>
                                }
                                @if ($any(n).type === 'NEW_REPORT') {
                                    <button mat-stroked-button class="notif-action-btn" style="color:#ef4444;border-color:#ef4444" (click)="onReviewReport()">
                                        <mat-icon style="font-size:14px;width:14px;height:14px;margin-right:3px;vertical-align:middle">shield</mat-icon>
                                        Review Now
                                    </button>
                                    @if ($any(n).originalContent) {
                                        <div class="notif-msg-preview" style="font-style:italic">"{{ ($any(n).originalContent || '').slice(0, 60) }}"</div>
                                    }
                                }
                                @if (['TASK_COMPLETED','SUBMITTED_TO_MANAGER','ACCEPTED_BY_MANAGER','REVISION_REQUIRED_BY_MANAGER','VALIDATED_BY_PO','REJECTED_BY_PO','VALIDATED_EMPLOYEE','REVISION_REQUIRED_BY_PO','MANAGER_VIEWED'].includes($any(n).type)) {
                                    <button mat-stroked-button class="notif-action-btn" (click)="onViewDeliverableNotif($any(n))">View</button>
                                }
                                <button mat-icon-button class="notif-tts-btn"
                                        [style.opacity]="speakingNotifId() === n.id ? '1' : '.4'"
                                        [style.color]="speakingNotifId() === n.id ? '#6366f1' : ''"
                                        (click)="speakingNotifId() === n.id ? stopSpeaking() : readNotifAloud(n)"
                                        [title]="speakingNotifId() === n.id ? 'Stop reading' : 'Read aloud'">
                                    <mat-icon style="font-size:16px;width:16px;height:16px">{{ speakingNotifId() === n.id ? 'stop_circle' : 'volume_up' }}</mat-icon>
                                </button>
                            </div>
                        </div>
                    }
                </mat-menu>

                <!-- Separator -->
                <div class="hdr-sep"></div>

                <!-- Avatar button -->
                <button class="user-btn" [matMenuTriggerFor]="userMenu">
                    <div class="user-avatar">
                        <div class="avatar-skeleton" *ngIf="avatarLoading()"></div>
                        <img class="avatar-img"
                             [src]="avatarSrc()"
                             [class.avatar-hidden]="avatarLoading()"
                             (load)="_loadedToolbarUrl.set(avatarSrc())"
                             (error)="onAvatarError($event, 'toolbar')"
                             alt="avatar" />
                    </div>
                    <div class="user-btn-text">
                        <span class="user-btn-name">{{ authService.currentUser()?.fullName }}</span>
                        <span class="user-btn-role">{{ authService.currentUser()?.role }}</span>
                    </div>
                    <mat-icon class="user-chevron">expand_more</mat-icon>
                </button>

                <!-- ══ USER DROPDOWN ══ -->
                <mat-menu #userMenu="matMenu" class="udm-panel" xPosition="before">

                    <!-- Compact header -->
                    <div class="udm-header" (click)="$event.stopPropagation()">
                        <div class="udm-photo-wrap">
                            <div class="udm-photo">
                                <div class="avatar-skeleton" *ngIf="dropdownAvatarLoading()"></div>
                                <img class="avatar-img"
                                     [src]="avatarSrc()"
                                     [class.avatar-hidden]="dropdownAvatarLoading()"
                                     (load)="_loadedDropdownUrl.set(avatarSrc())"
                                     (error)="onAvatarError($event, 'dropdown')"
                                     alt="avatar" />
                            </div>
                            <div class="udm-online"></div>
                        </div>
                        <div class="udm-header-text">
                            <span class="udm-fullname">{{ authService.currentUser()?.fullName }}</span>
                            <span class="udm-role-badge">{{ authService.currentUser()?.role }}</span>
                            @if (authService.currentOrganization()?.organizationName) {
                                <span class="udm-org">{{ authService.currentOrganization()!.organizationName }}</span>
                            }
                        </div>
                    </div>
                    <mat-divider></mat-divider>

                    <!-- Navigation -->
                    <div class="udm-nav-section">
                      

                        <button mat-menu-item routerLink="./profile" class="udm-nav-item">
                            <mat-icon class="udm-nav-icon">person</mat-icon>
                            <span class="udm-nav-label">Profile</span>
                        </button>

                        

                        <button mat-menu-item (click)="logout()" class="udm-nav-item udm-nav-logout">
                            <mat-icon class="udm-nav-icon">logout</mat-icon>
                            <span class="udm-nav-label">Sign out</span>
                        </button>
                    </div>
                </mat-menu>
            </div>
        </mat-toolbar>
    `,
    styles: [`
        /* ═══════════════════════════════════════════
           TOOLBAR LAYOUT
        ═══════════════════════════════════════════ */
        :host { display: block; }

        .app-header {
            height: 60px !important;
            padding: 0 12px !important;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Hamburger */
        .menu-btn { flex-shrink: 0; }

        /* Logo */
        .hdr-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-right: 8px;
            flex-shrink: 0;
        }
        .hdr-logo-text {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -.3px;
            color: #000;
        }

        /* Search bar */
        .hdr-search {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,.92);
            border-radius: 10px;
            padding: 0 14px;
            height: 38px;
            min-width: 220px;
            max-width: 320px;
            transition: background 200ms;
        }
        .hdr-search:focus-within { background: rgba(255,255,255,.98); }
        .hdr-search-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            color: rgba(0,0,0,.5);
        }
        .hdr-search-input {
            border: none;
            background: transparent;
            outline: none;
            font-size: 13.5px;
            color: #111;
            width: 100%;
        }
        .hdr-search-input::placeholder { color: rgba(0,0,0,.45); }
        .hdr-search-full { min-width: 0; flex: 1; max-width: none; }

        /* Mobile search overlay */
        .hdr-search-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 8px;
            background: inherit;
            z-index: 10;
        }

        /* Spacer */
        .hdr-spacer { flex: 1; }

        /* Actions row */
        .hdr-actions {
            display: flex;
            align-items: center;
            gap: 2px;
            flex-shrink: 0;
        }

        /* Icon buttons */
        .hdr-icon-btn {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
            color: rgba(0,0,0,.75) !important;
            transition: background 150ms !important;
        }
        .hdr-icon-btn:hover { background: rgba(0,0,0,.05) !important; }

        /* Separator before avatar */
        .hdr-sep {
            width: 1px;
            height: 24px;
            background: rgba(0,0,0,.12);
            margin: 0 6px;
            flex-shrink: 0;
        }

        /* ═══════════════════════════════════════════
           AVATAR BUTTON IN TOOLBAR
        ═══════════════════════════════════════════ */
        .user-btn {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 4px 10px 4px 4px;
            border: 1px solid rgba(0,0,0,.08);
            background: rgba(0,0,0,.04);
            border-radius: 40px;
            cursor: pointer;
            transition: background 200ms;
            height: 42px;
            color: #111;
        }
        .user-btn:hover { background: rgba(0,0,0,.08); }

        .user-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: rgba(0,0,0,.06);
            border: 1px solid rgba(0,0,0,.12);
            flex-shrink: 0;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            display: block;
        }
        .avatar-hidden {
            display: none;
        }
        .avatar-skeleton {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: linear-gradient(90deg, rgba(0,0,0,.08) 25%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.08) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.2s ease-in-out infinite;
        }
        @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .user-btn-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            max-width: 110px;
        }
        .user-btn-name {
            font-size: 13px;
            font-weight: 600;
            color: #111;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 110px;
            line-height: 1.3;
        }
        .user-btn-role {
            font-size: 10px;
            color: rgba(0,0,0,.6);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 110px;
            text-transform: uppercase;
            letter-spacing: .5px;
            line-height: 1.2;
        }
        .user-chevron {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            color: rgba(0,0,0,.55) !important;
        }

        /* ═══════════════════════════════════════════
           USER DROPDOWN PANEL
        ═══════════════════════════════════════════ */
        ::ng-deep .udm-panel {
            min-width: 250px !important;
            max-width: 260px !important;
            border-radius: 16px !important;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,.18) !important;
            background: #fff !important;
            color: #111 !important;
        }
        ::ng-deep .udm-panel .mat-mdc-menu-content { padding: 0 !important; background: #fff !important; color: #111 !important; }

        /* Compact header */
        .udm-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 14px 12px;
        }
        .udm-photo-wrap {
            position: relative;
            width: 46px;
            height: 46px;
            flex-shrink: 0;
        }
        .udm-photo {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background-color: rgba(0,0,0,.06);
            border: 1px solid rgba(0,0,0,.08);
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .udm-online {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #22c55e;
            border: 2px solid #fff;
        }
        .udm-header-text {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        .udm-fullname {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: #111;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }
        .udm-role-badge {
            margin: 0;
            font-size: 11px;
            color: rgba(0,0,0,.65);
            text-transform: uppercase;
            letter-spacing: .4px;
            font-weight: 600;
        }
        .udm-org {
            display: inline-block;
            padding: 3px 8px;
            background: rgba(0,0,0,.04);
            border-radius: 999px;
            font-size: 11px;
            color: rgba(0,0,0,.7);
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Nav section */
        .udm-nav-section {
            padding: 4px 4px 8px;
        }
        .udm-nav-item {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            padding: 10px 14px !important;
            border-radius: 10px !important;
            min-height: 40px !important;
            margin: 0 4px 4px !important;
            color: rgba(0,0,0,.92) !important;
        }
        .udm-nav-item:hover { background: rgba(0,0,0,.04) !important; }
        .udm-nav-icon {
            font-size: 18px !important;
            width: 30px !important;
            height: 30px !important;
            color: rgba(0,0,0,.65) !important;
        }
        .udm-nav-label {
            font-size: 13.5px;
            font-weight: 600;
            color: #111;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .udm-nav-logout {
            color: #ef4444 !important;
        }
        .udm-nav-logout .udm-nav-icon {
            color: #ef4444 !important;
        }

        /* ═══════════════════════════════════════════
           NOTIFICATIONS
        ═══════════════════════════════════════════ */
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.4); }
        }
        @keyframes slideInRight {
            from { transform: translateX(40px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        .notif-bell-pulse ::ng-deep .mat-badge-content { animation: pulse 600ms ease-in-out; }

        ::ng-deep .notif-dropdown { max-width: 340px !important; min-width: 300px !important; background: #fff !important; }
        ::ng-deep .notif-dropdown .mat-mdc-menu-content { padding: 0 !important; max-height: 420px; overflow-y: auto; background: #fff !important; }

        .notif-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px 8px;
            font-size: 13px;
            font-weight: 700;
            flex-shrink: 0;
        }
        .notif-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 24px 16px;
            color: rgba(0,0,0,.38);
        }
        .notif-empty p { font-size: 12px; margin: 6px 0 0; }
        .notif-entry {
            display: flex;
            gap: 10px;
            padding: 10px 14px;
            border-bottom: 1px solid rgba(0,0,0,.06);
            animation: slideInRight 350ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .notif-entry:last-child { border-bottom: none; }
        .notif-unread { background: rgba(99,102,241,.04); }
        .notif-entry-body { flex: 1; min-width: 0; }
        .notif-msg { font-size: 12.5px; line-height: 1.4; color: #1e1e2d; word-break: break-word; }
        .notif-time { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .notif-action-btn {
            font-size: 11px !important;
            height: 26px !important;
            line-height: 26px !important;
            margin-top: 6px !important;
            padding: 0 10px !important;
        }
        .notif-tts-btn {
            width: 24px !important;
            height: 24px !important;
            line-height: 24px !important;
            margin-top: 4px !important;
            transition: opacity 150ms, color 150ms;
        }
        .notif-tts-btn:hover { opacity: 1 !important; }
        .notif-msg-preview {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
            font-style: italic;
            margin-top: 3px;
            line-height: 1.3;
        }
    `],
})
export class AppHeaderComponent {
    currentMode = signal<string>(localStorage.getItem("app-mode") || "");
    isDarkMode = false;
    isSearchActive = false;

    @Input() drawers!: MatSidenav;
    @Output() openSettingsMenu = new EventEmitter<void>();

    readonly notifService = inject(ScheduledNotificationService);
    readonly deliverableNotifSvc = inject(NotificationService);

    notifMuted = signal<boolean>(false);
    speakingNotifId = signal<string | null>(null);
    _loadedToolbarUrl = signal<string>('');
    _loadedDropdownUrl = signal<string>('');
    private notifLoaded = false;
    private availableVoices: SpeechSynthesisVoice[] = [];

    // Merged list: chat notifs + deliverable/task notifs, newest first
    readonly allNotifications = computed(() => {
        const chat = this.notifService.notifications();
        const deliverable = this.deliverableNotifSvc.notifications().map(n => this._mapDeliverableNotif(n));
        return [...chat, ...deliverable].sort((a, b) =>
            new Date((b as any).timestamp ?? 0).getTime() - new Date((a as any).timestamp ?? 0).getTime()
        );
    });

    readonly totalUnread = computed(() =>
        this.notifService.unreadCount() + this.deliverableNotifSvc.unreadCount()
    );

    authService = inject(AuthService);

    readonly avatarSrc = computed(() =>
        this.authService.currentUser()?.avatarUrl || 'assets/img/user-6.jpg'
    );
    readonly avatarLoading = computed(() => this.avatarSrc() !== this._loadedToolbarUrl());
    readonly dropdownAvatarLoading = computed(() => this.avatarSrc() !== this._loadedDropdownUrl());

    constructor(private router: Router, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {

        // Auto-save notifications to localStorage whenever they change (handles push, markAllRead, clearAll)
        effect(() => {
            const notifs = this.notifService.notifications();
            const userId = this.authService.currentUser()?.id;
            if (!this.notifLoaded || !userId) return;
            localStorage.setItem(`chat_notifications_${userId}`, JSON.stringify(notifs.slice(0, 100)));
        });
    }

    ngOnInit() {
        // Connect backend deliverable/task notification stream
        this.deliverableNotifSvc.connect();

        if (this.currentMode() === "true") {
            this.isDarkMode = true;
        }
        // Initial theme setting (e.g., based on prefers-color-scheme)
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            this.isDarkMode = true;
        }
        //this.applyMode();

        // Load persisted notifications and mute preference from localStorage
        const userId = this.authService.currentUser()?.id;
        if (userId) {
            const stored = localStorage.getItem(`chat_notifications_${userId}`);
            if (stored) {
                try {
                    const parsed: ScheduledNotification[] = JSON.parse(stored);
                    const hydrated = parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp as unknown as string) }));
                    this.notifService.notifications.set(hydrated);
                    this.notifService.unreadCount.set(hydrated.filter(n => !n.read).length);
                } catch { /* ignore corrupt data */ }
            }
            this.notifMuted.set(localStorage.getItem(`chat_notifications_muted_${userId}`) === 'true');
        }
        this.notifLoaded = true;

        // Load TTS voices (async in some browsers)
        if ('speechSynthesis' in window) {
            this.availableVoices = window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                this.availableVoices = window.speechSynthesis.getVoices();
            };
        }
    }

    ngOnDestroy(): void {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    logout() {
        // Implement logout logic
        this.router.navigate(["/auth/login"]);
    }
    toggleMode() {
        this.isDarkMode = !this.isDarkMode;
        this.applyMode();
        localStorage.setItem("app-mode", String(this.isDarkMode));
    }

    toggleSearch() {
        this.isSearchActive = !this.isSearchActive;
    }

    private applyMode() {
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, "dark-mode");
            this.renderer.removeClass(this.document.body, "light-mode"); // Ensure only one class is active
        } else {
            this.renderer.addClass(this.document.body, "light-mode");
            this.renderer.removeClass(this.document.body, "dark-mode");
        }
    }

    onNotifMenuOpened(): void {
        this.notifService.markAllRead();
        this.deliverableNotifSvc.markAllAsRead();
    }

    onClearAll(): void {
        this.notifService.notifications.set([]);
        this.notifService.unreadCount.set(0);
        this.deliverableNotifSvc.markAllAsRead();
    }

    onViewDeliverableNotif(n: any): void {
        const managerTypes = ['TASK_COMPLETED', 'SUBMITTED_TO_MANAGER', 'VALIDATED_BY_PO', 'REJECTED_BY_PO', 'MANAGER_VIEWED'];
        if (managerTypes.includes(n.type)) {
            this.router.navigate(['/app/manager-deliverables']);
        } else {
            this.router.navigate(['/app/deliverables']);
        }
    }

    private _mapDeliverableNotif(n: DeliverableNotification): ScheduledNotification & { deliverableId?: number | null } {
        const iconMap: Record<string, { icon: string; color: string }> = {
            TASK_COMPLETED:               { icon: 'task_alt',    color: '#22c55e' },
            SUBMITTED_TO_MANAGER:         { icon: 'upload_file', color: '#6366f1' },
            ACCEPTED_BY_MANAGER:          { icon: 'check_circle',color: '#22c55e' },
            REVISION_REQUIRED_BY_MANAGER: { icon: 'edit_note',   color: '#f59e0b' },
            VALIDATED_BY_PO:              { icon: 'verified',    color: '#8b5cf6' },
            REJECTED_BY_PO:               { icon: 'cancel',      color: '#ef4444' },
            VALIDATED_EMPLOYEE:           { icon: 'celebration', color: '#22c55e' },
            REVISION_REQUIRED_BY_PO:      { icon: 'edit_note',   color: '#f59e0b' },
            MANAGER_VIEWED:               { icon: 'visibility',  color: '#94a3b8' },
        };
        const { icon, color } = iconMap[n.eventType] ?? { icon: 'notifications', color: '#6366f1' };
        return {
            id: `del-${n.id}`,
            type: n.eventType as any,
            icon,
            iconColor: color,
            message: n.title + (n.message ? ' — ' + n.message : ''),
            roomId: 0,
            roomName: '',
            timestamp: new Date(n.createdAt),
            read: n.isRead,
            deliverableId: n.deliverableId,
        } as any;
    }

    readNotifAloud(n: ScheduledNotification): void {
        if (!('speechSynthesis' in window)) return;
        const userId = this.authService.currentUser()?.id;
        if (userId && localStorage.getItem(`chat_notifications_muted_${userId}`) === 'true') return;
        window.speechSynthesis.cancel();
        const text = this.getNotifFullText(n);
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1;
        u.pitch = 1.0;
        u.volume = 0.8;
        u.lang = 'en-US';
        const preferred = this.availableVoices.find(v =>
            v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'));
        if (preferred) u.voice = preferred;
        this.speakingNotifId.set(n.id);
        u.onend = () => this.speakingNotifId.set(null);
        u.onerror = () => this.speakingNotifId.set(null);
        window.speechSynthesis.speak(u);
    }

    stopSpeaking(): void {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        this.speakingNotifId.set(null);
    }

    private getNotifFullText(n: ScheduledNotification): string {
        const nAny = n as any;
        const time = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (nAny.type === 'MENTION') {
            const who = nAny.isEveryone ? 'everyone' : 'you';
            return `${nAny.senderName} mentioned ${who} in the chatroom ${n.roomName}. They said: ${(n.originalContent ?? '').slice(0, 80)}`;
        } else if (nAny.type === 'ADDED_TO_ROOM') {
            return `${nAny.addedByName} added you to the chatroom ${n.roomName}. Open the chatroom to start messaging.`;
        } else if (nAny.type === 'REMOVED_FROM_ROOM') {
            return `${nAny.removedByName} removed you from the chatroom ${n.roomName}. You no longer have access to this chatroom.`;
        } else if (n.type === 'MEETING_REMINDER') {
            return `${n.message}. Click Join Now to open the meeting link.`;
        } else if (n.type === 'SCHEDULED_SENT') {
            return `Your message was successfully sent to the chatroom ${n.roomName} at ${time}`;
        } else if (n.type === 'SCHEDULED_REMINDER') {
            const preview = n.message.split(' — ')[1]?.slice(0, 40) ?? '';
            return `Reminder: your message ${preview} is scheduled to be sent to ${n.roomName} in 15 minutes`;
        } else {
            const preview = (n.originalContent ?? '').slice(0, 40);
            return `Your scheduled message ${preview} in ${n.roomName} has failed to send. Please retry from the notification panel`;
        }
    }

    toggleMute(): void {
        const muted = !this.notifMuted();
        this.notifMuted.set(muted);
        const userId = this.authService.currentUser()?.id;
        if (userId) {
            localStorage.setItem(`chat_notifications_muted_${userId}`, String(muted));
        }
    }

    onViewRoom(roomId: number): void {
        this.router.navigate(['/app/chat']);
    }

    onReviewReport(): void {
        this.router.navigate(['/app/chat']);
    }

    onJoinMeeting(n: ScheduledNotification): void {
        const link = n.originalContent;
        if (link) window.open(link, '_blank', 'noopener');
    }

    onRetry(n: ScheduledNotification): void {
        this.notifService.requestRetry({
            content: n.originalContent ?? '',
            recurrenceType: n.recurrenceType ?? 'ONCE',
            recurrenceDays: [],
            scheduledAt: n.scheduledAt,
            roomId: n.roomId,
        });
        this.router.navigate(['/app/chat']);
    }

    onAvatarError(event: Event, which: 'toolbar' | 'dropdown'): void {
        const img = event.target as HTMLImageElement;
        if (!img.src.includes('user-6.jpg')) img.src = 'assets/img/user-6.jpg';
        if (which === 'toolbar') this._loadedToolbarUrl.set(this.avatarSrc());
        else this._loadedDropdownUrl.set(this.avatarSrc());
    }

    formatRelativeTime(date: Date): string {
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        if (diffMin < 1)  return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24)   return `${diffH}h ago`;
        return `${Math.floor(diffH / 24)}d ago`;
    }
}
