import { Component } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";

@Component({
    selector: "app-page-not-found",
    standalone: true,
    imports: [MatCardModule, MatButtonModule, MatIconModule],
    template: `
        <div class="coverimg h-100 w-100 position-absolute">
            <img src="assets/img/404.jpg" alt="" />
        </div>
        <div class="row gx-3 gx-lg-4 h-100">
            <div class="col-12 mb-4"></div>
            <div class="col-12 col-lg-10 col-xl-8 mx-auto text-white">
                <div class="text-center z-index-1 position-relative">
                    <div style="font-size:60px;" class="fw-bold text-white mb-4">We are missing something</div>
                    <h2 class="mb-3 mb-lg-4">Page you are looking for <br />is doesn't exist or has been moved.</h2>
                </div>
            </div>
            <div class="col-12 mt-auto">
                <div class="action-buttons text-center mb-3 mb-lg-4">
                    <button matButton="elevated" color="primary" (click)="goHome()" class="mx-1">
                        <mat-icon class="material-icons-outlined">home</mat-icon>
                        Go Home
                    </button>
                    <button matButton="filled" (click)="goBack()" class=" mx-1">
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class PageNotFoundComponent {
    constructor(private router: Router) {}

    goHome() {
        this.router.navigate(["/auth/login"]);
    }

    goBack() {
        window.history.back();
    }
}
