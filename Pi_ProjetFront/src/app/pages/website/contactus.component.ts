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
                        <span class="badge badge-outline-theme mb-2">Contact Unitum</span>
                        <h1 class="mb-3">Let's talk about <span class="text-gradient">your project</span></h1>
                        <p class="opacity-75 mb-4 mb-lg-5">Have questions about Unitum? Need a custom solution for your team? We're here to help you succeed with collaborative project management.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-6 col-lg-6 col-xl-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-2">Visit us at:</h3>
                            <p class="text-secondary">Come to our office for a personal discussion about your project needs</p>
                            <br />
                            <!-- other contacts-->
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-12 col-sm-6 col-md-12 col-xl-6 mb-3 mb-sm-0 mb-md-3 mb-xl-0">
                                    <div class="contact-info-card">
                                        <div class="contact-icon"><mat-icon>location_on</mat-icon></div>
                                        <h4 class="mb-3">Head Office</h4>
                                        <p class="text-secondary mb-lg-4">
                                            Ariena Soghera<br />
                                            Ariana, 2080<br />
                                            Tunisia
                                        </p>
                                        <p class=""><mat-icon class="material-icons-outlined align-middle me-2">schedule</mat-icon> Mon-Fri 9:00 am - 6:00 pm</p>
                                        <button mat-button (click)="callPhone()"><mat-icon class="material-icons-outlined align-middle me-2">call</mat-icon> +216 50 141 000</button>
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6 col-md-12 col-xl-6">
                                    <div class="contact-info-card">
                                        <div class="contact-icon"><mat-icon>business_center</mat-icon></div>
                                        <h4 class="mb-3">Sales & Support</h4>
                                        <p class="text-secondary mb-lg-4">
                                            For sales inquiries and<br />
                                            enterprise solutions
                                        </p>
                                        <p class=""><mat-icon class="material-icons-outlined align-middle me-2">email</mat-icon> sales@unitum.com</p>
                                        <button mat-button (click)="callSales()"><mat-icon class="material-icons-outlined align-middle me-2">call</mat-icon> +216 50 141 000</button>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <!-- other contacts-->
                    <div class="row gx-3 gx-lg-4 justify-content-center">
                        <div class="col-12 col-md-12 col-xl-6">
                            <mat-card class="mb-3 mb-lg-4 hover-lift">
                                <mat-card-content class="">
                                    <div class="support-icon"><mat-icon>computer</mat-icon></div>
                                    <h4 class="mb-3">Technical Support</h4>
                                    <p class="text-secondary mb-1">Facing technical challenges with Unitum? Our engineering team is ready to assist you.</p>
                                    <a mat-button href="mailto:tech@unitum.com">tech@unitum.com</a>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-12 col-xl-6">
                            <mat-card class="mb-3 mb-lg-4 hover-lift">
                                <mat-card-content>
                                    <div class="support-icon"><mat-icon>support_agent</mat-icon></div>
                                    <h4 class="mb-3">General Support</h4>
                                    <p class="text-secondary mb-1">Questions about features, billing, or account management? Contact our support team.</p>
                                    <a mat-button href="mailto:support@unitum.com">support@unitum.com</a>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4 contact-form-card">
                        <mat-card-content class="z-index-1 pt-4">
                            <h3 class="mb-2">Send us your query</h3>
                            <p class="text-secondary mb-4">We'll get back to you within 24 hours</p>
                            <form [formGroup]="contactForm" (ngSubmit)="onSubmit()">
                                <div class="row gx-3">
                                    <div class="col-6">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>First Name</mat-label>
                                            <input matInput placeholder="Ahmed" formControlName="firstName" />
                                        </mat-form-field>
                                    </div>
                                    <div class="col-6">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Last Name</mat-label>
                                            <input matInput placeholder="Ben Ali" formControlName="lastName" />
                                        </mat-form-field>
                                    </div>
                                </div>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Email</mat-label>
                                    <input matInput type="email" placeholder="ahmed@example.com" formControlName="email" />
                                    <mat-error *ngIf="contactForm.get('email')?.hasError('required') && contactForm.get('email')?.touched">Email required</mat-error>
                                    <mat-error *ngIf="contactForm.get('email')?.hasError('email') && contactForm.get('email')?.touched">Valid email required</mat-error>
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Phone (optional)</mat-label>
                                    <input matInput type="tel" placeholder="50 141 000" formControlName="phone" />
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Subject</mat-label>
                                    <input matInput type="text" placeholder="Subject" formControlName="subject" />
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Message</mat-label>
                                    <textarea matInput rows="4" formControlName="message" placeholder="Tell us about your project or question..."></textarea>
                                </mat-form-field>

                                <div class="text-center">
                                    <button type="submit" mat-raised-button color="primary" [disabled]="contactForm.invalid || isSubmitting" class="submit-btn">
                                        <mat-icon *ngIf="!isSubmitting">send</mat-icon>
                                        <span *ngIf="!isSubmitting">Send Message</span>
                                        <span *ngIf="isSubmitting">Sending...</span>
                                    </button>
                                </div>
                                <p class="text-center text-secondary small mt-3" *ngIf="submitSuccess">
                                    <mat-icon style="font-size: 14px; vertical-align: middle; color: #198754;">check_circle</mat-icon> Message sent successfully! We'll contact you soon.
                                </p>
                            </form>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Map Section -->
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="p-0 overflow-hidden">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12779.947206227115!2d10.180179!3d36.860045!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12fd3491a6a7d9c9%3A0x1e5a8a2b3c4d5e6f!2sAriana%2C%20Tunisia!5e0!3m2!1sen!2stn!4v1700000000000!5m2!1sen!2stn" 
                        width="100%" 
                        height="300" 
                        style="border:0;" 
                        allowfullscreen="" 
                        loading="lazy" 
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </mat-card-content>
            </mat-card>

            <!-- get support and join us -->
            <div class="position-relative text-center rounded overflow-hidden mb-3 mb-lg-4 z-index-0 p-4 p-lg-5 bg-gradient-primary">
                <div class="row gx-3 justify-content-center z-index-1 position-relative text-white mb-3 mb-lg-4">
                    <div class="col-12 col-md-8 col-lg-6">
                        <h2 class="mb-1">Ready to transform your teamwork?</h2>
                        <p class="opacity-75">Join hundreds of teams already using Unitum</p>
                    </div>
                </div>
                <!-- quick links -->
                <div class="row gx-3 gx-lg-4 justify-content-center">
                    <div class="col-12 col-sm-6 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0 hover-lift">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3 bg-soft-primary">
                                    <mat-icon class="material-icons-outlined text-lg">chat</mat-icon>
                                </div>
                                <h3 class="mb-2">Live Chat</h3>
                                <p class="text-secondary">Chat with our team instantly for quick questions and guidance.</p>
                                <a mat-button (click)="startLiveChat()">Start Chat</a>
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <div class="col-12 col-sm-6 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0 hover-lift">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3 bg-soft-primary">
                                    <mat-icon class="material-icons-outlined text-lg">help</mat-icon>
                                </div>
                                <h3 class="mb-2">Support Ticket</h3>
                                <p class="text-secondary">Open a detailed ticket with attachments for complex issues.</p>
                                <a matButton routerLink="/web/support">Create Ticket</a>
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <div class="col-12 col-md-4 col-lg-4">
                        <mat-card class="mb-3 mb-lg-0 hover-lift">
                            <mat-card-content>
                                <div class="avatar avatar-60 text-theme rounded mb-3 bg-soft-primary">
                                    <mat-icon class="material-icons-outlined text-lg">event</mat-icon>
                                </div>
                                <h3 class="mb-2">Schedule Demo</h3>
                                <p class="text-secondary">See Unitum in action with a personalized demo for your team.</p>
                                <a matButton (click)="scheduleDemo()">Book Demo</a>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .badge-outline-theme {
            border: 1.5px solid #0d6efd;
            color: #0d6efd;
            background: transparent;
            padding: 5px 16px;
            border-radius: 40px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .text-gradient {
            background: linear-gradient(135deg, #0d6efd, #0b5ed7);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .contact-info-card {
            padding: 16px;
            border-radius: 16px;
            transition: all 0.2s;
        }
        .contact-info-card:hover {
            background: rgba(13, 110, 253, 0.04);
        }
        .contact-icon {
            width: 48px;
            height: 48px;
            background: rgba(13, 110, 253, 0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }
        .contact-icon mat-icon {
            font-size: 24px;
            width: 24px;
            height: 24px;
            color: #0d6efd;
        }
        .support-icon {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #0d6efd22, #0b5ed722);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }
        .support-icon mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: #0d6efd;
        }
        .contact-form-card {
            position: sticky;
            top: 100px;
        }
        .submit-btn {
            padding: 10px 32px !important;
            border-radius: 40px !important;
            font-weight: 600 !important;
        }
        .submit-btn mat-icon {
            margin-right: 8px;
        }
        .bg-gradient-primary {
            background: linear-gradient(135deg, #0d6efd, #0a58ca);
            color: white;
        }
        .bg-soft-primary {
            background: rgba(13, 110, 253, 0.1);
        }
        .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
            .contact-form-card {
                position: relative;
                top: 0;
            }
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContactUsComponent {
    contactForm: FormGroup;
    isSubmitting = false;
    submitSuccess = false;

    constructor(private fb: FormBuilder) {
        this.contactForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone: [''],
            subject: ['', Validators.required],
            message: ['', Validators.required]
        });
    }

    onSubmit() {
        if (this.contactForm.valid) {
            this.isSubmitting = true;
            // Simulate API call - replace with actual HTTP request
            setTimeout(() => {
                console.log('Form submitted:', this.contactForm.value);
                this.isSubmitting = false;
                this.submitSuccess = true;
                this.contactForm.reset();
                setTimeout(() => {
                    this.submitSuccess = false;
                }, 5000);
            }, 1500);
        }
    }

    callPhone() {
        window.location.href = 'tel:+21650141000';
    }

    callSales() {
        window.location.href = 'tel:+21650141000';
    }

    startLiveChat() {
        // Implement live chat integration
        console.log('Start live chat');
    }

    scheduleDemo() {
        // Navigate to booking page or open calendar
        console.log('Schedule demo');
    }

    ngAfterInit() {}
}