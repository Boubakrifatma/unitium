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
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-blog-details",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <span class="m-3 badge theme-primary d-inline-block"> Project Management </span>
                        <h1 class="mb-3">Modern Project Management: How Unitum Transforms Team Collaboration</h1>
                        <p class="opacity-75 mb-3 mb-lg-4">By <span class="unitum-team">Unitum Team</span> on {{ currentDate | date:'MMMM d, yyyy' }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container fade-in">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <!-- Blog Image -->
                        <div mat-card-image class="coverimg w-100 height-300" style="background: linear-gradient(135deg, #0d6efd, #0a58ca); display: flex; align-items: center; justify-content: center;">
                            <mat-icon style="font-size: 80px; width: 80px; height: 80px; color: white;">groups</mat-icon>
                        </div>
                        <mat-card-content class="pt-3 pt-lg-4">
                            <h2>Why Modern Teams Need a Unified Collaboration Platform</h2>
                            <p>
                                In today's fast-paced business environment, effective team collaboration is no longer a luxury—it's a necessity. With remote and hybrid work becoming the norm, organizations face unprecedented challenges in keeping everyone aligned, productive, and engaged. Unitum addresses these challenges head-on with an intelligent, all-in-one project management solution.
                            </p>

                            <h3>The Problem with Disconnected Tools</h3>
                            <p>Many teams rely on multiple disconnected tools for communication, task management, scheduling, and productivity tracking. This fragmented approach leads to:</p>
                            <ul>
                                <li><strong>Poor visibility into project status</strong> - Managers struggle to get a real-time view of progress</li>
                                <li><strong>Missed deadlines</strong> - Without integrated timelines, tasks fall through the cracks</li>
                                <li><strong>Inefficient communication</strong> - Information gets lost across different platforms</li>
                                <li><strong>Difficulty managing permissions</strong> - Access rights become a security nightmare</li>
                                <li><strong>Limited awareness of workload</strong> - Team members risk burnout without visibility</li>
                            </ul>

                            <h3>Introducing Unitum: A Unified Solution</h3>
                            <p>Unitum was designed specifically to solve these problems. Our platform provides a centralized environment where teams can plan, organize, and collaborate on projects within a single digital workspace.</p>

                            <h4>Key Features That Make a Difference:</h4>
                            
                            <h5>1. Role-Based Access Control</h5>
                            <p>Security is paramount. Unitum implements granular permission management at every level—workspace, project, and even individual tasks. Whether you're a workspace owner, project manager, editor, or viewer, you'll have exactly the access you need.</p>

                            <h5>2. Real-Time Collaboration</h5>
                            <p>Our discussion rooms and threaded comments enable teams to communicate seamlessly. Plus, with ML-based sentiment analysis, you can maintain healthy team dynamics and address potential issues before they escalate.</p>

                            <h5>3. Intelligent Timeline Management</h5>
                            <p>Never miss a deadline again. Unitum's Gantt charts, calendar views, and milestone tracking provide complete visibility into project progress. Automated alerts keep everyone informed of upcoming deadlines.</p>

                            <h5>4. AI-Powered Productivity Insights</h5>
                            <p>What sets Unitum apart is our autonomous productivity module. The system tracks activity across the platform and provides personalized recommendations. It can even detect signs of fatigue or overload, helping team members maintain work-life balance.</p>

                            <h3>Getting Started with Unitum</h3>
                            <p>Implementing Unitum in your organization is straightforward:</p>
                            
                            <p><strong>Step 1: Choose Your Plan</strong><br>
                            We offer flexible subscription options for both Enterprise (companies and startups) and Academic (universities and research labs) contexts.</p>

                            <p><strong>Step 2: Create Your Workspace</strong><br>
                            Set up your organization's workspace, invite team members, and define roles and permissions.</p>

                            <p><strong>Step 3: Start Your First Project</strong><br>
                            Create a project, assign team members, set milestones, and begin tracking progress immediately.</p>

                            <p><strong>Step 4: Leverage AI Insights</strong><br>
                            As your team works, Unitum's AI learns patterns and provides actionable insights to improve productivity.</p>

                            <h3>Real Results from Real Teams</h3>
                            <p>Early adopters of Unitum have reported:</p>
                            <ul>
                                <li>40% reduction in meeting times through better async communication</li>
                                <li>35% improvement in on-time project delivery</li>
                                <li>50% decrease in context switching between tools</li>
                                <li>Higher team satisfaction scores due to workload transparency</li>
                            </ul>

                            <h3>The Future of Project Management</h3>
                            <p>As organizations continue to evolve, the need for intelligent, integrated platforms will only grow. Unitum is built with scalability in mind, supporting SDG 8 (Decent Work), SDG 9 (Innovation), SDG 4 (Quality Education), and SDG 3 (Well-being).</p>

                            <p>We're committed to continuous innovation. Our roadmap includes deeper AI integration, advanced analytics, and even more customization options for enterprise clients.</p>

                            <h3>Conclusion</h3>
                            <p>Unitum represents the next generation of project management—unified, intelligent, and user-centric. Whether you're a small startup, a growing SME, or a large university, Unitum provides the tools you need to collaborate effectively and achieve your goals.</p>
                            
                            <p><strong>Ready to transform your teamwork?</strong> <a routerLink="/billing/pricing" class="unitum-link">Explore our plans</a> and start your journey with Unitum today.</p>
                            
                            <div class="author-box mt-4 pt-3">
                                <div class="row align-items-center">
                                    <div class="col-auto">
                                        <div class="author-avatar">
                                            <mat-icon>people</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h4 class="mb-0">Unitum Development Team</h4>
                                        <p class="text-secondary mb-0">Motez Selmi, Yosra Ben Ali, Fatma Boubakri, Eya Riahi, Nassim Maaoui & Minar Hemdan</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    
                    <!-- Comments Section -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-3">Comments (3)</h3>
                            <div class="comment-item">
                                <div class="d-flex gap-3 mb-3">
                                    <div class="comment-avatar"><mat-icon>person</mat-icon></div>
                                    <div>
                                        <strong>Sarah Johnson</strong> <span class="text-secondary small">- Product Manager</span>
                                        <p class="mb-1 mt-1">This is exactly what our team needs. When will the AI fatigue detection feature be fully available?</p>
                                        <small class="text-secondary">2 days ago</small>
                                    </div>
                                </div>
                                <div class="d-flex gap-3 mb-3 ms-4">
                                    <div class="comment-avatar comment-reply"><mat-icon>support_agent</mat-icon></div>
                                    <div>
                                        <strong>Unitum Support</strong> <span class="text-secondary small">- Official Response</span>
                                        <p class="mb-1 mt-1">Hi Sarah! The AI fatigue detection is already available in our Enterprise plan. Contact our sales team for a demo!</p>
                                        <small class="text-secondary">1 day ago</small>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                
                <div class="col-12 col-lg-4">
                    <!-- Categories -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <h3 class="mb-2">Categories</h3>
                        </mat-card-header>
                        <nav class="websidebar-nav mb-2">
                            <mat-nav-list>
                                <a mat-list-item routerLink="/web/blog">Project Management</a>
                                <a mat-list-item routerLink="/web/blog">Team Collaboration</a>
                                <a mat-list-item routerLink="/web/blog">AI in Workplace</a>
                                <a mat-list-item routerLink="/web/blog">Productivity Tips</a>
                                <a mat-list-item routerLink="/web/blog">Remote Work</a>
                            </mat-nav-list>
                        </nav>
                    </mat-card>
                    
                    <!-- Social Share -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-2">Share this article</h3>
                            <div class="share-buttons">
                                <a mat-iconButton class="mx-1" (click)="shareOnLinkedIn()"><img src="assets/img/l-logo.png" alt="LinkedIn" /></a>
                                <a mat-iconButton class="mx-1" (click)="shareOnTwitter()"><img src="assets/img/x-logo.png" alt="Twitter" /></a>
                                <a mat-iconButton class="mx-1" (click)="shareOnFacebook()"><img src="assets/img/f-logo.png" alt="Facebook" /></a>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    
                    <!-- Unitum CTA -->
                    <mat-card class="text-center mb-3 mb-lg-4 bg-gradient-primary text-white">
                        <mat-card-content class="p-4">
                            <mat-icon style="font-size: 48px; width: 48px; height: 48px; color: white;">rocket_launch</mat-icon>
                            <h3 class="mt-2">Ready to transform your teamwork?</h3>
                            <p class="opacity-75">Join hundreds of teams already using Unitum</p>
                            <button mat-raised-button color="accent" routerLink="/billing/pricing" class="mt-2">Get Started Free</button>
                        </mat-card-content>
                    </mat-card>
                    
                    <!-- Recent Posts -->
                    <p class="text-secondary small text-center mb-2">Recent Articles</p>
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content class="p-3">
                            <div class="d-flex gap-3 align-items-center">
                                <div class="recent-icon"><mat-icon>article</mat-icon></div>
                                <div>
                                    <a routerLink="/web/blog-details" class="recent-link">How AI is Revolutionizing Team Productivity</a>
                                    <p class="text-secondary small mb-0">5 min read</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4 hover-lift">
                        <mat-card-content class="p-3">
                            <div class="d-flex gap-3 align-items-center">
                                <div class="recent-icon"><mat-icon>article</mat-icon></div>
                                <div>
                                    <a routerLink="/web/blog-details" class="recent-link">5 Features Every Project Management Tool Needs</a>
                                    <p class="text-secondary small mb-0">4 min read</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    
                    <!-- Newsletter -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-2">Subscribe to our newsletter</h3>
                            <p class="text-secondary small">Get the latest updates about Unitum and project management trends.</p>
                            <mat-form-field appearance="outline" class="w-100">
                                <mat-label>Email address</mat-label>
                                <input matInput type="email" placeholder="you@example.com" [(ngModel)]="newsletterEmail" />
                            </mat-form-field>
                            <button mat-raised-button color="primary" class="w-100" (click)="subscribeNewsletter()">Subscribe</button>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .theme-primary { background: #0d6efd; color: white; }
        .unitum-team { font-weight: 600; color: #0d6efd; }
        .unitum-link { color: #0d6efd; text-decoration: none; font-weight: 600; }
        .unitum-link:hover { text-decoration: underline; }
        .author-box {
            background: rgba(13, 110, 253, 0.05);
            border-radius: 16px;
            padding: 20px;
        }
        .author-avatar {
            width: 50px;
            height: 50px;
            background: #0d6efd;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .author-avatar mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: white;
        }
        .comment-avatar {
            width: 40px;
            height: 40px;
            background: rgba(13, 110, 253, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .comment-avatar mat-icon {
            color: #0d6efd;
        }
        .comment-reply {
            background: rgba(25, 135, 84, 0.1);
        }
        .comment-reply mat-icon {
            color: #198754;
        }
        .bg-gradient-primary {
            background: linear-gradient(135deg, #0d6efd, #0a58ca);
        }
        .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        .recent-icon {
            width: 40px;
            height: 40px;
            background: rgba(13, 110, 253, 0.1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .recent-icon mat-icon {
            color: #0d6efd;
        }
        .recent-link {
            font-weight: 600;
            color: inherit;
            text-decoration: none;
        }
        .recent-link:hover {
            color: #0d6efd;
        }
        .share-buttons {
            display: flex;
            gap: 8px;
        }
        pre {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 13px;
        }
        @media (max-width: 768px) {
            .height-300 {
                height: 200px;
            }
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogDetailsComponent {
    currentDate = new Date();
    newsletterEmail = '';

    shareOnLinkedIn() {
        window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href), '_blank');
    }

    shareOnTwitter() {
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Modern Project Management with Unitum') + '&url=' + encodeURIComponent(window.location.href), '_blank');
    }

    shareOnFacebook() {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), '_blank');
    }

    subscribeNewsletter() {
        if (this.newsletterEmail && this.newsletterEmail.includes('@')) {
            console.log('Subscribed:', this.newsletterEmail);
            alert('Thank you for subscribing!');
            this.newsletterEmail = '';
        } else {
            alert('Please enter a valid email address.');
        }
    }

    ngAfterInit() {}
}