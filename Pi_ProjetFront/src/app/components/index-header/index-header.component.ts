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
                <img src="assets/img/logo.png" class="logo-img" alt="" />
                <span class="logo-text">
                    SaaS Dashboard<br />
                    <small><span class="d-none d-md-inline-block">Template</span> by AdminUIUX</small>
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

            <button matIconButton="filled" (click)="goToAuth()">
                <mat-icon class="material-icons-outlined">person</mat-icon>
            </button>
        </mat-toolbar>
    `,
    styles: [``],
})
export class IndexHeaderComponent {
    @Input() drawers!: MatDrawer;

    isDarkMode = false;
    navLinks = [
        { label: "Home", path: "/web/website" },
        { label: "About Us", path: "/web/about-us" },
        { label: "Case Study", path: "/web/case-study" },
        { label: "Blog", path: "/web/blog" },
        { label: "Contact Us", path: "/web/contact-us" },
    ];

    constructor(private router: Router, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}
    ngOnInit() {
        // Initial theme setting (e.g., based on prefers-color-scheme)
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            this.isDarkMode = true;
        }
        this.applyTheme();
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
    }
    private applyTheme() {
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, "dark-mode");
            this.renderer.removeClass(this.document.body, "light-mode"); // Ensure only one class is active
        } else {
            this.renderer.addClass(this.document.body, "light-mode");
            this.renderer.removeClass(this.document.body, "dark-mode");
        }
    }
}
