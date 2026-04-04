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
import { MatTabsModule } from "@angular/material/tabs";
import { MatTableModule } from "@angular/material/table";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();

interface SalaryRecord {
    id: string;
    date: Date;
    amount: number;
}

interface Experience {
    id: string;
    company: string;
    companyImage: string;
    start: string;
    end: string;
    duration: string;
    position: string;
}
interface Applications {
    id: string;
    title: string;
    license: string;
    status: string;
}
interface Devices {
    id: string;
    title: string;
    quantity: string;
    status: string;
}

interface Banks {
    bank: string;
    accountNumber: string;
    accountHolder: string;
    branch: string;
    swiftCode: string;
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
    education: string;
    degree: string;
    softSkill: string;
    techSkill: string;
    email: string;
    userId: string;
    dob: string;
    memberSince: string;
    status: string;
    hiringType: string;
    phoneNumber: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    paymentMethod: string;
    googleUrl: string;
    linkedInUrl: string;
    instaUrl: string;
    applications: Applications[];
    devices: Devices[];
    banks: Banks[];
    cards: CardDetails[];
    experiences: Experience[];
}

@Component({
    selector: "app-profile",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatTableModule, MatTabsModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Profile</h3>
                        <p class="text-secondary small">Keep your profile updated</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <button matButton="filled" routerLink="../settings"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                    </div>
                </div>
            </mat-card>
        </div>

        <!-- content -->
        <div class="container">
            <!-- alert -->
            <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-green">
                <mat-card-content>
                    <div class="row gx-3">
                        <div class="col-auto">
                            <div class="bg-theme text-white avatar avatar-40 rounded">
                                <mat-icon class="material-icons-outlined">call</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <h3 class="mb-2">Add a phone number</h3>
                            <p>Ensure you never lose access to your account and receive important account updates like billing and security alerts.</p>

                            <a routerLink="../settings" matButton="elevated">Add Phone</a>
                        </div>
                        <div class="col-auto">
                            <button type="button" matIconButton><mat-icon>close</mat-icon></button>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-4 col-xl-3">
                    <!-- profile details -->
                    <mat-card class="mb-3 mb-lg-4 overflow-hidden">
                        <div class="w-100 position-relative bg-theme">
                            <figure class="height-140 w-100 coverimg z-index-0">
                                <img src="assets/img/background1.jpg" class="mw-100" alt="" />
                            </figure>
                        </div>

                        <mat-card-content class="pb-0">
                            <div class="text-center mb-3">
                                <div class="position-relative z-index-0 mb-3 mb-lg-4" style="margin-top:-80px">
                                    <figure class="avatar avatar-140 coverimg rounded-circle mx-auto z-index-1">
                                        <img src="assets/img/user-6.jpg" alt="" />
                                    </figure>
                                </div>
                                <h2 class="mb-1">
                                    <span class="align-middle">{{ profile().firstName }} {{ profile().lastName }}</span>
                                </h2>
                                <p class="text-secondary">{{ profile().designation }}</p>
                            </div>

                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-secondary">mail</mat-icon>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Email</p>
                                    <p class="">{{ profile().email }}</p>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-secondary">call</mat-icon>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Phone</p>
                                    <p class="">{{ profile().phoneNumber }}</p>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-secondary">cake</mat-icon>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Date of Birth</p>
                                    <p class="">{{ profile().dob }}</p>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-secondary">event</mat-icon>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Duration</p>
                                    <p class="">Employee since {{ profile().memberSince }}</p>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-secondary">badge</mat-icon>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Status</p>
                                    <p class="">
                                        <span
                                            class="badge badge-light"
                                            [ngClass]="{
                                                'theme-green': profile().status === 'Active',
                                                'theme-orange': profile().status === 'Inactive',
                                                'theme-violet': profile().status === 'Leave',
                                                'theme-red': profile().status === 'Left',
                                            }">
                                            {{ profile().status | titlecase }}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <span class="material-symbols-outlined text-secondary"> nest_clock_farsight_analog </span>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Hiring</p>
                                    <p class="">{{ profile().hiringType }}</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-8 col-xl-9">
                    <mat-tab-group>
                        <mat-tab label="Personal">
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">person</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Professional</h3>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3">
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Education</p>
                                            <p class="">{{ profile().education }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Highest Degree</p>
                                            <p class="">{{ profile().degree }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Tech Skill</p>
                                            <p class="">{{ profile().techSkill }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Soft Skill</p>
                                            <p class="">{{ profile().softSkill }}</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>

                            <!-- address -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">location_on</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Home Address</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3">
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Address Line 1</p>
                                            <p class="">{{ profile().address1 }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Address Line 2</p>
                                            <p class="">{{ profile().address2 }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">City</p>
                                            <p class="">{{ profile().city }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">State</p>
                                            <p class="">{{ profile().state }} - {{ profile().zipCode }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">State</p>
                                            <p class="">{{ profile().country }}</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>

                            <!-- social -->
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">share</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Social Connect</h3>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3">
                                        <div class="col-12 col-lg-12 col-xl-6">
                                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                                <div class="col-auto">
                                                    <img src="assets/img/l-logo.png" alt="" class="avatar avatar-40 rounded" />
                                                </div>
                                                <div class="col-auto">
                                                    <p class="text-secondary small mb-1">LinkedIn company page</p>
                                                    <p>{{ profile().linkedInUrl }}</p>
                                                </div>
                                                <div class="col-auto">
                                                    <a href="{{ profile().linkedInUrl }}" matIconButton target="_blank" class="text-theme"><mat-icon>arrow_outward</mat-icon></a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-6">
                                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                                <div class="col-auto">
                                                    <img src="assets/img/i-logo.webp" alt="" class="avatar avatar-40 rounded" />
                                                </div>
                                                <div class="col-auto">
                                                    <p class="text-secondary small mb-1">Instagram profile</p>
                                                    <p>{{ profile().instaUrl }}</p>
                                                </div>
                                                <div class="col-auto">
                                                    <a href="{{ profile().instaUrl }}" matIconButton target="_blank" class="text-theme"><mat-icon>arrow_outward</mat-icon></a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-6">
                                            <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                                <div class="col-auto">
                                                    <img src="assets/img/g-logo.png" alt="" class="avatar avatar-40 rounded" />
                                                </div>
                                                <div class="col-auto">
                                                    <p class="text-secondary small mb-1">Instagram profile</p>
                                                    <p>{{ profile().googleUrl }}</p>
                                                </div>
                                                <div class="col-auto">
                                                    <a href="{{ profile().googleUrl }}" matIconButton target="_blank" class="text-theme"><mat-icon>arrow_outward</mat-icon></a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>

                            <!-- subscription -->
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content class="">
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">subscriptions</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3 class="mb-1">My Subscription</h3>
                                            <p class="text-secondary small">3/5 User Active</p>
                                        </div>
                                        <div class="col-auto">
                                            <a routerLink="/app/subscription" matIconButton>
                                                <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                                            </a>
                                        </div>
                                    </div>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded bg-light-theme text-theme">
                                                <mat-icon class="material-icons-outlined">redeem</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">MultiStore</h4>
                                            <p class="small opacity-75">Due: 26 July 2027</p>
                                        </div>
                                        <div class="col-auto text-end">
                                            <h4 class="mb-1">$20.00</h4>
                                            <p class="small opacity-75">per month</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </mat-tab>
                        <mat-tab label="Work">
                            <!-- work -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">assignment</mat-icon>
                                        </div>

                                        <div class="col">
                                            <h3>Experience</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content>
                                    <ul class="activity">
                                        @for (experience of profile().experiences; track experience.id) {
                                        <li>
                                            <div class="row gx-3">
                                                <!-- icon -->
                                                <div class="col-auto">
                                                    <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme">
                                                        <img src="{{ experience.companyImage }}" alt="{{ experience.company }}" />
                                                    </div>
                                                </div>

                                                <!-- Activity Content -->
                                                <div class="col">
                                                    <h4 class="mb-1">
                                                        {{ experience.company }}
                                                    </h4>
                                                    <p class="text-secondary mb-1">
                                                        {{ experience.position }}
                                                    </p>
                                                </div>
                                                <div class="col-auto text-end">
                                                    <p class="small mb-1">
                                                        <span>{{ experience.start }}</span> - <span>{{ experience.end }} </span>
                                                    </p>
                                                    <p class="text-secondary small">{{ experience.duration }}</p>
                                                </div>
                                            </div>
                                        </li>

                                        }
                                    </ul>
                                </mat-card-content>
                            </mat-card>
                            <!-- device -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">computer</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Devices</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    @for (device of profile().devices; track device.id) {
                                    <div class="row gx-3">
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Device #{{ device.id }}</p>
                                            <p class="">{{ device.title }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Quantity</p>
                                            <p class="">{{ device.quantity }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Status</p>
                                            <p class="">
                                                <span
                                                    class="badge badge-light"
                                                    [ngClass]="{
                                                        'theme-green': device.status === 'Active',
                                                        'theme-orange': device.status === 'Inactive', }">
                                                    {{ device.status }}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    }
                                </mat-card-content>
                            </mat-card>

                            <!-- application -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header>
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">airplay</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Applications</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    @for (application of profile().applications; track application.id) {
                                    <div class="row gx-3">
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Application #{{ application.id }}</p>
                                            <p class="">{{ application.title }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Quantity</p>
                                            <p class="">{{ application.license }}</p>
                                        </div>
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Status</p>
                                            <p class="">
                                                <span
                                                    class="badge badge-light"
                                                    [ngClass]="{
                                                        'theme-green': application.status === 'Active',
                                                        'theme-orange': application.status === 'Inactive', }">
                                                    {{ application.status }}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </mat-tab>
                        <mat-tab label="Pay">
                            <!-- bank details -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header class="mb-3 mb-lg-4">
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">account_balance</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Bank Information</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="">
                                    <div class="row gx-3">
                                        @for (bank of profile().banks; track bank.swiftCode) {
                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Bank Name</p>
                                            <p class="">{{ bank.bank }}</p>
                                        </div>

                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Account Number</p>
                                            <p class="">{{ bank.accountNumber }}</p>
                                        </div>

                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Account Holder</p>
                                            <p class="">{{ bank.accountHolder }}</p>
                                        </div>

                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Branch Name</p>
                                            <p class="">{{ bank.branch }}</p>
                                        </div>

                                        <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                                            <p class="text-secondary small mb-1">Swift Code</p>
                                            <p class="">{{ bank.swiftCode }}</p>
                                        </div>
                                        }
                                    </div>
                                </mat-card-content>
                            </mat-card>
                            <!-- salary -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-header class="mb-3 mb-lg-4">
                                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">receipt</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Salary last 10</h3>
                                        </div>
                                        <div class="col-auto"></div>
                                    </div>
                                </mat-card-header>

                                <mat-card-content class="">
                                    <table mat-table [dataSource]="dataSource()" class="w-100 responsive-table bg-none">
                                        <ng-container matColumnDef="title">
                                            <th mat-header-cell *matHeaderCellDef>Salary Title</th>
                                            <td mat-cell *matCellDef="let element">
                                                <h4>{{ getTitle(element.date) }}</h4>
                                            </td>
                                        </ng-container>

                                        <ng-container matColumnDef="date">
                                            <th mat-header-cell *matHeaderCellDef>Date Paid</th>
                                            <td mat-cell *matCellDef="let element">
                                                {{ element.date | date : "dd-MMMM-yyyy" }}
                                            </td>
                                        </ng-container>

                                        <ng-container matColumnDef="amount">
                                            <th mat-header-cell *matHeaderCellDef>Amount</th>
                                            <td mat-cell *matCellDef="let element">
                                                <p class="text-theme theme-green fw-bold">{{ element.amount | currency : "USD" : "symbol" : "1.2-2" }}</p>
                                            </td>
                                        </ng-container>

                                        <ng-container matColumnDef="actions">
                                            <th mat-header-cell *matHeaderCellDef>Actions</th>
                                            <td mat-cell *matCellDef="let element" class="text-center">
                                                <a target="_blank" matIconButton color="primary" matTooltip="Download Pay Stub PDF" class="hover:bg-indigo-100 transition duration-150">
                                                    <mat-icon>file_download</mat-icon>
                                                </a>
                                            </td>
                                        </ng-container>

                                        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                                        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

                                        <tr class="mat-row" *matNoDataRow>
                                            <td [attr.colspan]="displayedColumns.length">No salary history found for this period.</td>
                                        </tr>
                                    </table>
                                </mat-card-content>
                            </mat-card>

                            <!-- payment method -->
                            <mat-card class="mb-3 mb-lg-4 mt-3">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center mb-3">
                                        <div class="col-auto">
                                            <mat-icon class="material-icons-outlined align-middle text-theme">credit_card</mat-icon>
                                        </div>
                                        <div class="col">
                                            <h3>Payment Method</h3>
                                        </div>
                                    </div>
                                    <!-- Credit cards carousel card -->
                                    <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper mb-2 overflow-visible">
                                        @for (card of profile().cards; track card.cardNumber) {
                                        <swiper-slide class="width-240">
                                            <mat-card class="mb-3" appearance="outlined">
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
                                            <div class="row amount-data">
                                                <div class="col">
                                                    <p class="opacity-50 small mb-1">Expense</p>
                                                    <p>
                                                        {{ card.cardExpense }} <small class="text-green">{{ card.cardExpensePer }}</small>
                                                    </p>
                                                </div>
                                                <div class="col">
                                                    <p class="opacity-50 small mb-1">Limit Remain</p>
                                                    <p>{{ card.cardLimit }}</p>
                                                </div>
                                            </div>
                                        </swiper-slide>
                                        }
                                    </swiper-container>
                                </mat-card-content>
                            </mat-card>
                        </mat-tab>
                    </mat-tab-group>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfileComponent {
    profile = signal<UserProfile>({
        firstName: "Admin",
        lastName: "UIUX",
        email: "adminuiux.public@invcorp.com",
        designation: "Lead UIUX designer",
        education: "Higher School Study",
        degree: "B. Tech. in Information Technology",
        softSkill: "English Language",
        techSkill: "Python",
        userId: "INV-12345",
        dob: "05/15/1988",
        memberSince: "2021",
        status: "Active",
        hiringType: "Full Time",
        phoneNumber: "(555) 123-4567",
        address1: "143 Material Way",
        address2: "Suite 200",
        city: "San Francisco",
        state: "CA",
        zipCode: "94107",
        country: "US",
        paymentMethod: "Corporate Visa ending in 4321",
        linkedInUrl: "https://linkedin.com/company/adminuiux",
        instaUrl: "https://www.instagram.com/adminuiux",
        googleUrl: "https://www.instagram.com/adminuiux",
        applications: [
            {
                id: "1",
                title: "Adobe Creative Cloud",
                license: "Team",
                status: "Active",
            },
            {
                id: "2",
                title: "Slack",
                license: "Team",
                status: "Active",
            },
            {
                id: "3",
                title: "Bolt.io",
                license: "1 User",
                status: "Inactive",
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
        banks: [
            {
                bank: "Adminuiux Bank of Earth",
                accountNumber: "00-001-007-1431548631243",
                accountHolder: "AdminUIUX",
                branch: "Earth",
                swiftCode: "1159201",
            },
        ],
        experiences: [
            {
                id: "1",
                company: "InstaModule",
                companyImage: "assets/img/document3.jpg",
                start: "08/2021",
                end: "12/2023",
                duration: "2 year 4 months",
                position: "Jr. Developer",
            },
            {
                id: "2",
                company: "EnergeticInfo",
                companyImage: "assets/img/document2.jpg",
                start: "1/2024",
                end: "11/2025",
                duration: "11 months",
                position: "Sr. Developer",
            },
            {
                id: "3",
                company: "TregicMegicGo",
                companyImage: "assets/img/document1.jpg",
                start: "12/2025",
                end: "*",
                duration: "Working now",
                position: "Team Lead",
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

    displayedColumns: string[] = ["title", "date", "amount", "actions"];
    dataSource = signal<SalaryRecord[]>(this.createMockData());

    constructor() {}

    private createMockData(): SalaryRecord[] {
        const data: SalaryRecord[] = [];
        const baseAmount = 6500.0;
        const now = new Date();

        for (let i = 0; i < 10; i++) {
            // Calculate the date for the payment (e.g., last day of the previous month)
            const date = new Date(now.getFullYear(), now.getMonth() - i, 28);

            const amount = baseAmount + (Math.random() * 500 - 250);

            data.push({
                date: date,
                amount: parseFloat(amount.toFixed(2)),
                id: `paystub-${date.getFullYear()}-${date.getMonth() + 1}`,
            });
        }

        // Reverse the data so the most recent payment is at the top
        return data.reverse();
    }

    getTitle(date: Date): string {
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        return `Salary for ${month} ${year}`;
    }

    formatCardNumber(maskedNumber: string): string {
        // This assumes the masked number is formatted like "**** **** **** 1234"
        return maskedNumber.replace(/\s/g, " ");
    }
}
