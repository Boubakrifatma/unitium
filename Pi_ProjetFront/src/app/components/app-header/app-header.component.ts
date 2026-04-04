import { Component, Input, Renderer2, Output, EventEmitter, signal, Inject, inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { AuthService } from "../../auth/auth.service";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatBadgeModule } from "@angular/material/badge";
import { MatSidenav } from "@angular/material/sidenav";
import { Router, RouterLink } from "@angular/router";
import { MatListModule } from "@angular/material/list";
import { MatInput } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";

@Component({
    selector: "app-app-header",
    standalone: true,
    imports: [CommonModule, RouterLink, MatToolbarModule, MatListModule, MatFormFieldModule, MatInput, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule],
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

                <!-- settings -->
                <button matIconButton (click)="openSettingsMenu.emit()" [matBadge]="3" matBadgeColor="warn" matBadgeSize="small"><mat-icon class="material-icons-outlined">notifications</mat-icon></button>

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
                    <mat-icon class="material-icons-outlined">account_circle</mat-icon>
                </button>
                <mat-menu #menu="matMenu" class="user-menu width-280 pt-0 bg-light-gradient">
                    <div class="p-3 text-center mb-1" routerLink="./profile" style="margin-top:-8px">
                        <div class="avatar avatar-120 rounded-circle coverimg align-middle mb-3" style="background-image: url('assets/img/user-bg.png')">
                            <figure class="avatar avatar-80 rounded-circle coverimg align-middle" style="background-image: url('assets/img/user-6.jpg')"></figure>
                        </div>
                        <h3 class="mb-0">{{ authService.currentUser()?.fullName }}</h3>
                        <p class="opacity-75 mt-0">{{ authService.currentUser()?.role }}</p>
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
    styles: [``],
})
export class AppHeaderComponent {
    currentMode = signal<string>(localStorage.getItem("app-mode") || "");
    isDarkMode = false;
    isSearchActive = false;

    @Input() drawers!: MatSidenav;
    @Output() openSettingsMenu = new EventEmitter<void>();

    // language
    languages = signal([
        { name: "English", flag: "assets/img/english.png", code: "en" },
        { name: "German", flag: "assets/img/german.png", code: "de" },
        { name: "France", flag: "assets/img/france.png", code: "fr" },
    ]);
    selectedLanguage = signal(this.languages()[0]);

    authService = inject(AuthService);

    constructor(private router: Router, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}

    ngOnInit() {
        if (this.currentMode() === "true") {
            this.isDarkMode = true;
        }
        // Initial theme setting (e.g., based on prefers-color-scheme)
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            this.isDarkMode = true;
        }
        //this.applyMode();
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
}
