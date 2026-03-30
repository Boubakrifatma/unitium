import { Component, ViewChild, OnInit, CUSTOM_ELEMENTS_SCHEMA, signal, computed } from "@angular/core";
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
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
import { MatExpansionModule } from "@angular/material/expansion";
register();

@Component({
    selector: "app-case-study",
    standalone: true,
    imports: [CommonModule, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatExpansionModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <h4 class="opacity-75">Case Study</h4>
                        <h1 class="mb-3">
                            Must watch our latest <br />
                            <span class="text-theme">Work Case Study</span> for Web & Mobile Apps
                        </h1>
                        <p class="opacity-75 mb-4 mb-lg-5">Enhance your web projects with our responsive Angular Material Admin Dashboard Template. This comprehensive UI kit provides a sleek, modern, and intuitive design to help you build powerful, feature-rich admin panels with ease.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                @for (caseStudy of caseStudies(); track $index) {
                <!-- Blog Post Card -->
                <div class="col-12 col-md-6 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <!-- Blog Image -->
                        <div mat-card-image class="coverimg w-100 height-200">
                            <img [src]="caseStudy.imageUrl" alt="Case Study Image" />
                        </div>
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3">
                                    <div class="col-auto">
                                        <div class="coverimg avatar avatar-60 rounded-circle">
                                            <img [src]="caseStudy.imageUrl2" alt="Company Image" />
                                        </div>
                                    </div>
                                    <div class="col">
                                        <mat-card-subtitle>{{ caseStudy.company }}</mat-card-subtitle>
                                        <mat-card-title>{{ caseStudy.title }}</mat-card-title>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pt-3 pt-lg-4">
                            <p class="text-secondary">{{ caseStudy.description }}</p>
                            <a matButton> View Details<mat-icon iconPositionEnd>arrow_forward</mat-icon> </a>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>

            <div class="z-index-1 py-4 py-lg-5 text-center">
                <h1 class="mb-2">Our clients</h1>
                <p class="text-secondary">View our work and projects</p>
                <br />
                <div class="row gx-3 gx-lg-4 justify-content-center text-center mb-3 mb-lg-4">
                    <div class="col-4 col-lg-2 col-xl-2">
                        <div class="coverimg avatar avatar-60 rounded-circle grayscale mb-3">
                            <img src="assets/img/logo-512.png" alt="Company Image" />
                        </div>
                        <p class="text-secondary small">Company 1</p>
                    </div>
                    <div class="col-4 col-lg-2 col-xl-2">
                        <div class="coverimg avatar avatar-60 rounded-circle grayscale mb-3">
                            <img src="assets/img/logo-512.png" alt="Company Image" />
                        </div>
                        <p class="text-secondary small">Company 2</p>
                    </div>
                    <div class="col-4 col-lg-2 col-xl-2">
                        <div class="coverimg avatar avatar-60 rounded-circle grayscale mb-3">
                            <img src="assets/img/logo-512.png" alt="Company Image" />
                        </div>
                        <p class="text-secondary small">Company 3</p>
                    </div>
                    <div class="col-4 col-lg-2 col-xl-2">
                        <div class="coverimg avatar avatar-60 rounded-circle grayscale mb-3">
                            <img src="assets/img/logo-512.png" alt="Company Image" />
                        </div>
                        <p class="text-secondary small">Company 4</p>
                    </div>
                    <div class="col-4 col-lg-2 col-xl-2">
                        <div class="coverimg avatar avatar-60 rounded-circle grayscale mb-3">
                            <img src="assets/img/logo-512.png" alt="Company Image" />
                        </div>
                        <p class="text-secondary small">Company 5</p>
                    </div>
                </div>
            </div>

            <!-- how to use   -->
            <div class="row gx-3 gx-lg-4 align-items-center mb-3 mb-lg-4 py-4 py-lg-5">
                <div class="col-6 col-lg-6">
                    <h3 class="opacity-75">Responsive widget HTML development</h3>
                    <h1 class="">Good code structures <span class="text-theme">responsive and customizable</span> with latest UI trends</h1>
                    <p class="text-secondary mb-4">Our template is specifically designed to fast-track your SaaS Dashboard Multipurpose Admin, finance, ecommerce, social, calendar, dashboards for business domain by providing ready-to-use UI pages tailored to industries. With pre-built pages like Shop, Products, dashboards, statistics, finace, cart, reminders, user profiles, invoice, and user settings etc.</p>
                </div>
                <div class="col-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h2>Easy to Download</h2>
                            <p class="text-secondary">We have document file in folder to guide you about code structure, customization, personalization settings defaults define.</p>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h2>Ready-to-use Pages</h2>
                            <p class="text-secondary">As domain specific app template it's benefit to have major commonly used screen ready. Choose page template and start development process.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h2>Personalize Branding</h2>
                            <p class="text-secondary">Choose your branding assets and color scheme and define it in main layouts. Template used local storage for live personalize value storage.</p>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4 overflow-hidden">
                        <div class="coverimg height-150 w-100">
                            <img src="assets/img/background2.jpg" alt="" />
                        </div>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CaseStudyComponent {
    caseStudies = signal([
        {
            title: "Revolutionizing Retail",
            company: "Global Retail Corp.",
            description: "A comprehensive digital transformation project that streamlined supply chain management and enhanced the customer experience, leading to a 30% increase in online sales.",
            imageUrl: "assets/img/product1.jpg",
            imageUrl2: "assets/img/product6.jpg",
        },
        {
            title: "Modernizing Healthcare",
            company: "HealthTech Solutions",
            description: "Built a secure and intuitive patient portal that improved communication, simplified appointment scheduling, and integrated with existing hospital systems.",
            imageUrl: "assets/img/product2.jpg",
            imageUrl2: "assets/img/product5.jpg",
        },
        {
            title: "FinTech Innovation",
            company: "SecureBank",
            description: "Developed a new mobile banking application with enhanced security features and a user-centric design, resulting in a 40% rise in mobile user adoption.",
            imageUrl: "assets/img/product3.jpg",
            imageUrl2: "assets/img/product4.jpg",
        },
        {
            title: "Logistics Optimization",
            company: "LogiFlow",
            description: "Implemented a real-time tracking and analytics platform that reduced delivery times by 20% and improved operational efficiency across the board.",
            imageUrl: "assets/img/product4.jpg",
            imageUrl2: "assets/img/product1.jpg",
        },
        {
            title: "Sustainable Energy Management",
            company: "Green Power Co.",
            description: "Created an intelligent dashboard for monitoring and managing energy consumption, helping clients reduce their carbon footprint and lower utility costs.",
            imageUrl: "assets/img/product5.jpg",
            imageUrl2: "assets/img/product2.jpg",
        },
        {
            title: "E-commerce Platform",
            company: "FashionHub",
            description: "Re-platformed their e-commerce site to a modern, scalable architecture, improving site performance and enabling a faster rollout of new features and campaigns.",
            imageUrl: "assets/img/product6.jpg",
            imageUrl2: "assets/img/product3.jpg",
        },
    ]);
    ngAfterInit() {}
}
