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
import { MatTooltipModule } from "@angular/material/tooltip";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();

interface Applications {
    id: string;
    title: string;
    license: string;
    status: string;
    term: string;
    price: string;
    logoImage: string;
}
interface Devices {
    id: string;
    title: string;
    quantity: string;
    status: string;
}

interface CardDetails {
    cardBank: string;
    cardHolder: string;
    cardNumber: string;
    cardExpMonth: string;
    cardExpYear: string;
    cardExpense: string;
    cardExpensePer: string;
    cardLimit: string;
}

interface UserProfile {
    firstName: string;
    lastName: string;
    designation: string;
    email: string;
    userId: string;
    paymentMethod: string;
    applications: Applications[];
    devices: Devices[];
    cards: CardDetails[];
}

@Component({
    selector: "app-subscription",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatMenuModule, MatTooltipModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Subscription</h3>
                        <p class="text-secondary small">Manage your subscription</p>
                    </div>

                    <div class="col-auto"></div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <!-- payment method -->
            <mat-card class="bg-theme mb-3 mb-lg-4 overflow-hidden">
                <mat-card-content>
                    <div mat-card-image class="coverimg h-100 w-100 position-absolute top-0 start-0 z-index-0 opacity-25">
                        <img src="assets/img/background1.jpg" alt="" style="display: none;" />
                    </div>

                    <div class="row gx-3 align-items-center mb-3 position-relative text-white z-index-1">
                        <div class="col-auto">
                            <mat-icon class="material-icons-outlined align-middle text-white">credit_card</mat-icon>
                        </div>
                        <div class="col">
                            <h3>Payment Method</h3>
                        </div>
                        <div class="col-auto">
                            <button matButton="elevated"><mat-icon class="material-icons-outlined">add</mat-icon> Card</button>
                        </div>
                    </div>
                    <!-- Credit cards carousel card -->
                    <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper overflow-visible z-index-1">
                        @for (card of profile().cards; track card.cardNumber) {
                        <swiper-slide class="width-240">
                            <mat-card>
                                <mat-card-content>
                                    <div class="row align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">diamond</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col text-end">
                                            <p class="small fw-bold">{{ card.cardBank }}</p>
                                        </div>
                                    </div>
                                    <h3 class="my-4 text-theme">{{ formatCardNumber(card.cardNumber) }}</h3>

                                    <div class="row gx-3 gx-lg-4">
                                        <div class="col-auto small">
                                            <p>{{ card.cardExpMonth }}/{{ card.cardExpYear | slice : -2 }}</p>
                                        </div>
                                        <div class="col text-end small">
                                            <p>{{ card.cardHolder }}</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        }
                    </swiper-container>
                </mat-card-content>
            </mat-card>
            @for (app of profile().applications; track app.id) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <h3>{{ app.title }}</h3>
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-md-6 col-lg-3">
                            <div class="text-center mb-3 mb-lg-4">
                                <figure class="avatar avatar-100 mb-3 mx-auto rounded">
                                    <img src="{{ app.logoImage }}" class="mw-100" alt="" />
                                </figure>
                                <h1 class="mb-1">{{ app.price }}</h1>
                                <h3 class="text-secondary">{{ app.term }}</h3>
                                <p class="text-secondary">
                                    <span class="badge theme-green">{{ app.status }}</span>
                                </p>
                            </div>
                        </div>
                        <div class="col-12 col-md-6 col-lg">
                            <h3 class="mb-1">Plan Features</h3>
                            <p class="text-secondary mb-4">Including features of basic plan</p>
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                                </div>
                                <div class="col-auto ps-0">Free Shipping</div>
                            </div>
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                                </div>
                                <div class="col-auto ps-0">Unlimited Send Money</div>
                            </div>
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                                </div>
                                <div class="col-auto ps-0">Multiple Currencies Support</div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                                </div>
                                <div class="col-auto ps-0">Unlimited Send Money</div>
                            </div>
                            <a matButton>More details</a>
                        </div>
                        <div class="col-12 col-md-12 col-lg-4">
                            <h3 class="mb-1">License</h3>
                            <p class="text-secondary mb-4">{{ app.license }} plan</p>

                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                <div class="col-auto">
                                    <div class="position-relative z-index-0">
                                        <figure class="avatar avatar-40 coverimg rounded-circle">
                                            <img src="assets/img/user-6.jpg" alt="" />
                                        </figure>
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-0">AdminUIUX</h4>
                                    <p class="text-secondary small">Admin</p>
                                </div>
                                <div class="col-auto"><span class="badge theme-green">Active</span></div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                <div class="col-auto">
                                    <div class="position-relative z-index-0">
                                        <figure class="avatar avatar-40 coverimg rounded-circle">
                                            <img src="assets/img/user-3.jpg" alt="" />
                                        </figure>
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-0">Jimmy McMohan</h4>
                                    <p class="text-secondary small">Designer</p>
                                </div>
                                <div class="col-auto">
                                    <span class="badge theme-green">Active</span>

                                    <button matIconButton matTooltip="Revoke Access" class="theme-red text-theme"><span class="material-symbols-outlined"> remove_moderator </span></button>
                                </div>
                            </div>

                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                <div class="col-auto">
                                    <div class="position-relative z-index-0">
                                        <figure class="avatar avatar-40 coverimg rounded-circle">
                                            <img src="assets/img/user-2.jpg" alt="" />
                                        </figure>
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-0">Sneha Palliwal</h4>
                                    <p class="text-secondary small">Marketing</p>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton matTooltip="Give Access" class="theme-green text-theme"><span class="material-symbols-outlined"> add_moderator </span></button>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton matTooltip="Delete" class="theme-red text-theme"><span class="material-symbols-outlined"> delete </span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row gx-3">
                        <div class="col">
                            <a routerLink="/app/plans" matButton="filled">Change Plan <mat-icon iconPositionEnd>arrow_forward</mat-icon></a>
                        </div>
                        <div class="col-auto">
                            <button matButton class="theme-red mx-2">Cancel Subscription</button>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SubscriptionComponent {
    profile = signal<UserProfile>({
        firstName: "Admin",
        lastName: "UIUX",
        userId: "1",
        email: "adminuiux.public@invcorp.com",
        designation: "Lead UIUX designer",
        paymentMethod: "Corporate Visa ending in 4321",
        applications: [
            {
                id: "1",
                title: "Abode Creative Loud",
                license: "5 Users",
                status: "Active",
                term: "Yearly",
                price: "$ 560.00",
                logoImage: "assets/img/category2.jpg",
            },
            {
                id: "2",
                title: "Slacknew",
                license: "Team",
                status: "Active",
                term: "Monthly",
                price: "$ 170.00",
                logoImage: "assets/img/category8.jpg",
            },
            {
                id: "3",
                title: "Bolt New App",
                license: "1 User",
                status: "Inactive",
                term: "Monthly",
                price: "$25.00",
                logoImage: "assets/img/category4.jpg",
            },
        ],
        devices: [
            {
                id: "1",
                title: "MacBook Pro M4",
                quantity: "1",
                status: "Active",
            },
        ],
        cards: [
            {
                cardBank: "Chase",
                cardHolder: "Admin UIUX",
                cardNumber: "**** **** **** 1234",
                cardExpMonth: "10",
                cardExpYear: "2027",
                cardExpense: "1520.00",
                cardExpensePer: "12%",
                cardLimit: "13580.00",
            },
            {
                cardBank: "Bank of America",
                cardHolder: "Admin UIUX",
                cardNumber: "**** **** **** 5678",
                cardExpMonth: "03",
                cardExpYear: "2025",
                cardExpense: "1524.00",
                cardExpensePer: "14%",
                cardLimit: "4582.00",
            },
            {
                cardBank: "American Express",
                cardHolder: "Admin UIUX",
                cardNumber: "**** ****** 9012",
                cardExpMonth: "07",
                cardExpYear: "2026",
                cardExpense: "1652.00",
                cardExpensePer: "11%",
                cardLimit: "5231.00",
            },
        ],
    });

    constructor() {}
    formatCardNumber(maskedNumber: string): string {
        // This assumes the masked number is formatted like "**** **** **** 1234"
        return maskedNumber.replace(/\s/g, " ");
    }
}
