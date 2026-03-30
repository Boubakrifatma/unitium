import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MatDivider, MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCardModule } from "@angular/material/card";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatTabsModule } from "@angular/material/tabs";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatDividerModule } from "@angular/material/divider";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
import { RouterLink } from "@angular/router";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatProgressBarModule } from "@angular/material/progress-bar";
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
    selector: "app-settings",
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, MatListModule, MatProgressBarModule, MatExpansionModule, MatTabsModule, MatDividerModule, MatDatepickerModule, MatButtonToggleModule, MatMenuModule, MatSelectModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    providers: [provideNativeDateAdapter()],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Settings</h3>
                        <p class="text-secondary small">Keep your profile updated</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <button routerLink="/app/profile" matButton="filled"><mat-icon class="material-icons-outlined">save</mat-icon> Update</button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <mat-card class="mb-3 mb-lg-4">
                <figure mat-card-image class="coverimg height-160 w-100 z-index-0 overflow-hidden">
                    <div class="position-absolute top-0 end-0 z-index-1 m-3">
                        <button matButton="filled" onclick="this.nextElementSibling.click()"><mat-icon class="material-icons-outlined">photo_camera</mat-icon> Change Cover</button>
                        <input type="file" class="d-none" />
                    </div>
                    <img src="assets/img/background1.jpg" class="mw-100" alt="" />
                </figure>
                <mat-card-content>
                    <div class="row gx-3 gx-lg-4 justify-content-center position-relative z-index-1">
                        <div class="col-12 col-sm-auto position-relative pt-3 text-center">
                            <div class="width-160 position-relative d-block mx-auto mb-3" style="margin-top:-100px">
                                <div class="position-absolute bottom-0 end-0 z-index-1">
                                    <button matMiniFab onclick="this.nextElementSibling.click()"><mat-icon class="material-icons-outlined">photo_camera</mat-icon></button>
                                    <input type="file" class="d-none" />
                                </div>
                                <figure class="avatar avatar-160 coverimg rounded-circle shadow-md border-3 border-light position-relative">
                                    <img src="assets/img/user-6.jpg" alt="" />
                                </figure>
                            </div>
                        </div>
                        <div class="col pt-3">
                            <h2 class="mb-1">
                                <span class="align-middle">{{ profile().firstName }} {{ profile().lastName }}</span>
                            </h2>
                            <p class="opacity-75">{{ profile().designation }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            <form [formGroup]="profileForm">
                <mat-accordion class="mb-3 mb-lg-4 d-block">
                    <!-- Personal & Contact Information -->
                    <mat-expansion-panel expanded class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center my-3">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-theme">account_circle</mat-icon>
                                </div>
                                <div class="col">
                                    <h3>Personal</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>

                        <div class="row gx-3 gx-lg-4 mt-3 mt-lg-4">
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>First Name</mat-label>
                                    <input matInput formControlName="firstName" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Last Name</mat-label>
                                    <input matInput formControlName="lastName" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Designation</mat-label>
                                    <input matInput formControlName="designation" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Date of Birth</mat-label>
                                    <input matInput [matDatepicker]="picker" formControlName="dob" />
                                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                                    <mat-datepicker #picker></mat-datepicker>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Email Address</mat-label>
                                    <input matInput type="email" formControlName="email" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Phone Number</mat-label>
                                    <input matInput formControlName="phoneNumber" />
                                </mat-form-field>
                            </div>
                        </div>
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3 mb-lg-4">
                                <h4>Address</h4>
                            </div>
                            <div class="col-auto mb-3 mb-lg-4">
                                <button matButton color="primary" (click)="addBank()"><mat-icon>add</mat-icon> Bank Account</button>
                            </div>
                        </div>
                        <div class="row gx-3 gx-lg-4">
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Address Line 1</mat-label>
                                    <input matInput formControlName="address1" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Address Line 2</mat-label>
                                    <input matInput formControlName="address2" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>City</mat-label>
                                    <input matInput formControlName="city" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>State / Province</mat-label>
                                    <input matInput formControlName="state" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>ZIP Code</mat-label>
                                    <input matInput formControlName="zipCode" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Country</mat-label>
                                    <input matInput formControlName="country" />
                                </mat-form-field>
                            </div>
                        </div>
                    </mat-expansion-panel>

                    <!-- Professional Details & Skills -->
                    <mat-expansion-panel class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <span class="material-symbols-outlined text-theme"> badge </span>
                                </div>
                                <div class="col">
                                    <h3>Professional & Skills</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>

                        <div class="row gx-3 gx-lg-4 mt-3 mt-lg-4">
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Hiring Type</mat-label>
                                    <input matInput [value]="profile().hiringType" disabled />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Member Since</mat-label>
                                    <input matInput [value]="profile().memberSince" disabled />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Education</mat-label>
                                    <input matInput formControlName="education" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Degree / Major</mat-label>
                                    <input matInput formControlName="degree" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Technical Skills (Comma Separated)</mat-label>
                                    <textarea matInput rows="2" formControlName="techSkill"></textarea>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Soft Skills (Comma Separated)</mat-label>
                                    <textarea matInput rows="2" formControlName="softSkill"></textarea>
                                </mat-form-field>
                            </div>
                        </div>
                    </mat-expansion-panel>

                    <!-- Work Experience -->
                    <mat-expansion-panel class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-theme">history_toggle_off</mat-icon>
                                </div>
                                <div class="col">
                                    <h3>Work Experience</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>
                        <ul class="activity">
                            @for (exp of profile().experiences; track exp.id) {
                            <li>
                                <div class="row gx-3">
                                    <!-- icon -->
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme">
                                            <img src="{{ exp.companyImage }}" alt="{{ exp.company }}" />
                                        </div>
                                    </div>

                                    <!-- Activity Content -->
                                    <div class="col">
                                        <h4 class="mb-0">
                                            {{ exp.company }}
                                        </h4>
                                        <p class="text-secondary">
                                            {{ exp.position }}
                                        </p>
                                    </div>
                                    <div class="col-auto text-end">
                                        <p class="small mb-0">
                                            <span>{{ exp.start }}</span> - <span>{{ exp.end }} </span>
                                        </p>
                                        <p class="text-secondary small">{{ exp.duration }}</p>
                                    </div>
                                    <div class="col-auto">
                                        <button matIconButton color="accent"><mat-icon>edit</mat-icon></button>
                                        <button matIconButton color="warn" (click)="deleteNestedItem('experiences', exp.id, 'id')"><mat-icon>delete</mat-icon></button>
                                    </div>
                                </div>
                            </li>

                            }
                        </ul>

                        <!-- add experience -->
                        <div class="row gx-3 gx-lg-4 align-items-center mt-3 mt-lg-4">
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Company</mat-label>
                                    <input matInput />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Job Title</mat-label>
                                    <input matInput />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xl">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Start Date</mat-label>
                                    <input matInput [matDatepicker]="picker2" />
                                    <mat-datepicker-toggle matIconSuffix [for]="picker2"></mat-datepicker-toggle>
                                    <mat-datepicker #picker2></mat-datepicker>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 col-xl">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>End Date</mat-label>
                                    <input matInput [matDatepicker]="picker3" />
                                    <mat-datepicker-toggle matIconSuffix [for]="picker3"></mat-datepicker-toggle>
                                    <mat-datepicker #picker3></mat-datepicker>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-auto">
                                <button matButton color="primary" class="mb-3">
                                    <mat-icon>add</mat-icon>
                                    Experience
                                </button>
                            </div>
                        </div>
                    </mat-expansion-panel>

                    <!-- Financial Details -->
                    <mat-expansion-panel class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <mat-icon class="material-icons-outlined align-middle text-theme">account_balance</mat-icon>
                                </div>
                                <div class="col">
                                    <h3>Financial & Payment</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>

                        <div class="row gx-3 align-items-center mt-3">
                            <div class="col mb-3">
                                <h4>Bank Accounts</h4>
                            </div>
                            <div class="col-auto mb-3">
                                <button matButton color="primary" (click)="addBank()"><mat-icon>add</mat-icon> Bank Account</button>
                            </div>
                        </div>

                        @if (addbanks()) {
                        <mat-card class="bg-light-theme mb-3 mb-lg-4">
                            <mat-card-content>
                                <h3 class="mb-3 mb-lg-4">Add New Bank</h3>
                                <div class="row gx-3">
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Bank Name</mat-label>
                                            <input matInput placeholder="Bank Name" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Account Holder Name</mat-label>
                                            <input matInput placeholder="Account Holder Name" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Account Number</mat-label>
                                            <input matInput placeholder="Account Number" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Branch</mat-label>
                                            <input matInput placeholder="Branch" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Swift Code</mat-label>
                                            <input matInput placeholder="Swift Code" value="123" />
                                        </mat-form-field>
                                    </div>
                                </div>
                                <div class="row gx-0">
                                    <div class="col">
                                        <button matButton="filled"><mat-icon class="material-icons-outlined">save</mat-icon> Save</button>
                                    </div>
                                    <div class="col-auto">
                                        <button matButton class="theme-red" (click)="addBank()">Cancel</button>
                                    </div>
                                </div>
                            </mat-card-content>
                        </mat-card>
                        } @for (bank of profile().banks; track bank.swiftCode) {

                        <div class="row gx-3">
                            <div class="col-12 col-lg-6 col-xl-3 mb-3 mb-lg-4">
                                <p class="text-secondary small mb-1">Bank Name</p>
                                <p class="">{{ bank.bank }}</p>
                            </div>

                            <div class="col-12 col-lg-6 col-xl-3 mb-3 mb-lg-4">
                                <p class="text-secondary small mb-1">Account Number</p>
                                <p class="">{{ bank.accountNumber }}</p>
                            </div>

                            <div class="col-12 col-md-6 col-xl mb-3 mb-lg-4">
                                <p class="text-secondary small mb-1">Account Holder</p>
                                <p class="">{{ bank.accountHolder }}</p>
                            </div>

                            <div class="col-12 col-md-6 col-xl mb-3 mb-lg-4">
                                <p class="text-secondary small mb-1">Branch Name</p>
                                <p class="">{{ bank.branch }}</p>
                            </div>

                            <div class="col-12 col-md-6 col-xl mb-3 mb-lg-4">
                                <p class="text-secondary small mb-1">Swift Code</p>
                                <p class="">{{ bank.swiftCode }}</p>
                            </div>
                            <div class="col-auto">
                                <button matIconButton color="accent"><mat-icon>edit</mat-icon></button>
                                <button matIconButton color="warn"><mat-icon>delete</mat-icon></button>
                            </div>
                        </div>
                        }

                        <!-- Credit cards and carousel card -->
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3">
                                <h4>My Cards</h4>
                            </div>
                            <div class="col-auto mb-3">
                                <button matButton color="primary" (click)="addcard()"><mat-icon>add</mat-icon> Card</button>
                            </div>
                        </div>
                        @if (addcards()) {
                        <mat-card class="bg-light-theme mb-3 mb-lg-4">
                            <mat-card-content>
                                <h3 class="mb-3 mb-lg-4">Add New Card</h3>
                                <div class="row gx-3">
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Card Number</mat-label>
                                            <input matInput placeholder="Card Number" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Card Holder Name</mat-label>
                                            <input matInput placeholder="Card Holder Name" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Expiry Month</mat-label>
                                            <input matInput placeholder="Expiry Month" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Expiry Year</mat-label>
                                            <input matInput placeholder="Expiry Year" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>CVV</mat-label>
                                            <input matInput placeholder="CVV" value="123" />
                                        </mat-form-field>
                                    </div>
                                </div>
                                <div class="row gx-0">
                                    <div class="col">
                                        <button matButton="filled"><mat-icon class="material-icons-outlined">save</mat-icon> Save</button>
                                    </div>
                                    <div class="col-auto">
                                        <button matButton class="theme-red" (click)="addcard()">Cancel</button>
                                    </div>
                                </div>
                            </mat-card-content>
                        </mat-card>
                        }

                        <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper swipernav overflow-visible mb-3 mb-lg-4">
                            @for (card of profile().cards; track card.cardNumber){
                            <swiper-slide class="width-260">
                                <mat-card appearance="outlined">
                                    <mat-card-content>
                                        <div class="row align-items-center">
                                            <div class="col-auto">
                                                <div class="avatar avatar-30 rounded bg-theme text-white">
                                                    <mat-icon class="material-icons-outlined">diamond</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col text-end">
                                                <p>{{ card.cardBank }}</p>
                                            </div>
                                        </div>
                                        <h3 class="mt-3 mb-0 text-theme">{{ card.cardNumber }}</h3>
                                        <p class="small ">Limit: {{ card.cardLimit }}</p>
                                        <div class="row gx-3 gx-lg-4">
                                            <div class="col">
                                                <button matIconButton color="accent"><mat-icon>edit</mat-icon></button>
                                            </div>
                                            <div class="col-auto text-end">
                                                <button matIconButton color="warn" (click)="deleteNestedItem('cards', card.cardNumber, 'cardNumber')"><mat-icon>delete</mat-icon></button>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </swiper-slide>
                            }
                        </swiper-container>

                        <!-- paypal id -->
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3 mb-lg-4">
                                <h4>PayPal ID</h4>
                            </div>
                        </div>

                        <mat-form-field appearance="outline" class=" w-100">
                            <mat-label>PayPal</mat-label>
                            <input matInput formControlName="paymentMethod" />
                        </mat-form-field>
                    </mat-expansion-panel>

                    <!-- Assets and Subscriptions -->
                    <mat-expansion-panel class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <span class="material-symbols-outlined text-theme"> devices </span>
                                </div>
                                <div class="col">
                                    <h3>Devices & Applications</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>

                        <div class="row gx-3 gx-lg-4 align-items-center mt-3">
                            <div class="col mb-3">
                                <h4>Applications</h4>
                            </div>
                            <div class="col-auto mb-3">
                                <button matButton color="primary"><mat-icon>add</mat-icon> Application</button>
                            </div>
                        </div>

                        @for (application of profile().applications; track application.id) {
                        <div class="row gx-3">
                            <div class="col-12 col-lg-12 col-xl-4 mb-3">
                                <p class="text-secondary small mb-1">Application #{{ application.id }}</p>
                                <p class="">{{ application.title }}</p>
                            </div>
                            <div class="col-12 col-lg-12 col-xl-4 mb-3">
                                <p class="text-secondary small mb-1">Quantity</p>
                                <p class="">{{ application.license }}</p>
                            </div>
                            <div class="col-12 col-lg-12 col-xl mb-3">
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
                            <div class="col-auto mb-3">
                                <button matIconButton (click)="deleteNestedItem('applications', application.id, 'id')"><mat-icon>delete</mat-icon></button>
                                <button matIconButton><mat-icon>edit</mat-icon></button>
                            </div>
                        </div>
                        }

                        <div class="row gx-3 gx-lg-4 align-items-center mt-3">
                            <div class="col mb-3">
                                <h4>Devices</h4>
                            </div>
                            <div class="col-auto mb-3">
                                <button matButton color="primary"><mat-icon>add</mat-icon> Device</button>
                            </div>
                        </div>

                        @for (device of profile().devices; track device.id) {
                        <div class="row gx-3">
                            <div class="col-12 col-lg-12 col-xl-4 mb-3">
                                <p class="text-secondary small mb-1">Device #{{ device.id }}</p>
                                <p class="">{{ device.title }}</p>
                            </div>
                            <div class="col-12 col-lg-12 col-xl-4 mb-3">
                                <p class="text-secondary small mb-1">Quantity</p>
                                <p class="">{{ device.quantity }}</p>
                            </div>
                            <div class="col-12 col-lg-12 col-xl mb-3">
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
                            <div class="col-auto mb-3">
                                <button matIconButton (click)="deleteNestedItem('devices', device.id, 'id')"><mat-icon>delete</mat-icon></button>
                                <button matIconButton><mat-icon>edit</mat-icon></button>
                            </div>
                        </div>
                        }
                    </mat-expansion-panel>

                    <!-- Social Media Links -->
                    <mat-expansion-panel class="mat-elevation-z2 section-panel">
                        <mat-expansion-panel-header>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <span class="material-symbols-outlined text-theme"> share </span>
                                </div>
                                <div class="col">
                                    <h3>Social & Online Presence</h3>
                                </div>
                            </div>
                        </mat-expansion-panel-header>

                        <div class="row gx-3 gx-lg-4 mt-3">
                            <div class="col-12 col-md-6 col-lg-4 ">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>LinkedIn URL</mat-label>
                                    <input matInput formControlName="linkedInUrl" />
                                    <mat-icon matPrefix>linkedin</mat-icon>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 ">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Google URL (Personal Site/Blog)</mat-label>
                                    <input matInput formControlName="googleUrl" />
                                    <mat-icon matPrefix>link</mat-icon>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 ">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Instagram URL</mat-label>
                                    <input matInput formControlName="instaUrl" />
                                    <mat-icon matPrefix>photo_camera</mat-icon>
                                </mat-form-field>
                            </div>
                        </div>
                    </mat-expansion-panel>
                </mat-accordion>
            </form>

            <!-- save button -->
            <div class="mb-3">
                <button matButton="filled" [disabled]="isSaving()" (click)="handleSave()">
                    <div>
                        @if (isSaving()) {
                        <mat-icon class="align-middle me-1">hourglass_empty</mat-icon>
                        Saving... } @else {
                        <mat-icon class="align-middle me-1">save</mat-icon>
                        Update }
                    </div>
                </button>
            </div>
            @if (isSaving()) { <mat-progress-bar mode="indeterminate" class="w-100 mb-3"></mat-progress-bar>}
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SettingsComponent implements OnInit, OnDestroy {
    value = "";

    addcards = signal(false);
    addbanks = signal(false);

    isSaving = signal(false);

    profileForm: FormGroup;
    private saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private destroy$ = new Subject<void>();

    profileDetails = signal<UserProfile>({
        firstName: "Admin",
        lastName: "UIUX",
        email: "adminuiux.public@invcorp.com",
        designation: "Lead UIUX designer",
        education: "Higher School Study",
        degree: "B. Tech. in Information Technology",
        softSkill: "English Language",
        techSkill: "Python",
        userId: "INV-12345",
        dob: "05/09/1988",
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
        paymentMethod: "testadminuiux@testmail.com",
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

    profile = signal<UserProfile>(this.profileDetails());

    constructor(private fb: FormBuilder) {
        const profile = this.profileDetails();
        this.profileForm = this.fb.group({
            firstName: [profile.firstName, Validators.required],
            lastName: [profile.lastName, Validators.required],
            designation: [profile.designation],
            dob: [profile.dob],
            email: [profile.email, [Validators.required, Validators.email]],
            phoneNumber: [profile.phoneNumber],
            address1: [profile.address1],
            address2: [profile.address2],
            city: [profile.city],
            state: [profile.state],
            zipCode: [profile.zipCode],
            country: [profile.country],
            education: [profile.education],
            degree: [profile.degree],
            techSkill: [profile.techSkill],
            softSkill: [profile.softSkill],
            paymentMethod: [profile.paymentMethod],
            linkedInUrl: [profile.linkedInUrl],
            googleUrl: [profile.googleUrl],
            instaUrl: [profile.instaUrl],
        });
    }

    ngOnInit(): void {
        // Subscribe to form value changes and update profile signal
        this.profileForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((formValue) => {
            this.profile.update((current) => ({
                ...current,
                ...formValue,
            }));
        });
    }

    deleteNestedItem(collectionKey: keyof UserProfile, itemId: string, idKey: string): void {
        this.profile.update((currentProfile) => {
            const updatedCollection = (currentProfile[collectionKey] as any[]).filter((item) => item[idKey] !== itemId);
            return {
                ...currentProfile,
                [collectionKey]: updatedCollection,
            } as UserProfile;
        });
        console.log(`Deleted item from ${collectionKey}: ${itemId}`);
    }

    handleSave(): void {
        this.isSaving.set(true);
        console.log("Saving Profile Data:", this.profile());
        // Clear any pending timeout
        if (this.saveTimeoutId !== null) {
            clearTimeout(this.saveTimeoutId);
        }
        this.saveTimeoutId = setTimeout(() => {
            this.isSaving.set(false);
            // In a real application, you would use a MatDialog for messages, not alert().
            console.log("Profile saved successfully!");
            this.saveTimeoutId = null;
        }, 1500);
    }

    ngOnDestroy(): void {
        if (this.saveTimeoutId !== null) {
            clearTimeout(this.saveTimeoutId);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    // add card
    addcard() {
        this.addcards.set(!this.addcards());
    }
    // add bank
    addBank() {
        this.addbanks.set(!this.addbanks());
    }
}
