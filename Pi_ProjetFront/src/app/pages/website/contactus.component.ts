import { Component, ViewChild, OnInit, CUSTOM_ELEMENTS_SCHEMA, Renderer2, DOCUMENT, Inject, signal, computed } from "@angular/core";
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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
    selector: "app-contact-us",
    standalone: true,
    imports: [CommonModule, FormsModule, MatListModule, MatMenuModule, FormsModule, MatIconModule, MatInputModule, ReactiveFormsModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <h4 class="opacity-75">Contact us</h4>
                        <h1 class="mb-3">Feel free to connect with us</h1>
                        <p class="opacity-75 mb-4 mb-lg-5">Reach to us with your queries for product development or any guidance related to our product. We will try to revert back as soon as we can.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-6 col-lg-6 col-xl-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-2">Reach us at:</h3>
                            <p class="text-secondary">Come at our place and have a good discussion</p>
                            <br />
                            <!-- other contacts-->
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-12 col-sm-6 col-md-12 col-xl-6 mb-3 mb-sm-0 mb-md-3 mb-xl-0">
                                    <h4 class="mb-3">Head Office</h4>
                                    <p class="text-secondary mb-lg-4">
                                        3778 Golden Street<br />
                                        Miami, Florida, 33179,<br />
                                        United States
                                    </p>

                                    <p class=""><mat-icon class="material-icons-outlined align-middle me-2">alarm</mat-icon> Mon-Fri 9:00 am - 7:00 pm</p>
                                    <button matButton><mat-icon class="material-icons-outlined align-middle me-2">call</mat-icon> +1 305-655-59S8</button>
                                </div>
                                <div class="col-12 col-sm-6 col-md-12 col-xl-6">
                                    <h4 class="mb-3">Sales</h4>
                                    <p class="text-secondary mb-lg-4">
                                        3778 Golden Street<br />
                                        Miami, Florida, 33179,<br />
                                        United States
                                    </p>

                                    <p class=""><mat-icon class="material-icons-outlined align-middle me-2">alarm</mat-icon> Mon-Fri 9:00 am - 7:00 pm</p>
                                    <button matButton><mat-icon class="material-icons-outlined align-middle me-2">call</mat-icon> +1 305-655-59S8</button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <!-- other contacts-->
                    <div class="row gx-3 gx-lg-4 justify-content-center">
                        <div class="col-12 col-md-12 col-xl-6">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content class="">
                                    <h4 class="mb-3">Technical problem</h4>
                                    <p class="text-secondary mb-1">If you have any type of technical challenges and would like to get help from us please drop an email.</p>
                                    <a matButton href="mailto:info&#64;adminuiux.cos">tech&#64;adminuiux.coms</a>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-12 col-xl-6">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <h4 class="mb-3">General Support</h4>
                                    <p class="text-secondary mb-1">If you have any type of challenges regarding products & would like to get help from us please email us.</p>
                                    <a matButton href="mailto:info&#64;adminuiux.cos">sales&#64;adminuiux.coms</a>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="z-index-1 pt-4">
                            <h3 class="mb-2">Send us your query</h3>
                            <p class="text-secondary mb-4">We'll back with resolution</p>
                            <div class="row gx-3">
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100">
                                        <mat-label>First Name</mat-label>
                                        <input matInput placeholder="John" />
                                    </mat-form-field>
                                </div>
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100">
                                        <mat-label>Last Name</mat-label>
                                        <input matInput placeholder="Doe" />
                                    </mat-form-field>
                                </div>
                            </div>

                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Email</mat-label>
                                <input matInput type="email" placeholder="john@example.com" />
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Subject</mat-label>
                                <input matInput type="text" placeholder="Subject" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Description</mat-label>
                                <textarea matInput></textarea>
                            </mat-form-field>

                            <div class="text-center">
                                <button type="button" matButton="filled">Submit Message</button>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- get support and join us -->
            <div class="position-relative text-center rounded overflow-hidden mb-3 mb-lg-4 z-index-0 p-4 p-lg-5 bg-theme">
                <div class="row gx-3 justify-content-center z-index-1 position-relative text-white mb-3 mb-lg-4">
                    <div class="col-12 col-md-8 col-lg-6">
                        <h2 class="mb-1">We are always here</h2>
                        <p class="opacity-75">To help and to guide you!</p>
                    </div>
                </div>
                <!-- quick links -->
                <div class="row gx-3 gx-lg-4 justify-content-center">
                    <div class="col-12 col-sm-6 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3">
                                    <mat-icon class="material-icons-outlined text-lg">chat</mat-icon>
                                </div>
                                <h3 class="mb-2">Communicate</h3>
                                <p class="text-secondary">You have live assistant with whom you can share your query &amp; get answered.</p>
                                <a matButton>Watch Community</a>
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <div class="col-12 col-sm-6 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3">
                                    <mat-icon class="material-icons-outlined text-lg">help</mat-icon>
                                </div>
                                <h3 class="mb-2">Get Support</h3>
                                <p class="text-secondary">Connect with our expert by submitting details with photos &amp; documents.</p>
                                <a matButton>Create Ticket</a>
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <div class="col-12 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3">
                                    <mat-icon class="material-icons-outlined text-lg">event</mat-icon>
                                </div>
                                <h3 class="mb-2">Schedule a Demo</h3>
                                <p class="text-secondary">Get details of features and quick look on how it works. Schedule a demo.</p>
                                <a matButton>Book Demo</a>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContactUsComponent {
    ngAfterInit() {}
}
