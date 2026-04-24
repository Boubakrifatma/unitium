import { Component, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatGridListModule } from "@angular/material/grid-list";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { NgIf } from "@angular/common";

@Component({
    selector: "app-landing",
    standalone: true,
    imports: [MatCardModule, MatInputModule, MatCheckboxModule, MatGridListModule, MatButtonModule, MatIconModule, MatFormFieldModule, ReactiveFormsModule, RouterModule],
    template: `
        <div class="row gx-3 justify-content-center align-items-center" style="min-height: var(--min-height)">
            <div class="col maxwidth-dynamic position-relative" style="--mw-dynamic:440px">
                <h1 class="mb-1">Start SaaS journey</h1>
                <p class="text-secondary">Login or create account based on your role and allocation.</p>
                <br />
                <mat-card class="bg-light-gradient mb-3" routerLink="/auth/login">
                    <mat-card-content>
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto">
                                <div class="avatar avatar-40 text-theme rounded">
                                    <mat-icon class="material-icons-outlined">person</mat-icon>
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-1">Are you an employee?</h4>
                                <p class="text-secondary small">Proceed to make a significant progress</p>
                            </div>
                            <div class="col-auto">
                                <mat-icon class="material-icons-outlined align-middle">chevron_right</mat-icon>
                            </div>
                        </div>
                    </mat-card-content>
                </mat-card>
                <mat-card class="bg-light-gradient mb-3" routerLink="/auth/login">
                    <mat-card-content>
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto">
                                <div class="avatar avatar-40 text-theme rounded">
                                    <mat-icon class="material-icons-outlined">manage_accounts</mat-icon>
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-1">Are you an admin?</h4>
                                <p class="text-secondary small">Proceed to manage customer base</p>
                            </div>
                            <div class="col-auto">
                                <mat-icon class="material-icons-outlined align-middle">chevron_right</mat-icon>
                            </div>
                        </div>
                    </mat-card-content>
                </mat-card>
                <p>
                    <span class="text-secondary">Don't have account yet? </span>
                    <a matButton routerLink="/auth/signup" class="mx-2">Signup</a>
                </p>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
                height: 100%;
            }
        `,
    ],
})
export class LandingComponent implements OnInit {
    constructor(private fb: FormBuilder, private router: Router) {}

    ngOnInit() {}

    onSubmit() {}
}
