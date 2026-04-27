import { Component, Renderer2, Input, Inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatDrawer } from "@angular/material/sidenav";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";

@Component({
    selector: "app-index-header",
    standalone: true,
    imports: [RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatButtonModule],
    template: `
        <mat-toolbar class="app-header style-1">
            <button matIconButton (click)="drawers.toggle()" class="d-lg-none me-2">
                <mat-icon class="material-icons-outlined">menu</mat-icon>
            </button>
            <span class="logo" (click)="goHome()">
                <img src="assets/img/logo.png" class="logo-img" alt="Unitum Logo" />
                <span class="logo-text">
                    Unitum<br />
                    <small><span class="d-none d-md-inline-block">Collaborative Management Platform</span></small>
                </span>
            </span>
            <div class="spacer text-center">
                <!-- main menu -->
                <span class="d-none d-lg-inline-block">
                    @for (link of navLinks; track link.path) {
                    <a [routerLink]="link.path" routerLinkActive="active" class="menu-item" matButton>
                        {{ link.label }}
                    </a>
                    }
                </span>
            </div>
            <!-- light dark -->
            <button matIconButton (click)="toggleTheme()" class="me-1"><mat-icon class="dark">dark_mode</mat-icon><mat-icon class="light">sunny</mat-icon></button>

            <button matIconButton="filled" (click)="goToAuth()" class="auth-btn">
                <mat-icon class="material-icons-outlined">person</mat-icon>
            </button>
        </mat-toolbar>
    `,
    styles: [`
        .logo {
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 12px;
            transition: opacity 0.2s;
        }
        .logo:hover {
            opacity: 0.8;
        }
        .logo-img {
            height: 40px;
            width: auto;
            border-radius: 10px;
        }
        .logo-text {
            font-weight: 600;
            font-size: 1.1rem;
            line-height: 1.3;
        }
        .logo-text small {
            font-size: 0.7rem;
            font-weight: 400;
            opacity: 0.7;
        }
        .menu-item {
            margin: 0 4px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .menu-item:hover {
            background: rgba(13, 110, 253, 0.08);
            border-radius: 8px;
        }
        .menu-item.active {
            color: #0d6efd;
            background: rgba(13, 110, 253, 0.12);
            border-radius: 8px;
        }
        .demo-btn {
            margin-left: 8px;
            background: linear-gradient(135deg, #0d6efd, #0b5ed7);
            color: white !important;
            border-radius: 40px !important;
            padding: 0 20px !important;
        }
        .demo-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
        }
        .auth-btn {
            background: rgba(13, 110, 253, 0.1);
            border-radius: 40px;
        }
        .auth-btn:hover {
            background: rgba(13, 110, 253, 0.2);
        }
        .dark, .light {
            transition: opacity 0.2s;
        }
        body.dark-mode .light {
            display: none;
        }
        body.light-mode .dark {
            display: none;
        }
        @media (max-width: 768px) {
            .logo-text small {
                display: none;
            }
            .logo-text {
                font-size: 0.9rem;
            }
            .logo-img {
                height: 32px;
            }
        }
    `]
})
export class IndexHeaderComponent {
    @Input() drawers!: MatDrawer;

    isDarkMode = false;
    navLinks = [
        { label: "Home", path: "/web/website" },
        { label: "About Us", path: "/web/about-us" },
        { label: "Contact", path: "/web/contact-us" },
    ];

    constructor(private router: Router, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}
    
    ngOnInit() {
        // Initial theme setting (based on prefers-color-scheme or saved preference)
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('unitum_theme');
            if (savedTheme === 'dark') {
                this.isDarkMode = true;
            } else if (savedTheme === 'light') {
                this.isDarkMode = false;
            } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
                this.isDarkMode = true;
            }
            this.applyTheme();
        }
    }

    goHome() {
        this.router.navigate(["/web/website"]);
    }

    goToAuth() {
        this.router.navigate(["/auth/login"]);
    }
    
    goToSignup() {
        this.router.navigate(["/auth/signup"]);
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        if (typeof window !== 'undefined') {
            localStorage.setItem('unitum_theme', this.isDarkMode ? 'dark' : 'light');
        }
    }
    
    private applyTheme() {
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, "dark-mode");
            this.renderer.removeClass(this.document.body, "light-mode");
        } else {
            this.renderer.addClass(this.document.body, "light-mode");
            this.renderer.removeClass(this.document.body, "dark-mode");
        }
    }
}