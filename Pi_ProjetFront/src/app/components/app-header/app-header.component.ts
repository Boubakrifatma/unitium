import { Component, Input, Renderer2, Output, EventEmitter, signal, Inject, inject, effect } from "@angular/core";
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
import { MatInput } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ScheduledNotificationService, ScheduledNotification } from "../../pages/app/applications/chat/scheduled-notification.service";

@Component({
    selector: "app-app-header",
    standalone: true,
    imports: [CommonModule, RouterLink, MatToolbarModule, MatListModule, MatFormFieldModule, MatInput, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, MatDividerModule],
    template: `
        <mat-toolbar class="app-header" color="primary">
            <button matIconButton (click)="drawers.toggle()" class="menu-button">
                <mat-icon class="material-icons-outlined">menu</mat-icon>
            </button>

            <span class="logo mx-2 d-flex align-items-center gap-2">
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style="flex-shrink:0">
                    <rect width="32" height="32" rx="8" fill="#6366f1"/>
                    <path d="M8 10C8 8.9 8.9 8 10 8H14C15.1 8 16 8.9 16 10V16C16 17.1 15.1 18 14 18H10C8.9 18 8 17.1 8 16V10Z" fill="white"/>
                    <path d="M18 14C18 12.9 18.9 12 20 12H22C23.1 12 24 12.9 24 14V22C24 23.1 23.1 24 22 24H20C18.9 24 18 23.1 18 22V14Z" fill="white" fill-opacity="0.75"/>
                    <path d="M8 22C8 20.9 8.9 20 10 20H16C17.1 20 18 20.9 18 22C18 23.1 17.1 24 16 24H10C8.9 24 8 23.1 8 22Z" fill="white" fill-opacity="0.5"/>
                </svg>
                <span class="logo-text" style="font-size:17px;font-weight:700;letter-spacing:-0.3px">Unitum</span>
            </span>
            <span class="header-title"></span>
            <div class="mx-3 d-none d-lg-block">
                <mat-form-field appearance="outline" class="w-100 inline-small border-light">
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput placeholder="Search" />
                </mat-form-field>
            </div>

            @if(isSearchActive){
            <mat-toolbar class="position-absolute top-0 start-0 w-100 z-index-1">
                <!-- search -->
                <button matIconButton (click)="toggleSearch()"><mat-icon class="material-icons-outlined">arrow_backward</mat-icon></button>

                <mat-form-field appearance="outline" class="w-100 inline-small border-light ms-2">
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput placeholder="Search" />
                    <button matIconButton matSuffix><mat-icon class="material-icons-outlined">check</mat-icon></button>
                </mat-form-field>
            </mat-toolbar>
            }
            <span class="spacer"></span>

            <div class="header-actions">
                <!-- search -->
                <button matIconButton (click)="toggleSearch()" class="d-inline-block d-lg-none"><mat-icon class="material-icons-outlined">search</mat-icon></button>

                <!-- light dark -->
                <button matIconButton (click)="toggleMode()"><mat-icon class="dark">dark_mode</mat-icon><mat-icon class="light">sunny</mat-icon></button>

                <!-- notifications -->
                <button matIconButton
                        [matMenuTriggerFor]="notifMenu"
                        (menuOpened)="notifService.markAllRead()"
                        [matBadge]="notifService.unreadCount() > 0 ? notifService.unreadCount() : null"
                        [class.notif-bell-pulse]="notifService.bellPulsing()"
                        matBadgeColor="warn"
                        matBadgeSize="small">
                    <mat-icon class="material-icons-outlined">notifications</mat-icon>
                </button>
                <mat-menu #notifMenu="matMenu" xPosition="before" class="notif-dropdown">
                    <div class="notif-panel-header" (click)="$event.stopPropagation()">
                        <span>Notifications</span>
                        <div style="display:flex;align-items:center;gap:2px">
                            <button mat-icon-button style="width:28px;height:28px;line-height:28px"
                                    (click)="toggleMute()" [title]="notifMuted() ? 'Unmute notifications' : 'Mute notifications'">
                                <mat-icon style="font-size:18px;width:18px;height:18px">{{ notifMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
                            </button>
                            @if (notifService.notifications().length > 0) {
                                <button mat-button style="font-size:11px;min-width:0;padding:0 6px;height:24px;color:#94a3b8"
                                        (click)="onClearAll()">Clear all</button>
                                <button mat-button style="font-size:11px;min-width:0;padding:0 6px;height:24px"
                                        (click)="notifService.markAllRead()">Mark all read</button>
                            }
                        </div>
                    </div>
                    <mat-divider></mat-divider>
                    @if (notifService.notifications().length === 0) {
                        <div class="notif-empty">
                            <mat-icon class="material-icons-outlined" style="font-size:32px;width:32px;height:32px;opacity:.35">notifications_none</mat-icon>
                            <p>No notifications yet</p>
                        </div>
                    }
                    @for (n of notifService.notifications(); track n.id) {
                        <div class="notif-entry" [class.notif-unread]="!n.read" (click)="$event.stopPropagation()">
                            <mat-icon [style.color]="n.iconColor"
                                      style="font-size:20px;width:20px;height:20px;flex-shrink:0;margin-top:1px">{{ n.icon }}</mat-icon>
                            <div class="notif-entry-body">
                                <div class="notif-msg">{{ n.message }}</div>
                                <div class="notif-time">{{ formatRelativeTime(n.timestamp) }}</div>
                                @if (n.type === 'SCHEDULED_REMINDER') {
                                    <button mat-stroked-button class="notif-action-btn"
                                            (click)="onViewRoom(n.roomId)">View Room</button>
                                }
                                @if (n.type === 'SCHEDULED_FAILED') {
                                    <button mat-stroked-button class="notif-action-btn"
                                            (click)="onRetry(n)">Retry</button>
                                }
                                @if (n.type === 'MEETING_REMINDER') {
                                    <button mat-stroked-button class="notif-action-btn"
                                            style="color:#4caf50;border-color:#4caf50"
                                            (click)="onJoinMeeting(n)">
                                        <mat-icon style="font-size:14px;width:14px;height:14px;margin-right:3px;vertical-align:middle">video_call</mat-icon>
                                        Join Now
                                    </button>
                                }
                                @if ($any(n).type === 'MENTION' || $any(n).type === 'ADDED_TO_ROOM') {
                                    <button mat-stroked-button class="notif-action-btn"
                                            (click)="onViewRoom(n.roomId)">
                                        {{ $any(n).type === 'ADDED_TO_ROOM' ? 'Open Room' : 'Go to Room' }}
                                    </button>
                                }
                                @if ($any(n).type === 'MENTION' && n.originalContent) {
                                    <div class="notif-msg-preview">"{{ (n.originalContent ?? '').slice(0, 60) }}..."</div>
                                }
                                <button mat-icon-button class="notif-tts-btn"
                                        [style.opacity]="speakingNotifId() === n.id ? '1' : '.4'"
                                        [style.color]="speakingNotifId() === n.id ? '#6366f1' : ''"
                                        (click)="speakingNotifId() === n.id ? stopSpeaking() : readNotifAloud(n)"
                                        [title]="speakingNotifId() === n.id ? 'Stop reading' : 'Read aloud'">
                                    <mat-icon style="font-size:16px;width:16px;height:16px">
                                        {{ speakingNotifId() === n.id ? 'stop_circle' : 'volume_up' }}
                                    </mat-icon>
                                </button>
                            </div>
                        </div>
                    }
                </mat-menu>

                <!-- language -->
                <button mat-icon-button [matMenuTriggerFor]="language" class="d-none d-lg-inline-block">
                    <div class="coverimg height-20 width-20 mx-auto rounded-circle align-middle" [ngStyle]="{ 'background-image': 'url(' + selectedLanguage().flag + ')' }"></div>
                </button>
                <mat-menu #language="matMenu" class="user-menu bg-light-gradient">
                    @for (lang of languages(); track lang.code) {
                    <button mat-menu-item (click)="onLanguageSelect(lang)">
                        <span class="coverimg avatar avatar-20 rounded-circle me-2" [ngStyle]="{ 'background-image': 'url(' + lang.flag + ')' }"></span>
                        <span>{{ lang.name }}</span>
                    </button>
                    }
                </mat-menu>

                <!-- profile -->
                <button matIconButton [matMenuTriggerFor]="menu">
                    <span class="avatar avatar-32 rounded-circle coverimg d-inline-block"
                          [ngStyle]="{'background-image': 'url(' + (authService.currentUser()?.avatarUrl || 'assets/img/user-6.jpg') + ')'}"></span>
                </button>
                <mat-menu #menu="matMenu" class="user-menu width-280 pt-0 bg-light-gradient">
                    <div class="p-3 text-center mb-1" routerLink="./profile" style="margin-top:-8px">
                        <div class="avatar avatar-120 rounded-circle coverimg align-middle mb-3" style="background-image: url('assets/img/user-bg.png')">
                            <figure class="avatar avatar-80 rounded-circle coverimg align-middle"
                                    [ngStyle]="{'background-image': 'url(' + (authService.currentUser()?.avatarUrl || 'assets/img/user-6.jpg') + ')'}"></figure>
                        </div>
                        <h3 class="mb-0">{{ authService.currentUser()?.fullName }}</h3>
                        <p class="opacity-75 mt-0 mb-1">{{ authService.currentUser()?.role }}</p>
                        @if (authService.currentOrganization()?.organizationName) {
                            <p class="small text-secondary mb-0">Org: {{ authService.currentOrganization()!.organizationName }}</p>
                        }
                    </div>
                    <button mat-menu-item routerLink="./dashboard">
                        <mat-icon class="material-icons-outlined">house</mat-icon>
                        <span>Dashboard</span>
                    </button>
                    <button mat-menu-item routerLink="./profile">
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                        <span>Profile</span>
                    </button>
                    <button mat-menu-item routerLink="./subscription">
                        <mat-icon class="material-icons-outlined">workspace_premium</mat-icon>
                        <span>Subscription</span>
                    </button>
                    <button mat-menu-item routerLink="./settings">
                        <mat-icon class="material-icons-outlined">settings</mat-icon>
                        <span>Settings</span>
                    </button>
                    <div class="px-3 my-2 text-center">
                        <button matButton (click)="logout()" class="theme-red">
                            <mat-icon class="material-icons-outlined">logout</mat-icon>
                            <span>Logout</span>
                        </button>
                    </div>
                </mat-menu>
            </div>
        </mat-toolbar>
    `,
    styles: [`
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.4); }
        }
        @keyframes slideInRight {
            from { transform: translateX(40px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        .notif-bell-pulse ::ng-deep .mat-badge-content {
            animation: pulse 600ms ease-in-out;
        }
        ::ng-deep .notif-dropdown {
            max-width: 340px !important;
            min-width: 300px !important;
        }
        ::ng-deep .notif-dropdown .mat-mdc-menu-content {
            padding: 0 !important;
            max-height: 420px;
            overflow-y: auto;
        }
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
        .notif-unread {
            background: rgba(99,102,241,.04);
        }
        .notif-entry-body { flex: 1; min-width: 0; }
        .notif-msg {
            font-size: 12.5px;
            line-height: 1.4;
            color: #1e1e2d;
            word-break: break-word;
        }
        .notif-time {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 2px;
        }
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
    notifMuted = signal<boolean>(false);
    speakingNotifId = signal<string | null>(null);
    private notifLoaded = false;
    private availableVoices: SpeechSynthesisVoice[] = [];

    // language
    languages = signal([
        { name: "English", flag: "assets/img/english.png", code: "en" },
        { name: "German", flag: "assets/img/german.png", code: "de" },
        { name: "France", flag: "assets/img/france.png", code: "fr" },
    ]);
    selectedLanguage = signal(this.languages()[0]);

    authService = inject(AuthService);

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

    // language changes
    onLanguageSelect(lang: any) {
        this.selectedLanguage.set(lang);
    }

    onClearAll(): void {
        this.notifService.notifications.set([]);
        this.notifService.unreadCount.set(0);
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
