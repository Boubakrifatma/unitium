import { Component, Input, computed } from "@angular/core";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { Observable } from "rxjs";
import { map, shareReplay, take } from "rxjs/operators";
import { AsyncPipe, CommonModule } from "@angular/common";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from "@angular/router";
import { MatAccordion, MatExpansionModule } from "@angular/material/expansion";
import { MatSidenav } from "@angular/material/sidenav";
import { MatButtonModule } from "@angular/material/button";
import { MatCard, MatCardModule } from "@angular/material/card";
import { AuthService } from "../../auth/auth.service";

interface NavItem {
    name: string;
    route?: string;
    icon: string;
    children?: NavItem[];
}

@Component({
    selector: "app-app-sidebar",
    standalone: true,
    imports: [CommonModule, MatListModule, MatIconModule, MatCardModule, RouterModule, MatExpansionModule, MatButtonModule],
    template: `
        <div class="sidebar d-flex flex-column flex-grow-1">
            <span class="logo position-absolute top-0 start-0 mx-3">
                <div class="unitum-sidebar-icon">
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="#6366f1"/>
                        <path d="M8 10C8 8.9 8.9 8 10 8H14C15.1 8 16 8.9 16 10V16C16 17.1 15.1 18 14 18H10C8.9 18 8 17.1 8 16V10Z" fill="white"/>
                        <path d="M18 14C18 12.9 18.9 12 20 12H22C23.1 12 24 12.9 24 14V22C24 23.1 23.1 24 22 24H20C18.9 24 18 23.1 18 22V14Z" fill="white" fill-opacity="0.75"/>
                        <path d="M8 22C8 20.9 8.9 20 10 20H16C17.1 20 18 20.9 18 22C18 23.1 17.1 24 16 24H10C8.9 24 8 23.1 8 22Z" fill="white" fill-opacity="0.5"/>
                    </svg>
                </div>
                <span class="logo-text unitum-sidebar-text">Unitum</span>
            </span>
            <nav class="sidebar-nav">
                <mat-nav-list>
                    <mat-accordion>
                        @for (item of navItems; track item.name) {
                            @if (item.children) {
                                <mat-expansion-panel class="">
                                    <mat-expansion-panel-header class="nav-item-header p-0 h-auto">
                                        <mat-panel-title class="flex items-center p-3">
                                            <mat-icon matListItemIcon class="material-icons-outlined">{{ item.icon }}</mat-icon>
                                            <span class="flex-grow nav-link-name">{{ item.name }}</span>
                                        </mat-panel-title>
                                    </mat-expansion-panel-header>
                                    <mat-nav-list>
                                        <mat-accordion [multi]="false">
                                            @for (child of item.children; track child.name) {
                                                @if (child.children) {
                                                    <mat-expansion-panel class="">
                                                        <mat-expansion-panel-header class="nav-item-header p-0 h-auto">
                                                            <mat-panel-title class="flex items-center p-3">
                                                                <mat-icon matListItemIcon class="material-icons-outlined">{{ child.icon }}</mat-icon>
                                                                <span class="flex-grow nav-link-name">{{ child.name }}</span>
                                                            </mat-panel-title>
                                                        </mat-expansion-panel-header>
                                                        <mat-nav-list>
                                                            @for (grandchild of child.children; track grandchild.name) {
                                                                <a mat-list-item [routerLink]="grandchild.route" routerLinkActive="active" (click)="closeSidenavIfHandset()" class="nav-item pl-6 py-2">
                                                                    <mat-icon matListItemIcon class="material-icons-outlined">{{ grandchild.icon }}</mat-icon>
                                                                    <span matListItemTitle>{{ grandchild.name }}</span>
                                                                </a>
                                                            }
                                                        </mat-nav-list>
                                                    </mat-expansion-panel>
                                                } @else {
                                                    <a mat-list-item [routerLink]="child.route" routerLinkActive="active" (click)="closeSidenavIfHandset()" class="nav-item pl-6 py-2">
                                                        <mat-icon matListItemIcon class="material-icons-outlined">{{ child.icon }}</mat-icon>
                                                        <span matListItemTitle>{{ child.name }}</span>
                                                    </a>
                                                }
                                            }
                                        </mat-accordion>
                                    </mat-nav-list>
                                </mat-expansion-panel>
                            } @else {
                                <a mat-list-item [routerLink]="item.route" routerLinkActive="active" (click)="closeSidenavIfHandset()" class="nav-item px-3 py-3 rounded-lg">
                                    <mat-icon matListItemIcon class="material-icons-outlined">{{ item.icon }}</mat-icon>
                                    <span matListItemTitle>{{ item.name }}</span>
                                </a>
                            }
                        }
                    </mat-accordion>
                </mat-nav-list>
            </nav>

            <div class="mt-auto w-100 ">
                @if (approvenotice) {
                    <mat-card class="bg-light-theme text-theme theme-green hide-iconic">
                        <mat-card-content><mat-icon class="material-icons-outlined align-middle me-2">check</mat-icon> Leave Approved </mat-card-content>
                    </mat-card>
                }
                @if (notice) {
                    <mat-card class="bg-light-gradient mt-4 hide-iconic">
                        <mat-card-content>
                            <div class="text-center mb-3">
                                <div class="mb-2" style="margin-top:-45px">
                                    <img src="assets/img/user-4.jpg" alt="" class="avatar avatar-60 rounded-circle" />
                                </div>
                                <p class="fw-bold mb-2">Liana Doe</p>
                                <p class="opacity-75 small mb-1 text-truncated">Going for holiday with family and friends</p>
                                <p class="opacity-75 small">Leave Request: 15 Aug 2025</p>
                            </div>
                            <div class="row gx-2">
                                <div class="col"><button matButton="filled" (click)="approvedNotice()">Approve</button></div>
                                <div class="col-auto"><button matButton class="theme-red" (click)="hideNotice()">Cancel</button></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                }
                <nav class="sidebar-nav">
                    <mat-nav-list>
                        <a mat-list-item routerLink="/app/settings" routerLinkActive="active" (click)="closeSidenavIfHandset()" class="nav-item px-3 py-3 rounded-lg">
                            <mat-icon matListItemIcon class="material-icons-outlined">settings</mat-icon>
                            <span matListItemTitle>Settings</span>
                        </a>
                    </mat-nav-list>
                </nav>
            </div>
        </div>
    `,
    styles: [`
        .unitum-sidebar-icon { display:flex; align-items:center; margin-right:8px; }
        .unitum-sidebar-text { font-size:17px !important; font-weight:700 !important; letter-spacing:-0.3px; }
    `],
})
export class AppSidebarComponent {
    notice = true;
    approvenotice = false;
    @Input() drawers!: MatSidenav;

    isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
        map((result) => result.matches),
        shareReplay(),
    );

    constructor(private breakpointObserver: BreakpointObserver, private authService: AuthService) {}

    get role(): string {
        return this.authService.currentUser()?.role ?? '';
    }

    get isSuperAdmin(): boolean { return this.role === 'SUPER_ADMIN'; }
    get isAdmin(): boolean      { return this.role === 'ADMIN' || this.isSuperAdmin; }
    get isManager(): boolean    { return this.role === 'MANAGER' || this.isAdmin; }

    get navItems(): NavItem[] {
        const all: NavItem[] = [];

        // SUPER_ADMIN only
        if (this.isSuperAdmin) {
            all.push({ name: "Platform Overview", route: "/app/super-admin", icon: "admin_panel_settings" });
            all.push({ name: "All Users", route: "/app/users", icon: "manage_accounts" });
        }

        // ADMIN + SUPER_ADMIN
        if (this.isAdmin) {
            all.push({ name: "Dashboard", route: "/app/dashboard", icon: "house" });
            if (!this.isSuperAdmin) {
                all.push({ name: "Users", route: "/app/users", icon: "manage_accounts" });
            }
            all.push({ name: "Employees", route: "/app/employee", icon: "person" });
        }

        // MANAGER + above
        if (this.isManager) {
            all.push({
                name: "Projects",
                icon: "dashboard",
                children: [
                    { name: "Projects", route: "/app/projects", icon: "assignment" },
                    { name: "Project Details", route: "/app/project-details", icon: "subject" },
                    { name: "All Task", route: "/app/all-tasks", icon: "checklist" },
                    { name: "Tasks Details", route: "/app/task-details", icon: "task" },
                    { name: "Task Kanban", route: "/app/kanban", icon: "view_kanban" },
                    { name: "Task Gantt Chart", route: "/app/gantt-chart", icon: "event" },
                    { name: "Time Tracking", route: "/app/time-tracking", icon: "alarm" },
                ],
            });
        }

        // EMPLOYEE + above
        all.push({
            name: "Applications",
            icon: "apps",
            children: [
                { name: "Explorer", route: "/app/explorer", icon: "folder_zip" },
                { name: "Calendar", route: "/app/calendar", icon: "event" },
                { name: "Chat", route: "/app/chat", icon: "chat" },
            ],
        });
        all.push({
            name: "Account",
            icon: "account_circle",
            children: [
                { name: "Profile", route: "/app/profile", icon: "perm_identity" },
                { name: "Settings", route: "/app/settings", icon: "settings" },
            ],
        });

        // SUPER_ADMIN — billing plateforme globale
        if (this.isSuperAdmin) {
            all.push({
                name: "Billing Platform",
                icon: "account_balance",
                children: [
                    { name: "Plans & Revenue",   route: "/app/super-admin-billing", icon: "inventory_2" },
                    { name: "Payment History",   route: "/app/super-admin-billing", icon: "receipt_long" },
                ],
            });
        }

        // ADMIN org uniquement — billing organisation
        if (this.isAdmin && !this.isSuperAdmin) {
            all.push({
                name: "Billing",
                icon: "receipt_long",
                children: [
                    { name: "My Subscription", route: "/app/org-billing", icon: "workspace_premium" },
                    { name: "My Invoices",     route: "/app/org-billing", icon: "receipt_long" },
                    { name: "Available Plans", route: "/app/org-billing", icon: "inventory_2" },
                ],
            });
        }

        return all;
    }

    private _allNavItems: NavItem[] = [
        { name: "Dashboard", route: "/app/dashboard", icon: "house" },
        { name: "Users", route: "/app/users", icon: "manage_accounts" },
        { name: "Employees", route: "/app/employee", icon: "person" },
        {
            name: "Projects",
            icon: "dashboard",
            children: [
                { name: "Projects", route: "/app/projects", icon: "assignment" },
                { name: "Project Details", route: "/app/project-details", icon: "subject" },
                { name: "All Task", route: "/app/all-tasks", icon: "checklist" },
                { name: "Tasks Details", route: "/app/task-details", icon: "task" },
                { name: "Task Kanban", route: "/app/kanban", icon: "view_kanban" },
                { name: "Task Gantt Chart", route: "/app/gantt-chart", icon: "event" },
                { name: "Time Tacking", route: "/app/time-tracking", icon: "alarm" },
            ],
        },
        {
            name: "E-commerce",
            icon: "shopping_cart",
            children: [
                { name: "Customers", route: "/app/customers", icon: "group" },
                { name: "Orders", route: "/app/orders", icon: "local_mall" },
                { name: "Shop", route: "/app/ecommerce", icon: "storefront" },
                { name: "Products", route: "/app/products", icon: "store" },
                { name: "Product", route: "/app/product", icon: "sell" },
                { name: "Cart", route: "/app/cart", icon: "shopping_cart" },
                { name: "Checkout", route: "/app/checkout", icon: "local_mall" },
                { name: "Add Product", route: "/app/add-product", icon: "add_box" },
                { name: "Invoice", route: "/app/invoice", icon: "receipt" },
            ],
        },
        {
            name: "Account",
            icon: "account_circle",
            children: [
                {
                    name: "Profile",
                    icon: "person",
                    children: [
                        { name: "Personal", route: "/app/profile", icon: "perm_identity" },
                        { name: "Level 3 Menu ", route: "/app/dashboard", icon: "subdirectory_arrow_right" },
                    ],
                },
                { name: "Subscription", route: "/app/subscription", icon: "workspace_premium" },
                { name: "Plans", route: "/app/plans", icon: "star" },
                { name: "Settings", route: "/app/settings", icon: "settings" },
            ],
        },
        {
            name: "Applications",
            icon: "apps",
            children: [
                { name: "Explorer", route: "/app/explorer", icon: "folder_zip" },
                { name: "Calendar", route: "/app/calendar", icon: "event" },
                { name: "Chat", route: "/app/chat", icon: "chat" },
            ],
        },
        {
            name: "Front Website",
            icon: "language",
            children: [
                { name: "Home", route: "../web/website", icon: "web" },
                { name: "About Us", route: "../web/about-us", icon: "apartment" },
                { name: "Case Study", route: "../web/case-study", icon: "border_all" },
                { name: "Blog", route: "../web/blog", icon: "newspaper" },
                { name: "Blog Details", route: "../web/blog-details", icon: "newspaper" },
                { name: "Contact Us", route: "../web/contact-us", icon: "mail" },
            ],
        },
        {
            name: "Supportive",
            icon: "extension",
            children: [
                { name: "Coming Soon", route: "../coming-soon", icon: "event" },
                { name: "Page Not Found", route: "../**", icon: "bug_report" },
            ],
        },
        { name: "Pages", route: "/app/pages", icon: "layers" },
    ];

    closeSidenavIfHandset(): void {
        this.isHandset$.pipe(take(1)).subscribe((isHandset) => {
            if (isHandset) {
                this.drawers.toggle();
            }
        });
    }
    hideNotice(): void {
        this.notice = false;
    }
    approvedNotice(): void {
        this.notice = false;
        this.approvenotice = true;
        setTimeout(() => {
            this.approvenotice = false;
        }, 1500);
    }
}
