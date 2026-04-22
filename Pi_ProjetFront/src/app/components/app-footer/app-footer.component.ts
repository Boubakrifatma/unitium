import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatToolbarModule } from "@angular/material/toolbar";
import { RouterModule } from "@angular/router";

@Component({
    selector: "app-app-footer",
    standalone: true,
    imports: [RouterModule, MatToolbarModule, MatButtonModule],
    template: `
        <mat-toolbar>
            <div><p class="small text-secondary">&copy; 2025 Saas Dashboard. All rights reserved.</p></div>
            <div class="spacer"></div>
            <div class="footer-links">
                <a matButton routerLink="/app/privacy-policy" class="footer-link">Privacy Policy</a>
                <a matButton routerLink="/app/terms-of-use" class="footer-link">Terms of Service</a>
                <a matButton routerLink="/web/contact-us" class="footer-link">Contact</a>
            </div>
        </mat-toolbar>
    `,
    styles: [``],
})
export class AppFooterComponent {}
