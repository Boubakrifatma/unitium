import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCardModule } from "@angular/material/card";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { RouterLink } from "@angular/router";
import { MatButtonToggleModule } from "@angular/material/button-toggle";

interface Pages {
    path: string;
    redirectTo: string;
}

@Component({
    selector: "app-pages",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatButtonToggleModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Pages ({{ pagesList.length }})</h3>
                        <p class="text-secondary small">All Pages</p>
                    </div>

                    <div class="col-auto ms-auto"></div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                @for( page of pagesList; track page.path){
                <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                    <mat-card routerLink="{{ page.redirectTo }}" class=" mb-3 mb-lg-4">
                        <mat-card-content>
                            <p>{{ page.path }}</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PagesComponent {
    pagesList: Pages[] = [
        // app pages
        {
            path: "Dashboard",
            redirectTo: "/app/dashboard",
        },
        {
            path: "Projects",
            redirectTo: "/app/projects",
        },
        {
            path: "Project Details",
            redirectTo: "/app/project-details",
        },
        {
            path: "Employee",
            redirectTo: "/app/employee",
        },
        {
            path: "Time Tracking",
            redirectTo: "/app/time-tracking",
        },
        {
            path: "Task Details",
            redirectTo: "/app/task-details",
        },
        {
            path: "Kanban",
            redirectTo: "/app/kanban",
        },
        {
            path: "Gantt Chart",
            redirectTo: "/app/gantt-chart",
        },
        {
            path: "All Tasks",
            redirectTo: "/app/all-tasks",
        },
        {
            path: "Orders",
            redirectTo: "/app/orders",
        },
        {
            path: "Customers",
            redirectTo: "/app/customers",
        },
        {
            path: "Ecommerce",
            redirectTo: "/app/ecommerce",
        },
        {
            path: "Add Product",
            redirectTo: "/app/add-product",
        },
        {
            path: "Cart",
            redirectTo: "/app/cart",
        },
        {
            path: "Checkout",
            redirectTo: "/app/checkout",
        },
        {
            path: "Invoice",
            redirectTo: "/app/invoice",
        },
        {
            path: "Products",
            redirectTo: "/app/products",
        },
        {
            path: "Product",
            redirectTo: "/app/product",
        },
        {
            path: "Calendar",
            redirectTo: "/app/calendar",
        },
        {
            path: "Explorer",
            redirectTo: "/app/explorer",
        },
        {
            path: "Chat",
            redirectTo: "/app/chat",
        },
        {
            path: "Profile",
            redirectTo: "/app/profile",
        },
        {
            path: "Plans",
            redirectTo: "/app/plans",
        },
        {
            path: "Subscription",
            redirectTo: "/app/subscription",
        },
        {
            path: "Settings",
            redirectTo: "/app/settings",
        },
        // auth layout pages
        {
            path: "Landing",
            redirectTo: "/auth/landing",
        },
        {
            path: "Login",
            redirectTo: "/auth/login",
        },
        {
            path: "Signup",
            redirectTo: "/auth/signup",
        },
        {
            path: "Forgot Password",
            redirectTo: "/auth/forgot-password",
        },
        {
            path: "Change Password",
            redirectTo: "/auth/change-password",
        },
        {
            path: "Signup Success",
            redirectTo: "/auth/signup-success",
        },

        // front end website
        {
            path: "Website",
            redirectTo: "/app/website",
        },
        {
            path: "Blog",
            redirectTo: "/app/blog",
        },
        {
            path: "Blog Details",
            redirectTo: "/app/blog-details",
        },
        {
            path: "Case Study",
            redirectTo: "/app/case-study",
        },
        {
            path: "Contact Us",
            redirectTo: "/app/contact-us",
        },
        {
            path: "About Us",
            redirectTo: "/app/about-us",
        },
        {
            path: "Coming Soon",
            redirectTo: "/coming-soon",
        },
        {
            path: "404 - Not Found",
            redirectTo: "/**",
        },
    ];
}
