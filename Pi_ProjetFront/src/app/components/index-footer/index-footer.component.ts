import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatList, MatListModule } from "@angular/material/list";
import { MatToolbarModule } from "@angular/material/toolbar";
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-index-footer",
    standalone: true,
    imports: [RouterLink, MatToolbarModule, MatIconModule, MatCardModule, MatListModule, MatButtonModule],
    template: `
        <div class="container mt-5">
            <div class="row mb-3">
                <div class="col-12 col-xxl-4 mb-4 mb-xxl-0">
                    <a class="style-none d-block mb-3 mb-lg-4">
                        <div class="row gx-3 gx-lg-4">
                            <div class="col-auto">
                                <span class="logo-icon"><img src="assets/img/logo-512.png" class="width-50" alt="" /></span>
                            </div>
                            <div class="col ps-0 align-self-center">
                                <h3 class="text-gradient mb-1">SaaS Dashboard</h3>
                                <p class="text-secondary small">Template by AdminUIUX</p>
                            </div>
                        </div>
                    </a>

                    <h3 class="mb-3">#1 Creative &amp; Multipurpose UI Template</h3>
                    <p class="text-secondary">SaaS Dashboard is creative and multipurpose template. You can use it for CRM, Business application, Intranet Application, Portal service and Many more. It comes with unlimited possibilities and predefined styles which you can also mix up and create new style. Do support and spread a word for us.</p>
                </div>
                <div class="col-6 col-sm-6 col-md-4 col-xxl offset-xl-1 mb-4 mb-md-0">
                    <h4 class="mb-3">Main <span class="text-gradient">Dashboards</span></h4>
                    <mat-list style="--mat-list-list-item-one-line-container-height:40px; --mat-list-list-item-leading-icon-start-space:5px">
                        <mat-list-item routerLink="/app/dashboard">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Dashboard</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/app/cost">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Cost</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/app/co2footprint">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>CO2 Footprint</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/app/report">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Report</p>
                        </mat-list-item>
                    </mat-list>
                </div>
                <div class="col-6 col-sm-6 col-md-4 col-xxl mb-4 mb-md-0">
                    <h4 class="mb-3">Creative <span class="text-gradient">Pages</span></h4>
                    <mat-list style="--mat-list-list-item-one-line-container-height:40px; --mat-list-list-item-leading-icon-start-space:5px">
                        <mat-list-item routerLink="/app/calendar">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Calendar</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/app/chat">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Chat</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/app/explorer">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Explorer</p>
                        </mat-list-item>
                        <mat-list-item routerLink="/web/contact-us">
                            <mat-icon matListItemIcon>keyboard_arrow_right</mat-icon>
                            <p>Need Support</p>
                        </mat-list-item>
                    </mat-list>
                </div>
                <div class="col-12 col-md-4 col-xxl-3">
                    <h4 class="mb-2">Main office:</h4>
                    <p class="mb-3"></p>
                    <p class="mb-4">Test data 103909 Witamer CR, Niagara Falls, NY 14305, United States</p>

                    <div class="row gx-3 align-items-center mb-3">
                        <div class="col-auto"><mat-icon class="material-icons-outlined">alarm</mat-icon></div>
                        <div class="col">0441-215-518625<br /><span>Mon - Sat, 9:00 am - 10:00pm</span></div>
                    </div>
                    <div class="row gx-3 align-items-center mb-3">
                        <div class="col-auto"><mat-icon class="material-icons-outlined">call</mat-icon></div>
                        <div class="col">+1-000 000 100000</div>
                    </div>

                    <div class="row gx-3 align-items-center mb-3">
                        <div class="col-auto"><mat-icon class="material-icons-outlined">language</mat-icon></div>
                        <div class="col">
                            <a matButton href="https://adminuiux.com" target="_blank">www.adminuiux.com</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <mat-toolbar>
            <div><p class="small text-secondary">&copy; 2025 Saas Dashboard. All rights reserved.</p></div>
            <div class="spacer"></div>
            <div class="footer-links">
                <a matButton routerLink="/web/privacy-policy" class="footer-link">Privacy Policy</a>
                <a matButton routerLink="/web/terms-of-use" class="footer-link">Terms of Service</a>
                <a matButton routerLink="/web/contact-us" class="footer-link">Contact</a>
            </div>
        </mat-toolbar>
    `,
    styles: [``],
})
export class IndexFooterComponent {}
