import { Component } from "@angular/core";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-auth-header",
    standalone: true,
    imports: [RouterLink, MatToolbarModule, MatIconModule, MatButtonModule],
    template: `
        <mat-toolbar class="auth-header" color="primary">
            <span class="logo">
                <div class="unitum-logo-icon">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="#6366f1"/>
                        <path d="M8 10C8 8.9 8.9 8 10 8H14C15.1 8 16 8.9 16 10V16C16 17.1 15.1 18 14 18H10C8.9 18 8 17.1 8 16V10Z" fill="white"/>
                        <path d="M18 14C18 12.9 18.9 12 20 12H22C23.1 12 24 12.9 24 14V22C24 23.1 23.1 24 22 24H20C18.9 24 18 23.1 18 22V14Z" fill="white" fill-opacity="0.75"/>
                        <path d="M8 22C8 20.9 8.9 20 10 20H16C17.1 20 18 20.9 18 22C18 23.1 17.1 24 16 24H10C8.9 24 8 23.1 8 22Z" fill="white" fill-opacity="0.5"/>
                    </svg>
                </div>
                <span class="unitum-logo-text">Unitum</span>
            </span>
            <span class="spacer"></span>
            <button routerLink="/web/contact-us" mat-button class="help-btn">
                <mat-icon class="material-icons-outlined">help_outline</mat-icon>
                <span class="mobile-hidden">Help</span>
            </button>
        </mat-toolbar>
    `,
    styles: [`
        .unitum-logo-icon { display:flex; align-items:center; margin-right:10px; }
        .unitum-logo-text { font-size:18px; font-weight:700; letter-spacing:-0.5px; }
    `],
})
export class AuthHeaderComponent {}
