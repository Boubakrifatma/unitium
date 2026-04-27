import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, signal, inject, AfterViewInit, PLATFORM_ID, Inject } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCardModule } from "@angular/material/card";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { BarWhiteChartjs100Component } from "../../components/charts/bar-white-chartjs-100.component";
import { AreaBlueChartjs60Component } from "../../components/charts/area-blue-chartjs-60.component";
import { RouterLink } from "@angular/router";
import { BillingService } from "../../billing/services/billing.service";
import { Plan } from "../../billing/models/billing.models";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { BarBlueChartjs100Component } from "../../components/charts/bar-blue-chartjs-100.component";
import { HttpClient } from "@angular/common/http";

// Swiper imports with platform check
import Swiper from "swiper";
import { register } from "swiper/element/bundle";

interface Coupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  description?: string;
}

@Component({
    selector: "app-website",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatExpansionModule, MatButtonToggleModule, MatListModule, MatMenuModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, BarBlueChartjs100Component, AreaBlueChartjs60Component],
    template: `
        <!-- Coupon Popup for First-time Visitors -->
        @if (showCouponPopup() && firstCoupon()) {
          <div class="coupon-overlay" (click)="couponClickable() && closeCouponPopup()">
            <div class="coupon-popup" (click)="$event.stopPropagation()">
              <!-- Close Button -->
              <button class="coupon-close" (click)="closeCouponPopup()" title="Close">
                <mat-icon>close</mat-icon>
              </button>

              <!-- Icon Section with Gradient -->
              <div class="coupon-icon-wrap">
                <mat-icon class="coupon-main-icon">local_offer</mat-icon>
              </div>

              <!-- Title & Subtitle -->
              <h4 class="coupon-title">🎉 Welcome to Unitum!</h4>
              <p class="coupon-subtitle">Unlock exclusive access with your limited-time coupon</p>

              <!-- Coupon Code Box -->
              <div class="coupon-code-box">
                <span class="coupon-code-label">✨ Your Exclusive Code</span>
                <div class="coupon-code-value">{{ firstCoupon()?.code }}</div>

                <!-- Discount Badge & Description -->
                <div class="coupon-discount-info">
                  @if (firstCoupon()?.discountType === 'PERCENTAGE') {
                    <span class="coupon-badge-discount">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">trending_down</mat-icon>
                      {{ firstCoupon()?.discountValue }}% OFF
                    </span>
                  } @else {
                    <span class="coupon-badge-discount">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">sell</mat-icon>
                      {{ firstCoupon()?.discountValue }} DT OFF
                    </span>
                  }
                </div>

                @if (firstCoupon()?.description) {
                  <span class="coupon-desc">💡 {{ firstCoupon()?.description }}</span>
                }
              </div>

              <!-- CTA Button -->
              <button class="coupon-btn-use" (click)="scrollToPlans(); closeCouponPopup()">
                <mat-icon>rocket_launch</mat-icon>
                <span>Get Started with Unitum</span>
              </button>
            </div>
          </div>
        }

        <!-- Hero Section with Unitum branding -->
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <div class="unitum-badge mb-3">
                            <span class="badge-soft">UNITUM v1.0</span>
                        </div>
                        <h1 class="mb-3 display-4 fw-bold">
                            <span class="text-gradient">Unitum</span><br />
                            Collaborative Management Platform
                        </h1>
                        <p class="opacity-75 mb-4 mb-lg-5 lead">All-in-one solution for modern teams: project tracking, real-time collaboration, AI productivity insights, and smart resource management — built for SMEs, startups, and academic institutions.</p>
                        <div class="hero-buttons">
                            <button (click)="scrollToPlans()" mat-raised-button color="primary" class="mx-2 btn-lg"> Get started <mat-icon iconPositionEnd>arrow_forward</mat-icon></button>
                            <button (click)="scrollToFeatures()" mat-stroked-button class="mx-2 btn-lg">Explore Features</button>
                        </div>
                        <div class="trust-badge mt-4">
                            <span>Developed by <strong>Motez Selmi, Yosra Ben Ali, Fatma Boubakri, Eya Riahi, Nassim Maaoui & Minar Hemdan</strong></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="container-fluid">
                <div class="row gx-3 gx-lg-4 justify-content-center align-items-end overflow-hidden">
                    <div class="col-auto order-1 order-lg-1">
                        <mat-card class="height-150 width-200 position-relative mb-3 mb-lg-4 hover-lift">
                            <div class="w-100 rounded position-absolute start-0 bottom-0 z-index-0 opacity-50">
                                <app-area-blue-chartjs-60 class="height-80 w-100 d-block"></app-area-blue-chartjs-60>
                            </div>
                            <mat-card-header></mat-card-header>
                            <mat-card-content>
                                <h2 class="mb-1">AI Insights</h2>
                                <h3 class="fw-light text-secondary">Smart Analytics</h3>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <div class="col-auto order-3 order-lg-2 position-relative">
                        <img src="assets/img/home.png" alt="Unitum Dashboard Preview" class="height-400 mx-auto d-block rounded shadow-xl" style="margin-bottom: -50px; box-shadow: 0 -5px 35px rgba(0, 49, 92, 0.2); margin-top: 45px;" />
                    </div>
                    <div class="col-auto order-2 order-lg-3">
                        <app-bar-blue-chartjs-100 class="height-80 width-180 my-3 my-lg-4 d-block"></app-bar-blue-chartjs-100>
                        <mat-card class="height-150 width-200 bg-theme text-white position-relative theme-green mb-3 mb-lg-4 hover-lift">
                            <div class="h-100 w-100 rounded coverimg position-absolute z-index-0 opacity-50">
                                <img src="assets/img/background1.jpg" alt="" />
                            </div>
                            <mat-card-header></mat-card-header>
                            <mat-card-content class="z-index-1 position-relative">
                                <h2 class="fw-normal mb-1">Real-Time</h2>
                                <h3 class="fw-light">Collaboration</h3>
                                <p class="small">Synchronized teams</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats / Impact Section -->
        <div class="w-100 bg-theme text-white mb-4 mb-lg-5">
            <div class="container">
                <div class="row gx-3 gx-lg-4 text-center py-3">
                    <div class="col-6 col-lg-3 my-3 my-lg-4">
                        <h1 class="mb-1">100+</h1>
                        <p>Active Teams</p>
                    </div>
                    <div class="col-6 col-lg-3 my-3 my-lg-4">
                        <h1 class="mb-1">500+</h1>
                        <p>Projects Managed</p>
                    </div>
                    <div class="col-6 col-lg-3 my-3 my-lg-4">
                        <h1 class="mb-1">25+</h1>
                        <p>Universities</p>
                    </div>
                    <div class="col-6 col-lg-3 my-3 my-lg-4">
                        <h1 class="mb-1">40%</h1>
                        <p>Productivity Boost</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Features Section (Core Modules) -->
        <div class="container" id="features-section">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 mb-3 mb-lg-4">
                    <mat-card class="bg-light-gradient overflow-hidden hover-lift">
                        <mat-card-content class="py-md-4 px-md-4 py-lg-5 px-lg-5">
                            <h4 class="opacity-75">Unified Platform</h4>
                            <h1>Everything you need to manage projects effectively</h1>
                            <p class="text-secondary mb-4">Unitum combines project tracking, team collaboration, timeline management, and AI-driven personal insights into one seamless experience. No more switching between disconnected tools.</p>
                            <button routerLink="/auth/login" mat-raised-button color="primary">Join Unitum <mat-icon iconPositionEnd>arrow_forward</mat-icon></button>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 overflow-hidden hover-lift">
                        <mat-card-content class="py-lg-4 px-lg-4">
                            <div class="text-theme avatar avatar-50 rounded mt-3 mb-4 bg-soft-primary">
                                <mat-icon class="material-icons-outlined align-middle text-xl">groups</mat-icon>
                            </div>
                            <h2>Access Control</h2>
                            <p class="text-secondary mb-4">Granular role-based permissions for workspaces, projects, and collaboration spaces. Secure and flexible.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 overflow-hidden hover-lift">
                        <mat-card-content class="py-lg-4 px-lg-4">
                            <div class="text-theme avatar avatar-50 rounded mt-3 mb-4 bg-soft-primary">
                                <mat-icon class="material-icons-outlined align-middle text-xl">forum</mat-icon>
                            </div>
                            <h2>Real-Time Chat</h2>
                            <p class="text-secondary mb-4">Threaded discussions, discussion rooms, and AI-based sentiment analysis for healthier team communication.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Detailed feature grid -->
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="bg-light-gradient py-lg-4 px-md-4 py-lg-5 px-lg-5">
                    <div class="row gx-3 gx-lg-4 align-items-center">
                        <div class="col-12 col-lg-5">
                            <h4 class="opacity-75">Why choose Unitum?</h4>
                            <h1>Intelligent <span class="text-theme">project management</span> for modern teams</h1>
                            <p class="text-secondary mb-3 mb-lg-4">Built by a dedicated team of developers and designers, Unitum addresses the real challenges of remote and hybrid work: visibility, deadlines, permissions, and workload balance.</p>
                        </div>
                        <div class="col-12 col-lg-6 ms-auto">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-12 col-sm-6 mb-3 mb-lg-4">
                                    <div class="bg-light-theme text-theme avatar avatar-50 rounded mb-3">
                                        <mat-icon class="material-icons-outlined align-middle">timeline</mat-icon>
                                    </div>
                                    <h3 class="mb-3">Timeline & Deadlines</h3>
                                    <p class="text-secondary">Gantt charts, calendar views, milestone tracking, and smart alerts to keep your projects on schedule.</p>
                                </div>
                                <div class="col-12 col-sm-6 mb-3 mb-lg-4">
                                    <div class="bg-light-theme text-theme avatar avatar-50 rounded mb-3 theme-magenta">
                                        <mat-icon class="material-icons-outlined align-middle">insights</mat-icon>
                                    </div>
                                    <h3 class="mb-3">AI Productivity</h3>
                                    <p class="text-secondary">Personal dashboards, fatigue detection, and smart recommendations to enhance individual performance.</p>
                                </div>
                                <div class="col-12 col-sm-6 mb-3 mb-lg-4">
                                    <div class="bg-light-theme text-theme avatar avatar-50 rounded mb-3 theme-red">
                                        <mat-icon class="material-icons-outlined align-middle">subscriptions</mat-icon>
                                    </div>
                                    <h3 class="mb-3">Subscription Management</h3>
                                    <p class="text-secondary">Flexible enterprise & academic plans, automated invoicing, and secure payment processing.</p>
                                </div>
                                <div class="col-12 col-sm-6">
                                    <div class="bg-light-theme text-theme avatar avatar-50 rounded mb-3 theme-cyan">
                                        <mat-icon class="material-icons-outlined align-middle">api</mat-icon>
                                    </div>
                                    <h3 class="mb-3">Modular & Scalable</h3>
                                    <p class="text-secondary">RESTful APIs and a service-oriented architecture that grows with your organization.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <!-- Module showcase -->
            <div class="row gx-3 gx-lg-4 justify-content-center pt-4 pt-lg-5">
                <div class="col-12 col-lg-8 text-center mb-3 mb-lg-4">
                    <h4 class="opacity-75">Complete feature set</h4>
                    <h1 class="mb-2">Everything you need in <span class="text-theme">one platform</span></h1>
                    <p class="text-secondary mb-4">From membership to AI insights, Unitum delivers a fully integrated experience.</p>
                </div>
            </div>
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-12 col-lg-6 mb-3 mb-lg-4">
                    <mat-card class="hover-lift">
                        <mat-card-content class="py-lg-4 px-lg-4">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-6">
                                    <mat-icon class="feature-icon-large">assignment_ind</mat-icon>
                                    <h2>Membership & Access</h2>
                                    <p class="text-secondary">Secure authentication, workspace creation, and role-based access control for teams of any size.</p>
                                    <mat-list class="mb-3">
                                        <mat-list-item><mat-icon class="material-icons-outlined align-middle me-2">check_circle</mat-icon> User registration</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined align-middle me-2">check_circle</mat-icon> Workspace membership</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined align-middle me-2">check_circle</mat-icon> Role management</mat-list-item>
                                    </mat-list>
                                </div>
                                <div class="col-6">
                                    <img src="assets/img/feature-1.png" alt="Access control" class="w-100 rounded" />
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="h-100 overflow-hidden hover-lift">
                        <mat-card-content class="p-4">
                            <mat-icon class="feature-icon">groups</mat-icon>
                            <h2>Projects & Teams</h2>
                            <p class="text-secondary mb-3">Assign members, define roles (manager, editor, viewer), and track project status.</p>
                            <img src="assets/img/feature-2.png" alt="Team assignment" class="w-100 rounded mb-2" />
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="h-100 overflow-hidden hover-lift">
                        <mat-card-content class="p-4">
                            <mat-icon class="feature-icon">chat</mat-icon>
                            <h2>Comments & Rooms</h2>
                            <p class="text-secondary mb-4">Discussion rooms, threaded comments, and ML-based sentiment analysis.</p>
                            <img src="assets/img/feature-3.png" alt="Collaboration" class="w-100 mb-2" />
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Timeline and Insights -->
            <div class="row gx-3 gx-lg-4 align-items-center">
                <div class="col-12 col-lg-6">
                    <mat-card class="bg-light-theme mb-3 mb-lg-4 hover-lift">
                        <mat-card-content class="p-lg-4">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col">
                                    <mat-icon class="feature-icon">event</mat-icon>
                                    <h2>Timeline & Deadlines</h2>
                                    <p class="text-secondary mb-4">Milestone tracking, Gantt charts, calendar views, and automated deadline alerts to keep projects moving.</p>
                                </div>
                                <div class="col-auto align-self-end"></div>
                            </div>
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col-12 col-lg-6">
                                    <img src="assets/img/feature-4.png" alt="Timeline" class="w-100 rounded" />
                                </div>
                                <div class="col-12 col-lg-6">
                                    <img src="assets/img/feature-5.png" alt="Gantt" class="w-100 rounded" />
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6">
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content class="p-lg-4">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col">
                                    <mat-icon class="feature-icon">analytics</mat-icon>
                                    <h2>Personal Productivity Insights</h2>
                                    <p class="text-secondary mb-3">Track activity, get AI recommendations, and detect fatigue. Your personal productivity dashboard.</p>
                                </div>
                                <div class="col-auto align-self-end"></div>
                            </div>
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col-12 col-lg-6">
                                    <img src="assets/img/feature-6.png" alt="AI Insights" class="w-100 rounded" />
                                </div>
                                <div class="col-12 col-lg-6">
                                    <img src="assets/img/feature-7.png" alt="Dashboard" class="w-100 rounded" />
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Benefits row -->
            <div class="row gx-3 gx-lg-4 align-items-center mb-3 mb-lg-4 py-4 py-lg-5">
                <div class="col-6 col-lg-6">
                    <h3 class="opacity-75">Sustainable & Innovative</h3>
                    <h1 class="">Contributing to <span class="text-theme">global goals</span> with modern teamwork</h1>
                    <p class="text-secondary mb-4">Unitum aligns with SDG 8 (Decent Work), SDG 9 (Innovation), SDG 4 (Quality Education), and SDG 3 (Well-being). We're building a platform that cares about people and progress.</p>
                </div>
                <div class="col-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content>
                            <mat-icon class="feature-icon">school</mat-icon>
                            <h2>Academic Plans</h2>
                            <p class="text-secondary">Special pricing for universities and research labs.</p>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content>
                            <mat-icon class="feature-icon">corporate_fare</mat-icon>
                            <h2>Enterprise Ready</h2>
                            <p class="text-secondary">Dedicated support, SLA, and advanced security.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content>
                            <mat-icon class="feature-icon">security</mat-icon>
                            <h2>Secure by Design</h2>
                            <p class="text-secondary">Encrypted storage, role-based access, and secure auth.</p>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4 overflow-hidden hover-lift">
                        <div class="coverimg height-150 w-100">
                            <img src="assets/img/background2.jpg" alt="Team collaboration" />
                        </div>
                    </mat-card>
                </div>
            </div>
        </div>

        <!-- Meet the Team -->
        <div class="bg-light-gradient bg-light-theme">
            <div class="container py-4 py-lg-5">
                <h3 class="opacity-75">The minds behind Unitum</h3>
                <div class="row gx-3 gx-lg-4 mb-lg-4">
                    <div class="col-12 col-md-6 col-lg-6 mb-3 mb-lg-4">
                        <h1>Meet the <span class="text-gradient">development team</span><br />driving innovation.</h1>
                    </div>
                    <div class="col col-lg-5 ms-auto mb-3 mb-lg-4">
                        <p>Unitum is the result of passionate work by six talented developers and designers. We believe in clear communication, creative thinking, and building tools that make teamwork a pleasure.</p>
                    </div>
                </div>
                <div class="row gx-3 gx-lg-4">
                    <div class="col-12 col-md-6 col-lg-4 col-xl-2" *ngFor="let member of teamMembers">
                        <mat-card class="text-center mb-3 mb-lg-4 hover-lift">
                            <div mat-card-image class="height-200 overflow-hidden mb-3">
                                <figure class="h-100 w-100 coverimg">
                                    <img [src]="member.image" [alt]="member.name" />
                                </figure>
                            </div>
                            <mat-card-content>
                                <h3 class="text-truncated mb-1">{{ member.name }}</h3>
                                <p class="mb-1">{{ member.role }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
                <div class="row gx-3 gx-lg-4 text-center justify-content-center">
                    <div class="col-auto pt-4">
                        <h2 class="mb-2">Ready to transform your teamwork?</h2>
                        <p>Join the growing community of Unitum users.</p>
                        <button (click)="scrollToPlans()" mat-raised-button color="primary" class="btn-lg">Get started now</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- PRICING SECTION (unchanged structure, but labels updated to Unitum) -->
        <div id="plans-section" class="container py-4 py-lg-5">
            <div class="row gx-3 gx-lg-4 justify-content-center mb-3 mb-lg-4">
                <div class="col-12 col-md-8 col-lg-6 text-center">
                    <span class="badge badge-outline-theme mb-2">Unitum Pricing</span>
                    <h2 class="mb-2 fw-bold">Choose your plan</h2>
                    <p class="text-secondary">Tailored for <strong>Enterprise</strong> (companies & startups) or <strong>Academic</strong> (universities & research labs).</p>
                    <br />
                    <div class="pricing-tabs-wrapper d-flex justify-content-center mb-3">
                        <div class="pricing-tabs">
                            <button class="ptab" [class.ptab-active]="homePricingTab() === 'enterprise'" (click)="homePricingTab.set('enterprise')">
                                <mat-icon>corporate_fare</mat-icon> Enterprise
                            </button>
                            <button class="ptab" [class.ptab-active]="homePricingTab() === 'academic'" (click)="homePricingTab.set('academic')">
                                <mat-icon>school</mat-icon> Academic
                            </button>
                        </div>
                    </div>
                    <mat-button-toggle-group name="plans" [hideSingleSelectionIndicator]="hideSingleSelectionIndicator()">
                        <mat-button-toggle value="monthly" checked (change)="homeBillingCycle.set('monthly')">Monthly</mat-button-toggle>
                        <mat-button-toggle value="yearly" (change)="homeBillingCycle.set('annual')">Annual <span class="badge badge-theme ms-2">Save 20%</span></mat-button-toggle>
                    </mat-button-toggle-group>
                </div>
            </div>

            @if (homePricingTab() === 'enterprise') {
            <div class="row gx-3 gx-lg-4 align-items-stretch">
                @for (plan of billing.enterprisePlans(); track plan.id) {
                <div class="col-12 col-md-6 col-lg-3 mb-4">
                    <div class="plan-card h-100" [class.recommended-card]="plan.recommended" [class.on-request-card]="plan.onRequest">
                        @if (plan.recommended) { <div class="recommended-badge"><mat-icon>star</mat-icon> Recommended</div> }
                        <div class="plan-header">
                            <div class="plan-icon icon-enterprise"><mat-icon>{{ plan.icon }}</mat-icon></div>
                            <div><h4 class="mb-0 fw-bold">{{ plan.name }}</h4><p class="text-secondary small mb-0">{{ plan.subtitle }}</p></div>
                        </div>
                        <div class="plan-price">
                            @if (plan.onRequest) { <span class="price-amount">On Request</span><p class="text-secondary small mb-0">Custom pricing</p> }
                            @else { <span class="price-amount">{{ getHomePrice(plan) }}</span><span class="price-currency"> DT</span><span class="price-period">/mo</span> }
                        </div>
                        <ul class="plan-features flex-grow-1">
                            @for (feature of plan.features.slice(0,5); track feature) { <li><mat-icon class="feature-check">check_circle</mat-icon>{{ feature }}</li> }
                        </ul>
                        <div class="plan-cta mt-auto pt-2">
                            @if (plan.onRequest) { <button mat-stroked-button color="primary" routerLink="/web/contact-us" class="w-100 home-cta-btn"><mat-icon>mail</mat-icon> Contact Sales</button> }
                            @else { <button mat-flat-button color="primary" routerLink="/billing/checkout" [queryParams]="{plan: plan.id, type: 'enterprise', cycle: homeBillingCycle()}" class="w-100 home-cta-btn">Get Started <mat-icon iconPositionEnd>arrow_forward</mat-icon></button> }
                        </div>
                    </div>
                </div>
                }
            </div>
            }

            @if (homePricingTab() === 'academic') {
            <div class="row gx-3 gx-lg-4 align-items-stretch">
                @for (plan of billing.academicPlans(); track plan.id) {
                <div class="col-12 col-md-6 col-lg-3 mb-4">
                    <div class="plan-card h-100" [class.recommended-card-academic]="plan.recommended" [class.on-request-card]="plan.onRequest">
                        @if (plan.recommended) { <div class="recommended-badge recommended-badge-academic"><mat-icon>star</mat-icon> Recommended</div> }
                        <div class="plan-header">
                            <div class="plan-icon icon-academic"><mat-icon>{{ plan.icon }}</mat-icon></div>
                            <div><h4 class="mb-0 fw-bold">{{ plan.name }}</h4><p class="text-secondary small mb-0">{{ plan.subtitle }}</p></div>
                        </div>
                        <div class="plan-price">
                            @if (plan.onRequest) { <span class="price-amount">On Request</span><p class="text-secondary small mb-0">Custom pricing</p> }
                            @else { <span class="price-amount">{{ getHomePrice(plan) }}</span><span class="price-currency"> DT</span><span class="price-period">/mo</span> }
                        </div>
                        <ul class="plan-features flex-grow-1">
                            @for (feature of plan.features.slice(0,5); track feature) { <li><mat-icon class="feature-check">check_circle</mat-icon>{{ feature }}</li> }
                        </ul>
                        <div class="plan-cta mt-auto pt-2">
                            @if (plan.onRequest) { <button mat-stroked-button color="primary" routerLink="/web/contact-us" class="w-100 home-cta-btn"><mat-icon>mail</mat-icon> Contact Sales</button> }
                            @else { <button mat-flat-button color="primary" routerLink="/billing/checkout" [queryParams]="{plan: plan.id, type: 'academic', cycle: homeBillingCycle()}" class="w-100 home-cta-btn">Get Started <mat-icon iconPositionEnd>arrow_forward</mat-icon></button> }
                        </div>
                    </div>
                </div>
                }
            </div>
            }

            <div class="text-center mt-2 mb-3">
                <button routerLink="/billing/pricing" mat-button class="see-all-plans-btn"><mat-icon>compare</mat-icon> Compare all plans <mat-icon iconPositionEnd>arrow_forward</mat-icon></button>
            </div>
            <p class="text-center text-secondary small opacity-75"><mat-icon style="font-size:14px;vertical-align:middle">info</mat-icon> Subscriptions are activated after admin validation (24–48h). Login credentials are sent by email upon activation.</p>
        </div>

        <!-- Testimonials (unchanged but contextualized) -->
        <div class="bg-light-gradient bg-light-theme">
            <div class="container py-4 py-lg-5">
                <h3 class="opacity-75">Trusted by teams</h3>
                <h1 class="mb-2">What our <span class="text-theme">users say</span> about Unitum</h1>
                <p class="opacity-75">Real feedback from project managers and team leads.</p>
                <br />
                <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" pagination="true" class="swiper">
                    <swiper-slide class="pb-3 width-400">
                        <mat-card class="overflow-hidden mb-4 hover-lift">
                            <mat-card-content class="p-lg-4">
                                <span class="avatar avatar-50 mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50"><path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)"/></svg></span>
                                <h3 class="mb-2">Finally, a unified platform</h3>
                                <p class="text-secondary">Unitum replaced 4 different tools for us. The AI insights help our team stay balanced, and the real-time collaboration is seamless.</p>
                                <div class="row gx-3 align-items-center mt-3">
                                    <div class="col-auto"><div class="coverimg avatar avatar-60 rounded"><img src="assets/img/user-7.jpg" alt="" /></div></div>
                                    <div class="col"><h3 class="text-truncated mb-1">Sarah Chen</h3><p class="mb-1">Product Lead</p><p class="text-secondary small">TechStart Inc.</p></div>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </swiper-slide>
                    <swiper-slide class="pb-3 width-400">
                        <mat-card class="overflow-hidden mb-4 hover-lift">
                            <mat-card-content class="p-lg-4">
                                <span class="avatar avatar-50 mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50"><path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)"/></svg></span>
                                <h3 class="mb-2">Perfect for academic research</h3>
                                <p class="text-secondary">As a university lab, we needed flexible roles and clear timelines. Unitum delivered. The academic plan is a game-changer.</p>
                                <div class="row gx-3 align-items-center mt-3">
                                    <div class="col-auto"><div class="coverimg avatar avatar-60 rounded"><img src="assets/img/user-10.jpg" alt="" /></div></div>
                                    <div class="col"><h3 class="text-truncated mb-1">Dr. James O.</h3><p class="mb-1">Research Director</p><p class="text-secondary small">Univ. of Cambridge</p></div>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </swiper-slide>
                </swiper-container>
            </div>
        </div>
    `,
    styles: [`
    .text-gradient { background: linear-gradient(135deg, #0d6efd, #0b5ed7); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .badge-soft { background: rgba(13,110,253,0.1); color: #0d6efd; padding: 5px 14px; border-radius: 40px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.3px; }
    .btn-lg { padding: 10px 32px !important; font-size: 1rem !important; border-radius: 40px !important; transition: all 0.2s; }
    .btn-lg:hover { transform: translateY(-2px); }
    .hero-buttons { gap: 12px; display: flex; justify-content: center; flex-wrap: wrap; }
    .trust-badge { font-size: 0.8rem; opacity: 0.7; }
    .feature-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 15px; color: #0d6efd; }
    .feature-icon-large { font-size: 40px; width: 40px; height: 40px; margin-bottom: 15px; color: #0d6efd; }
    .bg-soft-primary { background: rgba(13,110,253,0.08); }
    .shadow-xl { box-shadow: 0 20px 35px -10px rgba(0,0,0,0.15); }
    .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 20px 30px -12px rgba(0,0,0,0.1); }
    .plan-card { border: 1.5px solid var(--bs-border-color); border-radius: 24px; padding: 24px; background: var(--bs-card-bg); transition: all 0.25s; position: relative; }
    .plan-card:hover { transform: translateY(-6px); box-shadow: 0 20px 35px -10px rgba(0,0,0,0.12); }
    .recommended-card { border-color: #0d6efd; background: linear-gradient(145deg, #ffffff, #f8fbff); }
    .recommended-card-academic { border-color: #198754; background: linear-gradient(145deg, #ffffff, #f0fff4); }
    .recommended-badge { position: absolute; top: 0; right: 0; background: #0d6efd; color: #fff; font-size: 0.7rem; padding: 6px 14px; border-radius: 0 20px 0 16px; display: flex; align-items: center; gap: 4px; }
    .recommended-badge-academic { background: #198754; }
    .plan-icon { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
    .icon-enterprise { background: rgba(13,110,253,0.1); color: #0d6efd; }
    .icon-academic { background: rgba(25,135,84,0.1); color: #198754; }
    .plan-price .price-amount { font-size: 2.3rem; font-weight: 800; }
    .feature-check { color: #198754 !important; }
    .home-cta-btn { border-radius: 40px !important; font-weight: 600 !important; }
    .coupon-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      animation: fadeInOverlay 0.3s ease;
    }
    @keyframes fadeInOverlay {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .coupon-popup {
      background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
      border-radius: 24px;
      padding: 0;
      max-width: 420px;
      text-align: center;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6);
      border: 1px solid rgba(13,110,253,0.1);
      overflow: hidden;
      position: relative;
    }
    .coupon-popup::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #0d6efd, #0dcaf0, #0d6efd);
    }
    @keyframes slideUp {
      from {
        transform: translateY(60px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .coupon-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0,0,0,0.05);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .coupon-close:hover {
      background: rgba(0,0,0,0.1);
      transform: rotate(90deg);
    }
    .coupon-icon-wrap {
      background: linear-gradient(135deg, #0d6efd, #0dcaf0);
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    .coupon-icon-wrap::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,0.1), transparent);
      border-radius: 50%;
    }
    .coupon-main-icon {
      font-size: 56px !important;
      width: 56px !important;
      height: 56px !important;
      color: white;
      position: relative;
      z-index: 1;
    }
    .coupon-title {
      font-size: 24px;
      font-weight: 700;
      margin: 24px 24px 8px;
      color: #1a202c;
      letter-spacing: -0.3px;
    }
    .coupon-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0 24px 24px;
      line-height: 1.5;
    }
    .coupon-code-box {
      padding: 24px;
      margin: 0 24px;
      background: linear-gradient(135deg, rgba(13,110,253,0.08), rgba(13,202,240,0.08));
      border-radius: 16px;
      border: 1px solid rgba(13,110,253,0.15);
      margin-bottom: 24px;
    }
    .coupon-code-label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .coupon-code-value {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      color: #0d6efd;
      margin-bottom: 16px;
      text-shadow: 0 2px 8px rgba(13,110,253,0.1);
    }
    .coupon-discount-info {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }
    .coupon-badge-discount {
      display: inline-block;
      background: linear-gradient(135deg, #ec4899, #f43f5e);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
    }
    .coupon-desc {
      display: inline-block;
      font-size: 13px;
      color: #0d6efd;
      background: rgba(13,110,253,0.1);
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: 500;
    }
    .coupon-btn-use {
      background: linear-gradient(135deg, #0d6efd, #0dcaf0) !important;
      color: white !important;
      border: none;
      border-radius: 12px !important;
      padding: 12px 32px !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      margin: 0 24px 24px !important;
      width: calc(100% - 48px) !important;
      cursor: pointer;
      transition: all 0.3s ease !important;
      box-shadow: 0 8px 20px rgba(13,110,253,0.3) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px;
    }
    .coupon-btn-use:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 28px rgba(13,110,253,0.4) !important;
    }
    .coupon-btn-use:active {
      transform: translateY(0) !important;
    }
    @media (max-width: 480px) {
      .coupon-popup {
        max-width: 90vw;
        border-radius: 20px;
        padding: 0;
      }
      .coupon-title {
        font-size: 20px;
        margin: 20px 20px 6px;
      }
      .coupon-subtitle {
        font-size: 13px;
        margin: 0 20px 20px;
      }
      .coupon-code-value {
        font-size: 1.8rem;
        letter-spacing: 2px;
      }
      .coupon-btn-use {
        margin: 0 20px 20px !important;
        width: calc(100% - 40px) !important;
      }
    }
    .badge-outline-theme { border: 1.5px solid #0d6efd; background: transparent; padding: 4px 16px; border-radius: 40px; }
    .pricing-tabs { background: #f1f3f5; border-radius: 60px; padding: 4px; }
    .ptab { padding: 8px 24px; border-radius: 40px; font-weight: 600; background: transparent; border: none; }
    .ptab-active { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.08); color: #0d6efd; }
    @media (max-width: 768px) { .height-400 { max-height: 280px; width: auto; } .width-400 { width: 280px; } }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WebsiteComponent implements OnInit, AfterViewInit {
    private readonly API = 'http://localhost:8084/api/billing';

    showCouponPopup = signal(false);
    couponClickable = signal(false);
    firstCoupon = signal<Coupon | null>(null);

    teamMembers = [
        { name: 'Motez Selmi', role: 'Lead Developer', image: 'assets/img/motez.png' },
        { name: 'Yosra Ben Ali', role: 'UX/UI Designer', image: 'assets/img/yosra.png' },
        { name: 'Fatma Boubakri', role: 'Backend Engineer', image: 'assets/img/fatma.png' },
        { name: 'Eya Riahi', role: 'Frontend Developer', image: 'assets/img/aya.png' },
        { name: 'Nassim Maaoui', role: 'DevOps & AI', image: 'assets/img/nassim.png' },
        { name: 'Minar Hemdan', role: 'Product Manager', image: 'assets/img/minar.png' }
    ];

    billing = inject(BillingService);
    homePricingTab = signal<'enterprise' | 'academic'>('enterprise');
    homeBillingCycle = signal<'monthly' | 'annual'>('monthly');

    constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const seen = localStorage.getItem('coupon_popup_seen');
            if (!seen) {
                this.http.get<any[]>(`${this.API}/coupons/active`).subscribe({
                    next: (coupons) => {
                        if (coupons && coupons.length) {
                            this.firstCoupon.set(coupons[0]);
                        } else {
                            // Demo coupon for testing when no active coupons
                            this.firstCoupon.set({
                                code: 'UNITUM20',
                                discountType: 'PERCENTAGE',
                                discountValue: 30,
                                description: 'Use this exclusive coupon on your first subscription'
                            });
                        }
                        setTimeout(() => { this.showCouponPopup.set(true); setTimeout(() => { this.couponClickable.set(true); }, 400); }, 600);
                    },
                    error: (err) => {
                        console.error('Coupon API error:', err);
                        // Demo coupon for testing when API fails
                        this.firstCoupon.set({
                            code: 'UNITUM20',
                            discountType: 'PERCENTAGE',
                            discountValue: 30,
                            description: 'Use this exclusive coupon on your first subscription'
                        });
                        setTimeout(() => { this.showCouponPopup.set(true); setTimeout(() => { this.couponClickable.set(true); }, 400); }, 600);
                    }
                });
            }
        }
    }

    ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            register();
        }
    }

    closeCouponPopup() {
        this.showCouponPopup.set(false);
        this.couponClickable.set(false);
        if (isPlatformBrowser(this.platformId)) localStorage.setItem('coupon_popup_seen', '1');
    }

    getHomePrice(plan: Plan): number {
        return this.homeBillingCycle() === 'monthly' ? plan.monthlyPrice! : (plan.annualPrice ?? plan.monthlyPrice)!;
    }

    hideSingleSelectionIndicator = signal(false);

    scrollToPlans() {
        document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
    }

    scrollToFeatures() {
        document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    }
}