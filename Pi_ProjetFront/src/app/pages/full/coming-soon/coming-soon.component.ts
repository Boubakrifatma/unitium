import { Component, OnDestroy } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Location } from "@angular/common";

@Component({
    selector: "app-coming-soon",
    standalone: true,
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, ReactiveFormsModule],
    template: `
        <div class="row gx-3 gx-lg-4 h-100 align-items-center justify-content-center">
            <div class="col-12 mb-auto"></div>
            <div class="col-12 col-sm-10 col-lg-8 col-xl-6">
                <div class="mb-3 mb-lg-4 text-center">
                    <img src="assets/img/logo-512.png" alt="" class="avatar avatar-60 mx-auto mb-3" />
                    <h2 class="mb-1">SaaS Dashboard</h2>
                    <p class="text-secondary small mb-4 mb-lg-5">Template by AdminUIUX</p>

                    <h1 class="mb-2 text-theme">We're still making our website</h1>
                    <h3 class="text-secondary fw-normal">We are at the edge of our final release</h3>
                </div>
                <!-- subscription -->
                <form [formGroup]="notifyForm" (ngSubmit)="onNotify()" class="w-100 mx-auto maxwidth-dynamic" style="--mw-dynamic:380px;">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Email Address</mat-label>
                        <input matInput formControlName="email" type="email" placeholder="your@email.com" />
                        <mat-icon matPrefix>email</mat-icon>
                        <button matSuffix matButton="filled" color="primary" type="submit" [disabled]="notifyForm.invalid" class="me-2">Notify</button>
                    </mat-form-field>
                </form>

                <div class="text-center mb-3 mb-lg-4">
                    <button matButton (click)="goBack()">
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                        Home
                    </button>
                </div>
            </div>
            <div class="col-12 mt-auto">
                @if (!countdownFinished) {
                <p class="text-center mb-3 mb-lg-4">We'll be going live in...</p>
                <div class="row gx-3 gx-lg-4 align-items-center justify-content-center text-center mb-3 mb-lg-4">
                    <div class="col col-md-auto">
                        <h2 id="days" class="fw-bold mb-1 h1">{{ days }}</h2>
                        <small class="opacity-50">Days</small>
                    </div>
                    <div class="col col-md-auto">
                        <h2 id="hrs" class="fw-bold mb-1 h1">{{ hours }}</h2>
                        <small class="opacity-50">Hours</small>
                    </div>
                    <div class="col col-md-auto">
                        <h2 id="min" class="fw-bold mb-1 h1">{{ minutes }}</h2>
                        <small class="opacity-50">Min</small>
                    </div>
                    <div class="col col-md-auto">
                        <h2 id="sec" class="fw-bold mb-1 h1">{{ seconds }}</h2>
                        <small class="opacity-50">Sec</small>
                    </div>
                </div>
                } @if (countdownFinished) {
                <p id="endtimer" class="mt-lg-4">{{ finishedMessage }}</p>
                }
            </div>
        </div>
    `,
    styles: [``],
})
export class ComingSoonComponent {
    notifyForm: FormGroup;

    days: number = 0;
    hours: number = 0;
    minutes: number = 0;
    seconds: number = 0;
    countdownFinished: boolean = false;
    finishedMessage: string = "Our website is live.";
    private intervalId: any;
    private countDownDate: number;

    constructor(private fb: FormBuilder, private router: Router, private location: Location) {
        this.notifyForm = this.fb.group({
            email: ["", [Validators.required, Validators.email]],
        });

        this.countDownDate = new Date("October 7, 2026 18:32:25").getTime();
    }
    ngOnInit() {
        this.intervalId = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    private updateCountdown() {
        const now = new Date().getTime();
        const distance = this.countDownDate - now;

        if (distance < 0) {
            clearInterval(this.intervalId);
            this.countdownFinished = true;
        } else {
            this.days = Math.floor(distance / (1000 * 60 * 60 * 24));
            this.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            this.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            this.seconds = Math.floor((distance % (1000 * 60)) / 1000);
        }
    }

    onNotify() {
        if (this.notifyForm.valid) {
            // Handle email notification signup
            console.log("Notification signup:", this.notifyForm.value.email);
        }
    }

    goBack() {
        this.router.navigate(["/app"]);
    }
}
