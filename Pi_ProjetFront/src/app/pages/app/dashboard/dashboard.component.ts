import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, computed, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { SemiDoughnutChartjs180Component } from "../../../components/charts/semi-doughnut-chartjs-180.component";
import { CircleProgressRedComponent } from "../../../components/charts/circle-progress-red.component";
import { CircleProgressYellowComponent } from "../../../components/charts/circle-progress-yellow.component";
import { CircleProgressGreenComponent } from "../../../components/charts/circle-progress-green.component";
import { CircleProgressBlueComponent } from "../../../components/charts/circle-progress-blue.component";
import { InventoryBannerChartComponent } from "../../../components/charts/inventory-banner-chart.component";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { PageRightComponent } from "../../../components/page-right/pageright.component";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { TimelineChartComponent } from "../../../components/charts/timelinechart.component";
import { HeatmapChartComponent } from "../../../components/charts/heatmap-chart.component";
import { AreaGreenChartjs200Component } from "../../../components/charts/area-green-chartjs-200.component";
import { AreaRedChartjs200Component } from "../../../components/charts/area-red-chartjs-200.component";
import { EmployeeSelectComponent } from "../../../components/employee-select/employee-select.component";

declare const jsVectorMap: any;

type ViewMode = "day" | "week" | "month";
interface Employee {
    id: number;
    name: string;
    avatarUrl: string; // Placeholder URL
    title: string;
}

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonToggleModule,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatFormFieldModule,
        FormsModule,
        MatListModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatProgressBarModule,
        SemiDoughnutChartjs180Component,
        CircleProgressRedComponent,
        CircleProgressYellowComponent,
        CircleProgressGreenComponent,
        CircleProgressBlueComponent,
        InventoryBannerChartComponent,
        PageRightComponent,
        TimelineChartComponent,
        HeatmapChartComponent,
        AreaGreenChartjs200Component,
        AreaRedChartjs200Component,
        EmployeeSelectComponent,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Dashboard</h3>
                        <p class="small opacity-50">Look at a glance</p>
                    </div>
                    @if (filterOn) {
                        <div class="col-12 col-sm-6 col-lg-auto mb-3 mb-xl-0 order-3 order-lg-2">
                            <mat-button-toggle-group [value]="viewMode()" (change)="viewMode.set($event.value)">
                                <mat-button-toggle value="day">Day</mat-button-toggle>
                                <mat-button-toggle value="week">Week</mat-button-toggle>
                                <mat-button-toggle value="month">Month</mat-button-toggle>
                            </mat-button-toggle-group>
                        </div>

                        <div class="col-12 col-sm-6 col-lg-3 c col-xxl-2 mb-3 mb-xl-0 order-4 order-lg-3">
                            <app-employee-select></app-employee-select>
                        </div>
                        <div class="col-12 col-sm-6 col-lg-4 col-xl-3 col-xxl-auto mb-3 mb-xl-0 order-5 order-lg-4">
                            <app-page-right></app-page-right>
                        </div>
                    }
                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matIconButton (click)="toggleFilter()">
                            @if (filterOn) {
                                <mat-icon class="material-icons-outlined">filter_alt_off</mat-icon>
                            } @else {
                                <mat-icon class="material-icons-outlined">filter_alt</mat-icon>
                            }
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            <!-- sales summary -->
            <div class="row gx-3 gx-lg-4">
                <!-- in stock -->
                <div class="col-6 col-md-6 col-lg-3">
                    <mat-card class="theme-blue mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-30 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">group</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-0">Returning Users</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col">
                                    <h3 class="fw-medium mb-1">750</h3>
                                    <p class="small text-secondary">5 / <span class="text-theme theme-green">3.15%</span></p>
                                </div>
                                <div class="col-auto">
                                    <app-circle-progress-blue class="avatar avatar-60 rounded-circle"></app-circle-progress-blue>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- manufacture  -->
                <div class="col-6 col-md-6 col-lg-3">
                    <mat-card class="theme-green mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-30 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">diversity_1</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-1">New Users</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col">
                                    <h2 class="mb-1">320</h2>
                                    <p class="small text-secondary">25 / <span class="text-theme theme-green">3.15%</span></p>
                                </div>
                                <div class="col-auto">
                                    <app-circle-progress-green class="avatar avatar-60 rounded-circle"></app-circle-progress-green>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- wishlist  -->
                <div class="col-6 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4 theme-orange">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-30 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">group_remove</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-0">User lost</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col">
                                    <h2 class="mb-1">27</h2>
                                    <p class="small text-secondary">2 / <span class="text-theme theme-green">4.13%</span></p>
                                </div>
                                <div class="col-auto">
                                    <app-circle-progress-yellow class="avatar avatar-60 rounded-circle"></app-circle-progress-yellow>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- referral  -->
                <div class="col-6 col-md-6 col-lg-3">
                    <mat-card class="theme-red mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-30 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">group</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-0">ARR</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col py-1">
                                    <h2 class="mb-1">$ 25.10 k</h2>
                                    <p class="small text-secondary">530.00 / <span class="text-theme theme-green">4.15%</span></p>
                                </div>
                                <div class="col-auto d-none d-md-block">
                                    <app-circle-progress-red class="avatar avatar-60 rounded-circle"></app-circle-progress-red>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- timeline -->
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-header>
                    <div class="w-100">
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto mb-3 mb-lg-4">
                                <div class="avatar avatar-40 text-theme rounded">
                                    <span class="material-symbols-outlined"> pace </span>
                                </div>
                            </div>
                            <div class="col mb-3 mb-lg-4">
                                <h3>Timeline</h3>
                            </div>
                        </div>
                    </div>
                </mat-card-header>
                <mat-card-content class="pb-0">
                    <app-timeline-chart class="height-200 d-block mb-3 mb-lg-4"></app-timeline-chart>
                    <div class="row gx-3 align-items-center">
                        <div class="col-6 col-lg-3 col-xl-2 mb-3">
                            <h3 class="mb-1">42.50 <small>hrs</small></h3>
                            <p class="text-secondary"><span class="avatar avatar-10 rounded bg-theme theme-blue align-middle"></span> Productive</p>
                        </div>
                        <div class="col-6 col-lg-3 col-xl-2 mb-3">
                            <h3 class="mb-1">18.00 <small>hrs</small></h3>
                            <p class="text-secondary"><span class="avatar avatar-10 rounded bg-theme theme-sky align-middle"></span> Learning</p>
                        </div>
                        <div class="col-6 col-lg-3 col-xl-2 mb-3">
                            <h3 class="mb-1">14.00 <small>hrs</small></h3>
                            <p class="text-secondary"><span class="avatar avatar-10 rounded bg-light-theme theme-chartreuse align-middle"></span> Unproductive</p>
                        </div>
                        <div class="col-6 col-lg-3 col-xl-2 mb-3">
                            <h3 class="mb-1">6.50 <small>hrs</small></h3>
                            <p class="text-secondary"><span class="avatar avatar-10 rounded align-middle bg-theme theme-red"></span> Idle Time</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-xl-6">
                    <!-- sales chart -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Sales and Profit</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <app-inventory-banner-chart class="height-250 w-100 d-block mb-3 mb-lg-4"></app-inventory-banner-chart>
                            <!-- cost and profit  -->
                            <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper">
                                <swiper-slide class="width-150">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme rounded text-theme bg-light-theme theme-chartreuse">
                                                <mat-icon class="material-icons-outlined">area_chart</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">$ 50.00k</h3>
                                            <p class="text-secondary small mb-0">Revenue</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-150">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                <mat-icon class="material-icons-outlined">wallet</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">$ 12.50k</h3>
                                            <p class="text-secondary small mb-0">Profit</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-150">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-sky">
                                                <mat-icon class="material-icons-outlined">paid</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-0">$ 35.13k</h3>
                                            <p class="text-secondary small mb-0">Expense</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                            </swiper-container>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-xl-6">
                    <!-- sales mode chart -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">language</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Sales Activities</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <app-heatmap-chart class="height-250 w-100 d-block mb-3 mb-lg-4"></app-heatmap-chart>
                            <!-- online offline  -->
                            <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper">
                                <swiper-slide class="width-150">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                <mat-icon class="material-icons-outlined">local_mall</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">$ 50.00k</h3>
                                            <p class="text-secondary small mb-0">Online Sale</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-150">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                                                <mat-icon class="material-icons-outlined">storefront</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">$ 12.50k</h3>
                                            <p class="text-secondary small mb-0">Offline Sale</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                            </swiper-container>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="row gx-3 gx-lg-4">
                <!-- training -->
                <div class="col-12 col-md-12 col-lg-6">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-4">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined text-theme">school</mat-icon>
                                </div>
                                <div class="col">
                                    <h3 class="mb-1">Trainings</h3>
                                </div>
                                <div class="col-auto"></div>
                            </div>
                            <div class="row gx-3 align-items-center">
                                <div class="col-12 col-md-6 mb-3 mb-md-0">
                                    <h2 class="mb-1">18.00 <small>hours</small></h2>
                                    <p class="text-theme theme-green mb-1"><i class="bi bi-arrow-up"></i> 1.71 (0.73%)</p>
                                    <p class="text-secondary small mb-4">16.50 hours in Previous Months</p>
                                    <app-area-green-chartjs-200 class="w-100 height-170 d-block"></app-area-green-chartjs-200>
                                </div>
                                <div class="col-12 col-md-6 px-0">
                                    <mat-list class="py-0">
                                        <mat-list-item>
                                            <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                                <img src="assets/img/product1.jpg" alt="" />
                                            </div>
                                            <span matListItemTitle>Agentic AI Startup</span>
                                            <span matListItemLine class="fw-bold">$ 152.00 <s class="text-secondary fw-normal">$180.00</s></span>
                                            <span matListItemLine>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                                <span class="text-secondary"> 152 ratings</span>
                                            </span>
                                        </mat-list-item>
                                        <mat-list-item>
                                            <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                                <img src="assets/img/product6.jpg" alt="" />
                                            </div>
                                            <span matListItemTitle>Frontend Development with AI bots</span>
                                            <span matListItemLine class="fw-bold">$ 80.00 <s class="text-secondary fw-normal">$ 120.00</s></span>
                                            <span matListItemLine>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star_half</mat-icon>

                                                <span class="text-secondary"> 189 ratings</span>
                                            </span>
                                        </mat-list-item>
                                        <mat-list-item>
                                            <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                                <img src="assets/img/product3.jpg" alt="" />
                                            </div>
                                            <span matListItemTitle>Stay Creative with AI</span>
                                            <span matListItemLine class="fw-bold text-theme">FREE <s class="text-secondary fw-normal">$ 144.00</s></span>
                                            <span matListItemLine>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                                <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                                <span class="text-secondary"> 35 ratings</span>
                                            </span>
                                        </mat-list-item>
                                    </mat-list>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- break timing -->
                <div class="col-12 col-md-12 col-lg-6">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-4">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined text-theme">timer</mat-icon>
                                </div>
                                <div class="col">
                                    <h3 class="mb-1">Break Timing</h3>
                                </div>
                                <div class="col-auto"></div>
                            </div>
                            <div class="row gx-3">
                                <div class="col-12 col-md-6 mb-3 mb-md-0">
                                    <h2 class="mb-1">15.35 <small>hours</small></h2>
                                    <p class="text-theme theme-green mb-1"><i class="bi bi-arrow-up"></i> 1.81 (0.43%)</p>
                                    <p class="text-secondary small mb-4">14.10 hours in Previous Months</p>
                                    <app-area-red-chartjs-200 class="w-100 height-170 d-block"></app-area-red-chartjs-200>
                                </div>
                                <div class="col-12 col-md-6">
                                    <h2 class="mb-1">1hr 10min</h2>
                                    <p class="text-secondary">Today's Break</p>

                                    <div class="row gx-3 align-items-center mb-4">
                                        <div class="col-auto">
                                            <span class="material-symbols-outlined text-theme text-lg"> dinner_dining </span>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">45 minutes</h3>
                                            <p class="mb-1">Lunch Break</p>
                                            <p class="text-secondary small">12:00 PM - 12:45 PM</p>
                                        </div>
                                    </div>

                                    <div class="row gx-3 align-items-center mb-4">
                                        <div class="col-auto">
                                            <span class="material-symbols-outlined text-theme text-lg"> coffee </span>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">25 minutes</h3>
                                            <p class="mb-1">Tea Break</p>
                                            <p class="text-secondary small">4:10 PM - 4:35 PM</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <!-- offer -->
                <div class="col-12 col-md-6 col-lg-6 col-xxl-3">
                    <mat-card class="overflow-hidden mb-3 mb-lg-4">
                        <div class="row mx-0">
                            <div class="col-6 bg-theme text-white text-center py-4 z-index-1 theme-orange">
                                <div class="position-relative">
                                    <h1 class="mb-1">6.15%</h1>
                                    <p class="mb-2">Interest Rate</p>
                                    <p class="opacity-75 small">Business Loan are at cheaper rate</p>
                                </div>
                            </div>
                            <div class="col-6 position-relative">
                                <figure class="coverimg position-absolute w-100 h-100 start-0 top-0 m-0">
                                    <img src="assets/img/product2.jpg" class="mw-100" alt="" />
                                </figure>
                            </div>
                        </div>
                    </mat-card>
                    <mat-card class="overflow-hidden mb-3 mb-lg-4">
                        <div class="row mx-0">
                            <div class="col-6 pe-0 bg-theme text-white half-circle-vertical text-center py-4 z-index-1">
                                <div class="position-relative">
                                    <h1 class="mb-1">15<small>%</small></h1>
                                    <p class="mb-2">Discount</p>
                                    <p class="opacity-75 small">
                                        Buy more,<br />
                                        Get more
                                    </p>
                                </div>
                            </div>
                            <div class="col-6 position-relative">
                                <figure class="coverimg position-absolute w-100 h-100 start-0 top-0 m-0">
                                    <img src="assets/img/product1.jpg" class="mw-100" alt="" />
                                </figure>
                            </div>
                        </div>
                    </mat-card>
                </div>

                <!-- Average Expenses -->
                <div class="col-12 col-md-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 text-theme rounded">
                                        <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h3>Average Expenses</h3>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="text-center">
                            <div class="height-140 w-100 position-relative mb-3">
                                <div class="position-absolute bottom-0 mx-auto start-0 w-100 mb-2">
                                    <p class="text-secondary small mb-1">Total Expense</p>
                                    <h3 class="mb-0">5.4k <small>USD</small></h3>
                                </div>
                                <app-semi-doughnut-chartjs-180 class="height-140 w-100 position-relative" id="semidoughnutchart" style="top:-20px"></app-semi-doughnut-chartjs-180>
                            </div>
                            <p class="text-secondary">You have spend most on raw materials and have to look at order cancellation</p>

                            <p class="small text-secondary mb-1">Last 3 months</p>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- Top countries earning -->
                <div class="col-12 col-md-12 col-lg-12 col-xxl-6">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 text-theme rounded">
                                        <mat-icon class="material-icons-outlined">local_mall</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h3 class="mb-1">Global Country Performance</h3>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-12 col-md-6">
                                    <div id="jsvectormap" class="w-100 height-250"></div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <div class="row gx-3 mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <div class="rounded bg-theme text-white p-3">
                                                <p class="opacity-75 small">Target<br />Income</p>
                                                <h3>$2542</h3>
                                            </div>
                                        </div>
                                        <div class="col align-self-center">
                                            <div class="row gx-3 mb-3">
                                                <div class="col">
                                                    <p class="text-secondary small mb-1">United States</p>
                                                    <p>New York</p>
                                                </div>
                                                <div class="col-auto text-end">
                                                    <p class="text-secondary small mb-1">New Sales</p>
                                                    <p>120 orders</p>
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <mat-progress-bar mode="determinate" value="70" style="--mat-progress-bar-active-indicator-height:6px; --mat-progress-bar-track-height:6px"></mat-progress-bar>
                                            </div>
                                            <p class="small text-secondary">Targeted Orders: <span class="float-end">260</span></p>
                                        </div>
                                    </div>
                                    <div class="row gx-3 theme-chartreuse">
                                        <div class="col-auto">
                                            <div class="rounded bg-light-theme p-3">
                                                <p class="opacity-75 small">Target<br />Income</p>
                                                <h3>$2542</h3>
                                            </div>
                                        </div>
                                        <div class="col align-self-center">
                                            <div class="row gx-3 mb-3">
                                                <div class="col">
                                                    <p class="text-secondary small mb-1">United States</p>
                                                    <p>New York</p>
                                                </div>
                                                <div class="col-auto text-end">
                                                    <p class="text-secondary small mb-1">New Sales</p>
                                                    <p>120 orders</p>
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <mat-progress-bar mode="determinate" value="70" style="--mat-progress-bar-active-indicator-height:6px; --mat-progress-bar-track-height:6px"></mat-progress-bar>
                                            </div>
                                            <p class="small text-secondary">Targeted Orders: <span class="float-end">260</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardComponent implements OnInit {
    filterOn = true;
    currentWidth = signal(0);

    // view mode day
    viewMode = signal<ViewMode>("day");

    // width check
    @HostListener("window:resize", ["$event"])
    onResize(event: Event) {
        this.checkWidthAndSetFilter();
    }

    ngOnInit() {}
    ngAfterViewInit() {
        // width check
        this.checkWidthAndSetFilter();

        //js vectormap
        const map = new jsVectorMap({
            selector: "#jsvectormap",
            regionStyle: {
                initial: {
                    fill: "rgba(0, 73, 232, 0.15)",
                    stroke: "rgba(0, 73, 232, 0.4)",
                    strokeWidth: 1,
                },
            },
            visualizeData: {
                scale: ["#f3faff", "#0049e8"],
                values: {
                    AF: 16.63,
                    AL: 11.58,
                    DZ: 158.97,
                    AO: 85.81,
                    AG: 1.1,
                    AR: 351.02,
                    AM: 8.83,
                    AU: 1219.72,
                    AT: 366.26,
                    AZ: 52.17,
                    BS: 7.54,
                    BH: 21.73,
                    BD: 105.4,
                    BB: 3.96,
                    BY: 52.89,
                    BE: 461.33,
                    BZ: 1.43,
                    BJ: 6.49,
                    BT: 1.4,
                    BO: 19.18,
                    BA: 16.2,
                    BW: 12.5,
                    BR: 2023.53,
                    BN: 11.96,
                    BG: 44.84,
                    BF: 8.67,
                    BI: 1.47,
                    KH: 11.36,
                    CM: 21.88,
                    CA: 1563.66,
                    CV: 1.57,
                    CF: 2.11,
                    TD: 7.59,
                    CL: 199.18,
                    CN: 5745.13,
                    CO: 283.11,
                    KM: 0.56,
                    CD: 12.6,
                    CG: 11.88,
                    CR: 35.02,
                    CI: 22.38,
                    HR: 59.92,
                    CY: 22.75,
                    CZ: 195.23,
                    DK: 304.56,
                    DJ: 1.14,
                    DM: 0.38,
                    DO: 50.87,
                    EC: 61.49,
                    EG: 216.83,
                    SV: 21.8,
                    GQ: 14.55,
                    ER: 2.25,
                    EE: 19.22,
                    ET: 30.94,
                    FJ: 3.15,
                    FI: 231.98,
                    FR: 2555.44,
                    GA: 12.56,
                    GM: 1.04,
                    GE: 11.23,
                    DE: 3305.9,
                    GH: 18.06,
                    GR: 305.01,
                    GD: 0.65,
                    GT: 40.77,
                    GN: 4.34,
                    GW: 0.83,
                    GY: 2.2,
                    HT: 6.5,
                    HN: 15.34,
                    HK: 226.49,
                    HU: 132.28,
                    IS: 12.77,
                    IN: 1430.02,
                    ID: 695.06,
                    IR: 337.9,
                    IQ: 84.14,
                    IE: 204.14,
                    IL: 201.25,
                    IT: 2036.69,
                    JM: 13.74,
                    JP: 5390.9,
                    JO: 27.13,
                    KZ: 129.76,
                    KE: 32.42,
                    KI: 0.15,
                    KR: 986.26,
                    KW: 117.32,
                    KG: 4.44,
                    LA: 6.34,
                    LV: 23.39,
                    LB: 39.15,
                    LS: 1.8,
                    LR: 0.98,
                    LY: 77.91,
                    LT: 35.73,
                    LU: 52.43,
                    MK: 9.58,
                    MG: 8.33,
                    MW: 5.04,
                    MY: 218.95,
                    MV: 1.43,
                    ML: 9.08,
                    MT: 7.8,
                    MR: 3.49,
                    MU: 9.43,
                    MX: 1004.04,
                    MD: 5.36,
                    MN: 5.81,
                    ME: 3.88,
                    MA: 91.7,
                    MZ: 10.21,
                    MM: 35.65,
                    NA: 11.45,
                    NP: 15.11,
                    NL: 770.31,
                    NZ: 138,
                    NI: 6.38,
                    NE: 5.6,
                    NG: 206.66,
                    NO: 413.51,
                    OM: 53.78,
                    PK: 174.79,
                    PA: 27.2,
                    PG: 8.81,
                    PY: 17.17,
                    PE: 153.55,
                    PH: 189.06,
                    PL: 438.88,
                    PT: 223.7,
                    QA: 126.52,
                    RO: 158.39,
                    RU: 1476.91,
                    RW: 5.69,
                    WS: 0.55,
                    ST: 0.19,
                    SA: 434.44,
                    SN: 12.66,
                    RS: 38.92,
                    SC: 0.92,
                    SL: 1.9,
                    SG: 217.38,
                    SK: 86.26,
                    SI: 46.44,
                    SB: 0.67,
                    ZA: 354.41,
                    ES: 1374.78,
                    LK: 48.24,
                    KN: 0.56,
                    LC: 1,
                    VC: 0.58,
                    SD: 65.93,
                    SR: 3.3,
                    SZ: 3.17,
                    SE: 444.59,
                    CH: 422.44,
                    SY: 59.63,
                    TW: 426.98,
                    TJ: 5.58,
                    TZ: 22.43,
                    TH: 312.61,
                    TL: 0.62,
                    TG: 3.07,
                    TO: 0.3,
                    TT: 21.2,
                    TN: 43.86,
                    TR: 729.05,
                    TM: 0,
                    UG: 17.12,
                    UA: 136.56,
                    AE: 239.65,
                    GB: 2258.57,
                    US: 1462.18,
                    UY: 40.71,
                    UZ: 37.72,
                    VU: 0.72,
                    VE: 285.21,
                    VN: 101.99,
                    YE: 30.02,
                    ZM: 15.69,
                    ZW: 5.57,
                },
            },
            map: "world",
        });
    }

    toggleFilter(): void {
        this.filterOn = !this.filterOn;
    }

    checkWidthAndSetFilter() {
        const width = window.innerWidth;
        this.currentWidth.set(width);

        const shouldBeOff = width < 992;

        if (this.filterOn === shouldBeOff) {
            this.filterOn = !this.filterOn;
        }
    }
}
