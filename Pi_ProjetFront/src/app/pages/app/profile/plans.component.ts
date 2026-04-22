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

@Component({
    selector: "app-plans",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatButtonToggleModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Subscription Plans</h3>
                        <p class="text-secondary small">Keep your subscription updated</p>
                    </div>

                    <div class="col-auto ms-auto mb-3 mb-xl-0">
                        <button routerLink="/app/subscription" matButton="filled"><mat-icon class="material-icons-outlined">workspace_premium</mat-icon> My Plan</button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4 justify-content-center">
                <div class="col mb-3 mb-lg-4">
                    <h2 class="mb-2">Take your saving to next level by upgrading plans</h2>
                    <p class="text-secondary">Take a look at features and upgrade your current plan with us</p>
                </div>
                <div class="col-auto mb-3 mb-lg-4">
                    <mat-button-toggle-group name="plans" [hideSingleSelectionIndicator]="hideSingleSelectionIndicator()">
                        <mat-button-toggle value="monthly" checked>Monthly</mat-button-toggle>
                        <mat-button-toggle value="yearly">Yearly <span class="badge ms-2">Save 20%</span></mat-button-toggle>
                    </mat-button-toggle-group>
                </div>
            </div>
            <div class="row gx-3 gx-lg-4 align-items-center">
                <div class="col-12 col-md-6 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4 bg-light-gradient theme-orange">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 rounded bg-theme text-white">
                                        <mat-icon>person</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h3 class="mb-1">Personal</h3>
                                    <p class="opacity-75">Perfect for the individuals</p>
                                </div>
                            </div>

                            <h1 class="mb-1">$ 50</h1>
                            <p class="opacity-75 mb-3 mb-lg-4">Per license</p>

                            <h4 class="mb-2">Basic includes:</h4>
                            <mat-list style="--mat-list-list-item-one-line-container-height:40px">
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> All demo access</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Unlimited Download</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> No Contact list</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> 5 transactions per day</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> 24/7 Customer Support</mat-list-item>
                            </mat-list>
                        </mat-card-content>
                        <mat-card-actions class="justify-content-center py-4">
                            <div class="text-center">
                                <p class="text-center mb-2"><span class="opacity-75">Your next due date is:</span> 22-June-2026</p>
                                <span class="badge theme-green">Active</span>
                            </div>
                        </mat-card-actions>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-4">
                    <mat-card class="bg-theme mb-3 mb-lg-4 theme-green">
                        <mat-card-content class="px-1 pb-1">
                            <h4 class="text-center text-white mb-3">Recommended</h4>
                            <mat-card class="shadow-none">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center mb-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 rounded bg-theme text-white">
                                                <mat-icon>group</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">Business</h3>
                                            <p class="opacity-75">Multiple team &amp; customer</p>
                                        </div>
                                    </div>

                                    <h1 class="mb-1">$ 100</h1>
                                    <p class="opacity-75 mb-3 mb-lg-4">Per license</p>

                                    <h4 class="mb-2">Basic includes:</h4>
                                    <mat-list style="--mat-list-list-item-one-line-container-height:40px">
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> All demo access</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Unlimited Download</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> No Contact list</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> 15 transactions per day</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Multiple User</mat-list-item>
                                        <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> 24/7 Customer Support</mat-list-item>
                                    </mat-list>
                                </mat-card-content>
                                <mat-card-actions class="justify-content-center p-3">
                                    <button matButton="filled" class="w-100">Buy Now</button>
                                </mat-card-actions>
                            </mat-card>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-4">
                    <mat-card class="bg-light-gradient mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 rounded bg-theme text-white">
                                        <mat-icon>apartment</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h3 class="mb-1">Ultra Pro</h3>
                                    <p class="opacity-75">Multiple Application</p>
                                </div>
                            </div>

                            <h1 class="mb-1">On Request</h1>
                            <p class="opacity-75 mb-3 mb-lg-4">Share your customization details</p>

                            <h4 class="mb-2">Basic includes:</h4>
                            <mat-list style="--mat-list-list-item-one-line-container-height:40px">
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> All from Business plan</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> 50 transactions per day</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Multiple user</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Merchant Account</mat-list-item>
                                <mat-list-item><mat-icon class="material-icons-outlined me-2 align-middle">check_circle</mat-icon> Customization as per request</mat-list-item>
                            </mat-list>
                        </mat-card-content>
                        <mat-card-actions class="justify-content-center p-3">
                            <button routerLink="/app/contact-us" matButton="filled" class="w-100">Contact Us</button>
                        </mat-card-actions>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PlansComponent {
    value = "";

    constructor() {}

    // button group
    hideSingleSelectionIndicator = signal(false);
    toggleSingleSelectionIndicator() {
        this.hideSingleSelectionIndicator.update((value) => !value);
    }
}
