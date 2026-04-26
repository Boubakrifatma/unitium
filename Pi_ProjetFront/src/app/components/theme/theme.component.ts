import { ChangeDetectionStrategy, Component, signal, effect, Input, Renderer2, Inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { AppConfig } from "../../app.config";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { MatButtonModule } from "@angular/material/button";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatDividerModule } from "@angular/material/divider";
import { CommonModule } from "@angular/common";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";

const themes = [
    { name: "Red", class: "theme-red" },
    { name: "Green", class: "theme-green" },
    { name: "Blue", class: "theme-blue" },
    { name: "Yellow", class: "theme-yellow" },
    { name: "Cyan", class: "theme-cyan" },
    { name: "Magenta", class: "theme-magenta" },
    { name: "Orange", class: "theme-orange" },
    { name: "Chartreuse", class: "theme-chartreuse" },
    { name: "Teal", class: "theme-spring-green" },
    { name: "Azure", class: "theme-azure" },
    { name: "Violet", class: "theme-violet" },
    { name: "Rose", class: "theme-rose" },
    { name: "Custom", class: "theme-custom" },
    { name: "Sky", class: "theme-sky" },
];

@Component({
    selector: "app-theme",
    standalone: true,
    imports: [CommonModule, MatSidenavModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatToolbarModule, MatIconModule, MatListModule, MatDividerModule],
    template: `
        <div class="sidebar px-3">
            <!-- Theme Selection -->
            <h4>Color</h4>
            <div class="row gx-3">
                <a *ngFor="let theme of themes" (click)="setTheme(theme.class)" class="col-6">
                    <mat-card class="mb-3" [ngClass]="theme.class">
                        <mat-card-content class="py-2">
                            <div class="row gx-2 align-items-center">
                                <div class="col-auto py-1">
                                    <div class="bg-theme avatar avatar-20 rounded-circle"></div>
                                </div>
                                <div class="col">
                                    <p
                                        class="small py-1"
                                        [ngClass]="{
                                            'font-semibold': currentTheme() === theme.class,
                                        }">
                                        {{ theme.name }}
                                    </p>
                                </div>
                                <div class="col-auto position-relative">
                                    @if (currentTheme() === theme.class) {
                                        <mat-icon color="primary" class="text-theme theme-green align-middle">check_circle</mat-icon>
                                    }
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </a>
            </div>

            <!-- Direction Selection -->
            <h4>Select Direction</h4>
            <mat-button-toggle-group [value]="currentDir()" (change)="setDir($event.value)" class="flex flex-row mb-4">
                <mat-button-toggle value="ltr" class=""><mat-icon class="material-icons-outlined">format_align_left</mat-icon> LTR </mat-button-toggle>
                <mat-button-toggle value="rtl" class=""><mat-icon class="material-icons-outlined">format_align_right</mat-icon> RTL </mat-button-toggle>
            </mat-button-toggle-group>

            <!-- Sidebar Style Selection -->
            <h4>Sidebar Style</h4>
            <mat-button-toggle-group [value]="currentSidebarStyle()" (change)="setSidebarStyle($event.value)" class="flex flex-row mb-2">
                <mat-button-toggle value="hide"><mat-icon class="material-icons-outlined">layout_sidebar</mat-icon> Hide </mat-button-toggle>
                <mat-button-toggle value="iconic"><mat-icon class="material-icons-outlined">dock_to_right</mat-icon> Iconic </mat-button-toggle>
            </mat-button-toggle-group>
        </div>
    `,
    styles: [``],
})
export class ThemeComponent {
    @Input() thememenu!: MatDrawer;

    currentTheme = signal<string>(localStorage.getItem("app-theme") || "");
    currentDir = signal<string>(localStorage.getItem("app-dir") || "ltr");
    currentSidebarStyle = signal<string>(AppConfig.iconicSidebar() ? "iconic" : "hide");

    themes = themes;

    constructor(
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {
        effect(() => {
            this.renderer.setAttribute(this.document.documentElement, "dir", this.currentDir());

            if (this.currentTheme()) {
                themes.forEach((theme) => this.renderer.removeClass(this.document.body, theme.class));
                this.renderer.addClass(this.document.body, this.currentTheme());
            }
            localStorage.setItem("app-theme", this.currentTheme());
            localStorage.setItem("app-dir", this.currentDir());
        });
    }

    setTheme(themeClass: string) {
        this.currentTheme.set(themeClass);
    }

    setDir(dir: string) {
        this.currentDir.set(dir);
    }

    setSidebarStyle(style: string) {
        const isIconic = style === "iconic";
        AppConfig.iconicSidebar.set(isIconic);
        this.currentSidebarStyle.set(style);
    }
}
