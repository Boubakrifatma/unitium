import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatToolbarModule } from "@angular/material/toolbar";
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-index-footer",
    standalone: true,
    imports: [RouterLink, MatToolbarModule, MatIconModule, MatCardModule, MatListModule, MatButtonModule],
    template: `
        <footer class="footer-main">
            <div class="container">
                <!-- Footer Top Section -->
                <div class="footer-top">
                    <div class="row">
                        <!-- Brand Section -->
                        <div class="col-12 col-lg-4 mb-4 mb-lg-0">
                            <div class="brand-section">
                                <a class="brand-logo" routerLink="/web/website">
                                    <img src="assets/img/logo-512.png" alt="Unitum Logo" class="logo-img" />
                                    <div class="brand-text">
                                        <h3 class="brand-name">Unitum</h3>
                                        <p class="brand-tagline">Collaborative Management Platform</p>
                                    </div>
                                </a>
                                <p class="brand-description">
                                    Unitum is a complete project management and collaboration platform designed for 
                                    SMEs, startups, and academic institutions. With AI-powered insights, real-time 
                                    collaboration, and smart resource management.
                                </p>
                                <div class="social-links">
                                    <a mat-iconButton (click)="openLinkedIn()" class="social-icon linkedin" aria-label="LinkedIn">
                                        <mat-icon>linkedin</mat-icon>
                                    </a>
                                    <a mat-iconButton (click)="openTwitter()" class="social-icon twitter" aria-label="Twitter">
                                        <mat-icon>twitter</mat-icon>
                                    </a>
                                    <a mat-iconButton (click)="openFacebook()" class="social-icon facebook" aria-label="Facebook">
                                        <mat-icon>facebook</mat-icon>
                                    </a>
                                    <a mat-iconButton (click)="openGithub()" class="social-icon github" aria-label="GitHub">
                                        <mat-icon>github</mat-icon>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Platform Links -->
                        <div class="col-6 col-md-3 col-lg-2 mb-4 mb-md-0">
                            <div class="footer-section">
                                <h4 class="section-title">Platform</h4>
                                <ul class="footer-links-list">
                                    <li><a routerLink="/web/website#features-section" (click)="scrollToFeatures($event)">Features</a></li>
                                    <li><a routerLink="/billing/pricing">Pricing</a></li>
                                    <li><a routerLink="/web/website#plans-section" (click)="scrollToPlans($event)">Plans</a></li>
                                    <li><a routerLink="/app/dashboard">Dashboard</a></li>
                                    <li><a routerLink="/web/case-study">Case Studies</a></li>
                                </ul>
                            </div>
                        </div>

                        <!-- Company Links -->
                        <div class="col-6 col-md-3 col-lg-2 mb-4 mb-md-0">
                            <div class="footer-section">
                                <h4 class="section-title">Company</h4>
                                <ul class="footer-links-list">
                                    <li><a routerLink="/web/about-us">About Us</a></li>
                                    <li><a routerLink="/web/blog">Blog</a></li>
                                    <li><a routerLink="/web/contact-us">Contact</a></li>
                                    <li><a routerLink="/web/careers">Careers</a></li>
                                    <li><a routerLink="/web/team">Our Team</a></li>
                                </ul>
                            </div>
                        </div>

                        <!-- Resources Links -->
                        <div class="col-6 col-md-3 col-lg-2 mb-4 mb-md-0">
                            <div class="footer-section">
                                <h4 class="section-title">Resources</h4>
                                <ul class="footer-links-list">
                                    <li><a routerLink="/web/help">Help Center</a></li>
                                    <li><a routerLink="/web/documentation">Documentation</a></li>
                                    <li><a routerLink="/web/api">API Reference</a></li>
                                    <li><a routerLink="/web/support">Support</a></li>
                                    <li><a routerLink="/web/community">Community</a></li>
                                </ul>
                            </div>
                        </div>

                        <!-- Contact Section -->
                        <div class="col-6 col-md-3 col-lg-2 mb-4 mb-md-0">
                            <div class="footer-section">
                                <h4 class="section-title">Contact</h4>
                                <ul class="contact-info-list">
                                    <li>
                                        <mat-icon>location_on</mat-icon>
                                        <span>Ariena Soghera, Ariana, 2080, Tunisia</span>
                                    </li>
                                    <li>
                                        <mat-icon>call</mat-icon>
                                        <a href="tel:+21650141000">+216 50 141 000</a>
                                    </li>
                                    <li>
                                        <mat-icon>email</mat-icon>
                                        <a href="mailto:contact@unitum.com">contact@unitum.com</a>
                                    </li>
                                    <li>
                                        <mat-icon>schedule</mat-icon>
                                        <span>Mon-Fri: 9:00 - 18:00</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Bottom Section -->
                <div class="footer-bottom">
                    <div class="row align-items-center">
                        <div class="col-md-6 text-center text-md-start">
                            <p class="copyright">
                                &copy; {{ currentYear }} Unitum. All rights reserved. 
                                Built with <mat-icon>favorite</mat-icon> in Tunisia
                            </p>
                        </div>
                        <div class="col-md-6 text-center text-md-end">
                            <div class="legal-links">
                                <a routerLink="/web/privacy-policy">Privacy Policy</a>
                                <span class="separator">|</span>
                                <a routerLink="/web/terms-of-use">Terms of Service</a>
                                <span class="separator">|</span>
                                <a routerLink="/web/cookie-policy">Cookie Policy</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    `,
    styles: [`
        .footer-main {
            background: var(--bs-card-bg, #ffffff);
            border-top: 1px solid var(--bs-border-color, #e9ecef);
            margin-top: 60px;
            padding: 60px 0 20px;
        }

        /* Brand Section */
        .brand-section {
            max-width: 320px;
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            margin-bottom: 20px;
        }

        .logo-img {
            width: 48px;
            height: 48px;
            border-radius: 12px;
        }

        .brand-name {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #0d6efd, #0b5ed7);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }

        .brand-tagline {
            font-size: 0.75rem;
            color: var(--bs-secondary-color, #6c757d);
            margin: 0;
        }

        .brand-description {
            font-size: 0.875rem;
            color: var(--bs-secondary-color, #6c757d);
            line-height: 1.6;
            margin-bottom: 20px;
        }

        /* Social Links */
        .social-links {
            display: flex;
            gap: 12px;
        }

        .social-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            background: rgba(13, 110, 253, 0.1);
        }

        .social-icon mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: #0d6efd;
            transition: all 0.3s ease;
        }

        .social-icon:hover {
            transform: translateY(-3px);
        }

        .social-icon.linkedin:hover { background: #0077b5; }
        .social-icon.linkedin:hover mat-icon { color: white; }

        .social-icon.twitter:hover { background: #1da1f2; }
        .social-icon.twitter:hover mat-icon { color: white; }

        .social-icon.facebook:hover { background: #1877f2; }
        .social-icon.facebook:hover mat-icon { color: white; }

        .social-icon.github:hover { background: #333333; }
        .social-icon.github:hover mat-icon { color: white; }

        /* Footer Sections */
        .footer-section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--bs-body-color, #212529);
        }

        .footer-links-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .footer-links-list li {
            margin-bottom: 10px;
        }

        .footer-links-list a {
            color: var(--bs-secondary-color, #6c757d);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            display: inline-block;
        }

        .footer-links-list a:hover {
            color: #0d6efd;
            transform: translateX(5px);
        }

        /* Contact Info */
        .contact-info-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .contact-info-list li {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 12px;
            font-size: 0.875rem;
            color: var(--bs-secondary-color, #6c757d);
        }

        .contact-info-list mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: #0d6efd;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .contact-info-list a {
            color: var(--bs-secondary-color, #6c757d);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .contact-info-list a:hover {
            color: #0d6efd;
        }

        /* Footer Bottom */
        .footer-bottom {
            border-top: 1px solid var(--bs-border-color, #e9ecef);
            padding-top: 20px;
            margin-top: 40px;
        }

        .copyright {
            font-size: 0.8rem;
            color: var(--bs-secondary-color, #6c757d);
            margin: 0;
        }

        .copyright mat-icon {
            font-size: 12px;
            width: 12px;
            height: 12px;
            color: #dc3545;
            vertical-align: middle;
        }

        .legal-links {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            flex-wrap: wrap;
        }

        .legal-links a {
            font-size: 0.8rem;
            color: var(--bs-secondary-color, #6c757d);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .legal-links a:hover {
            color: #0d6efd;
        }

        .separator {
            color: var(--bs-border-color, #dee2e6);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .footer-main {
                padding: 40px 0 20px;
                margin-top: 40px;
            }

            .brand-section {
                max-width: 100%;
                text-align: center;
            }

            .brand-logo {
                justify-content: center;
            }

            .social-links {
                justify-content: center;
            }

            .footer-section {
                text-align: center;
            }

            .contact-info-list li {
                justify-content: center;
            }

            .legal-links {
                justify-content: center;
                margin-top: 10px;
            }

            .copyright {
                text-align: center;
            }
        }

        /* Dark Mode Support */
        :host-context(body.dark-mode) .footer-main {
            background: #1a1a2e;
        }

        :host-context(body.dark-mode) .section-title {
            color: #ffffff;
        }

        :host-context(body.dark-mode) .footer-links-list a,
        :host-context(body.dark-mode) .contact-info-list li,
        :host-context(body.dark-mode) .copyright,
        :host-context(body.dark-mode) .legal-links a,
        :host-context(body.dark-mode) .brand-description {
            color: #a0a0a0;
        }
    `]
})
export class IndexFooterComponent {
    currentYear = new Date().getFullYear();

    openLinkedIn() {
        window.open('https://www.linkedin.com/company/unitum', '_blank');
    }

    openTwitter() {
        window.open('https://twitter.com/unitum', '_blank');
    }

    openFacebook() {
        window.open('https://www.facebook.com/unitum', '_blank');
    }

    openGithub() {
        window.open('https://github.com/unitum', '_blank');
    }

    scrollToFeatures(event: Event) {
        event.preventDefault();
        const element = document.getElementById('features-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    scrollToPlans(event: Event) {
        event.preventDefault();
        const element = document.getElementById('plans-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
}