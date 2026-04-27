import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
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

@Component({
    selector: "app-about-us",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <!-- Hero Section -->
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <span class="badge badge-outline-theme mb-2">About Unitum</span>
                        <h1 class="mb-3">We're on a mission to <span class="text-gradient">transform teamwork</span></h1>
                        <p class="opacity-75 mb-4 mb-lg-5">Unitum is a collaborative management platform designed to help modern teams plan, organize, and succeed together.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <!-- Our Story -->
            <div class="row gx-3 gx-lg-4 align-items-center mb-5">
                <div class="col-12 col-lg-6 mb-3 mb-lg-4">
                    <mat-card class="h-100">
                        <mat-card-content class="p-lg-4">
                            <h3 class="opacity-75">Our Story</h3>
                            <h2 class="mb-3">Born from experience, built for collaboration</h2>
                            <p class="text-secondary">Unitum was created by a team of developers and project managers who experienced firsthand the frustrations of disconnected tools. We saw teams struggling with scattered communication, missed deadlines, and burnout.</p>
                            <p class="text-secondary mt-3">Our solution? A unified platform that combines project tracking, real-time collaboration, AI-driven insights, and smart resource management—all in one place.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 mb-3 mb-lg-4">
                    <mat-card class="bg-gradient-primary text-white h-100">
                        <mat-card-content class="p-lg-4 text-center">
                            <mat-icon style="font-size: 64px; width: 64px; height: 64px; color: white;">rocket_launch</mat-icon>
                            <h2 class="mt-3">Our Mission</h2>
                            <p>Empower teams worldwide to collaborate effectively, stay productive, and maintain well-being through intelligent project management solutions.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Our Values -->
            <div class="row gx-3 gx-lg-4 justify-content-center text-center mb-5">
                <div class="col-12 mb-4">
                    <h3 class="opacity-75">Our Core Values</h3>
                    <h2>What drives us every day</h2>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 hover-lift">
                        <mat-card-content class="p-4">
                            <div class="value-icon"><mat-icon>lightbulb</mat-icon></div>
                            <h3 class="mb-2">Innovation</h3>
                            <p class="text-secondary">We constantly push boundaries to bring cutting-edge AI and collaboration features to our users.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 hover-lift">
                        <mat-card-content class="p-4">
                            <div class="value-icon"><mat-icon>handshake</mat-icon></div>
                            <h3 class="mb-2">Trust</h3>
                            <p class="text-secondary">Security and reliability are at the core of everything we build.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 hover-lift">
                        <mat-card-content class="p-4">
                            <div class="value-icon"><mat-icon>diversity_3</mat-icon></div>
                            <h3 class="mb-2">Inclusivity</h3>
                            <p class="text-secondary">We design for everyone, supporting diverse teams and accessibility needs.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3 mb-3 mb-lg-4">
                    <mat-card class="text-center h-100 hover-lift">
                        <mat-card-content class="p-4">
                            <div class="value-icon"><mat-icon>psychology</mat-icon></div>
                            <h3 class="mb-2">Well-being</h3>
                            <p class="text-secondary">Our AI detects fatigue and promotes healthy work-life balance.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- Meet the Team -->
            <div class="bg-light-gradient bg-light-theme rounded-4 p-4 p-lg-5 mb-5">
                <div class="row gx-3 gx-lg-4 text-center mb-4">
                    <div class="col-12">
                        <h3 class="opacity-75">The Minds Behind Unitum</h3>
                        <h2>Meet our <span class="text-gradient">development team</span></h2>
                        <p class="text-secondary">Six passionate developers and designers united to build the future of collaboration.</p>
                    </div>
                </div>
                <div class="row gx-3 gx-lg-4 justify-content-center">
                    <div class="col-12 col-sm-6 col-md-4 col-lg-2 mb-3 mb-lg-4" *ngFor="let member of teamMembers">
                        <mat-card class="text-center h-100 hover-lift">
                            <div class="team-avatar mx-auto mt-4">
                                <mat-icon>{{ member.icon }}</mat-icon>
                            </div>
                            <mat-card-content>
                                <h4 class="mb-1">{{ member.name }}</h4>
                                <p class="text-secondary small">{{ member.role }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
            </div>

            <!-- SDG Contribution -->
            <div class="row gx-3 gx-lg-4 align-items-center mb-5">
                <div class="col-12 col-lg-6 mb-3 mb-lg-4">
                    <img src="assets/img/home.png" alt="SDG Goals" class="w-100 rounded shadow" />
                </div>
                <div class="col-12 col-lg-6 mb-3 mb-lg-4">
                    <h3 class="opacity-75">Sustainable Development Goals</h3>
                    <h2 class="mb-3">Contributing to a <span class="text-gradient">better future</span></h2>
                    <p class="text-secondary">Unitum actively supports four UN Sustainable Development Goals:</p>
                    <div class="row gx-3 mt-4">
                        <div class="col-6 mb-3" *ngFor="let sdg of sdgs">
                            <div class="sdg-item">
                                <mat-icon class="sdg-icon">{{ sdg.icon }}</mat-icon>
                                <div>
                                    <strong>{{ sdg.title }}</strong>
                                    <p class="text-secondary small mb-0">{{ sdg.description }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CTA Section -->
            <div class="position-relative text-center rounded overflow-hidden mb-3 mb-lg-4 p-4 p-lg-5 bg-gradient-primary text-white">
                <div class="row gx-3 justify-content-center">
                    <div class="col-12 col-md-8 col-lg-6">
                        <h2 class="mb-2">Ready to transform your teamwork?</h2>
                        <p class="opacity-75 mb-4">Join hundreds of teams already using Unitum to collaborate smarter.</p>
                        <button mat-raised-button color="accent" routerLink="/billing/pricing" class="cta-button">Get Started Free</button>
                        <button mat-stroked-button class="ms-2 cta-outline" routerLink="/web/contact-us">Contact Sales</button>
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
        }
        .text-gradient {
            background: linear-gradient(135deg, #0d6efd, #0b5ed7);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .bg-gradient-primary {
            background: linear-gradient(135deg, #0d6efd, #0a58ca);
        }
        .value-icon {
            width: 70px;
            height: 70px;
            background: rgba(13, 110, 253, 0.1);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .value-icon mat-icon {
            font-size: 32px;
            width: 32px;
            height: 32px;
            color: #0d6efd;
        }
        .team-avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #0d6efd22, #0b5ed722);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .team-avatar mat-icon {
            font-size: 40px;
            width: 40px;
            height: 40px;
            color: #0d6efd;
        }
        .sdg-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            background: rgba(13, 110, 253, 0.05);
            border-radius: 12px;
        }
        .sdg-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: #0d6efd;
        }
        .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
        }
        .cta-button {
            background: white !important;
            color: #0d6efd !important;
            font-weight: 600 !important;
        }
        .cta-outline {
            border-color: white !important;
            color: white !important;
        }
        .cta-outline:hover {
            background: white !important;
            color: #0d6efd !important;
        }
        .rounded-4 {
            border-radius: 24px;
        }
        @media (max-width: 768px) {
            .team-avatar {
                width: 60px;
                height: 60px;
            }
            .team-avatar mat-icon {
                font-size: 30px;
                width: 30px;
                height: 30px;
            }
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AboutUsComponent {
    teamMembers = [
        { name: 'Motez Selmi', role: 'Lead Developer', icon: 'code' },
        { name: 'Yosra Ben Ali', role: 'UX/UI Designer', icon: 'brush' },
        { name: 'Fatma Boubakri', role: 'Backend Engineer', icon: 'storage' },
        { name: 'Eya Riahi', role: 'Frontend Developer', icon: 'web' },
        { name: 'Nassim Maaoui', role: 'DevOps & AI', icon: 'psychology' },
        { name: 'Minar Hemdan', role: 'Product Manager', icon: 'manage_accounts' }
    ];

    sdgs = [
        { icon: 'work', title: 'SDG 8', description: 'Decent Work & Economic Growth' },
        { icon: 'manufacturing', title: 'SDG 9', description: 'Industry, Innovation & Infrastructure' },
        { icon: 'school', title: 'SDG 4', description: 'Quality Education' },
        { icon: 'favorite', title: 'SDG 3', description: 'Good Health & Well-being' }
    ];
}