import { Component } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from "@angular/router";

@Component({
    selector: "app-signup-success",
    standalone: true,
    imports: [MatCardModule, MatButtonModule, MatIconModule, RouterModule],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <div class="text-center mb-3 mb-lg-4">
                    <img src="assets/img/success-1.png" alt="" class="width-160 mx-auto" />
                    <h1 class="mb-2">Account Created Successfully!</h1>
                    <p class="opacity-75">Welcome to Saas Dashboard! Your account has been created and you can now access all features. Choose appropriate to continue...</p>
                </div>

                <div class="row gx-3 gx-lg-4 mb-3 mb-lg-4">
                    <div class="col theme-blue">
                        <mat-card class="text-center hover bg-light-theme" routerLink="/app">
                            <div mat-card-image class="coverimg height-160 w-100 start-0 top-0 ">
                                <img src="assets/img/user-9.jpg" alt="" />

                                <p class="text-center position-absolute start-0 bottom-0 mb-3 w-100">
                                    <span class="badge">Male</span>
                                </p>
                            </div>
                        </mat-card>
                    </div>
                    <div class="col theme-red">
                        <mat-card class="text-center hover bg-light-theme" routerLink="/app">
                            <div mat-card-image class="coverimg height-160 w-100 start-0 top-0 ">
                                <img src="assets/img/user-2.jpg" alt="" />

                                <p class="text-center position-absolute start-0 bottom-0 mb-3 w-100">
                                    <span class="badge">Female</span>
                                </p>
                            </div>
                        </mat-card>
                    </div>
                </div>
                <div class="text-center">
                    <button matButton="elevated" color="primary" routerLink="/auth/login" class="continue-button"><mat-icon class="material-icons-outlined">arrow_back</mat-icon>Back to Sign In</button>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class SignupSuccessComponent {}
