import { Component, ViewChild, OnInit, CUSTOM_ELEMENTS_SCHEMA, signal } from "@angular/core";
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
    selector: "app-blog",
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <h4 class="opacity-75">Our Blog</h4>
                        <h1 class="mb-3">
                            Read our
                            <span class="text-theme">latest articles</span> and updates
                        </h1>
                        <p class="opacity-75 mb-4 mb-lg-5">We publish our latest research, ideas, trends and product announcements for our genuine subscribers to read. We believe in trending design for our product.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 col-xl-8 ms-auto">
                    <mat-card class="mb-3 mb-lg-4">
                        <!-- Blog Image -->
                        <div mat-card-image class="coverimg w-100 height-300" routerLink="/web/blog-details">
                            <img src="assets/img/category1.jpg" alt="Blog post image" class="d-none" />
                            <!-- Category Tag -->
                            <span class="position-absolute top-0 start-0 m-3 badge theme-red"> United States </span>
                        </div>
                        <mat-card-content class="pt-3 pt-lg-4">
                            <!-- Blog Content -->
                            <h2 class="mb-2">Material CSS in Angular: A Developer's Guide</h2>
                            <p class="text-secondary mb-3 mb-lg-4">By <span class="text-theme">AdminUIUX</span> on Jul 30, 2026</p>
                            <p class="text-secondary mb-4">A deep dive into the delicate balance between creating a highly usable interface and one that delights the user. We explore case studies where simple design choices led to significant improvements in user satisfaction.</p>

                            <a routerLink="/web/blog-details" matButton> Read More <mat-icon iconPositionEnd>arrow_forward</mat-icon> </a>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xl-4 ms-auto">
                    <mat-card class="mb-3 mb-lg-4 w-100">
                        <mat-card-content>
                            <p class="text-theme mb-1">From the best Authors</p>
                            <h2>Trending Topics</h2>
                        </mat-card-content>
                        <mat-list style="--mat-list-list-item-three-line-container-height:88px">
                            @for (blog of blogs().slice(0, 5); track blog.id) {
                            <mat-list-item routerLink="/web/blog-details">
                                <div matListItemIcon routerLink="/web/blog-details" class="avatar avatar-70 rounded coverimg">
                                    <img [src]="blog.imageUrl" alt="Blog post image" class="d-none" />
                                </div>
                                <span matListItemTitle>{{ blog.title }}</span>
                                <span matListItemLine>
                                    By <span class="text-theme">{{ blog.author }}</span> on {{ blog.date }}
                                </span>
                                <span matListItemLine style="line-height:20px">
                                    <span class="badge badge-light">
                                        {{ blog.category }}
                                    </span>
                                </span>
                            </mat-list-item>
                            }
                        </mat-list>
                    </mat-card>
                </div>

                @for (blog of blogs(); track blog.id) {
                <!-- Blog Post Card -->
                <div class="col-12 col-md-6 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <!-- Blog Image -->
                        <div mat-card-image routerLink="/web/blog-details" class="coverimg w-100 height-200">
                            <img [src]="blog.imageUrl" alt="Blog post image" class="d-none" />
                            <!-- Category Tag -->
                            <span class="position-absolute top-0 start-0 m-3 badge badge-theme">
                                {{ blog.category }}
                            </span>
                        </div>
                        <mat-card-content class="pt-3 pt-lg-4">
                            <!-- Blog Content -->
                            <h2 class="mb-2">{{ blog.title }}</h2>
                            <p class="text-secondary mb-3">
                                By <span class="text-theme">{{ blog.author }}</span> on {{ blog.date }}
                            </p>
                            <p class="text-secondary mb-4">{{ blog.excerpt }}</p>

                            <a routerLink="/web/blog-details" matButton> Read More <mat-icon iconPositionEnd>arrow_forward</mat-icon> </a>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogComponent {
    blogs = signal([
        {
            id: 1,
            title: "The Future of Expressive Angular Interfaces",
            author: "Jane Doe",
            date: "Aug 21, 2026",
            imageUrl: "assets/img/product1.jpg",
            excerpt: "Exploring how modern web frameworks like Angular can embrace expressive design principles to create more human-centric and delightful user experiences. We dive into the use of subtle animations, fluid typography, and unconventional layouts.",
            category: "Design",
        },
        {
            id: 2,
            title: "Building a Dynamic Blog with Signals",
            author: "John Smith",
            date: "Aug 15, 2026",
            imageUrl: "assets/img/product2.jpg",
            excerpt: "Learn how to leverage Angular signals for a reactive and efficient data flow in your applications. This tutorial walks you through creating a simple, dynamic blog list that updates in real-time without complex state management.",
            category: "Development",
        },
        {
            id: 3,
            title: "Material Design Evolved: A New Perspective",
            author: "Alice Johnson",
            date: "Aug 10, 2026",
            imageUrl: "assets/img/product3.jpg",
            excerpt: "Material Design is evolving beyond its rigid grid-based past. We discuss how designers and developers are adding personality and character to their UIs, moving towards a more fluid and artistic expression of the design language.",
            category: "UI/UX",
        },
        {
            id: 4,
            title: "Designing for the Modern User: Usability vs. Delight",
            author: "Robert Brown",
            date: "Aug 05, 2026",
            imageUrl: "assets/img/product4.jpg",
            excerpt: "A deep dive into the delicate balance between creating a highly usable interface and one that delights the user. We explore case studies where simple design choices led to significant improvements in user satisfaction.",
            category: "UI/UX",
        },
        {
            id: 5,
            title: "Material CSS in Angular: A Developer's Guide",
            author: "Emily Davis",
            date: "Jul 30, 2026",
            imageUrl: "assets/img/product5.jpg",
            excerpt: "This guide provides a comprehensive overview of using Material CSS with Angular. From setup to practical examples, learn how to build beautiful, responsive UIs with utility-first CSS, drastically speeding up your development workflow.",
            category: "Development",
        },
        {
            id: 6,
            title: "The Power of Generative Design in UI",
            author: "Michael Wilson",
            date: "Jul 25, 2026",
            imageUrl: "assets/img/product6.jpg",
            excerpt: "Exploring how generative design principles and AI can automate and enhance the creation of user interfaces. We look at tools and techniques that help designers create unique and highly functional layouts with minimal manual effort.",
            category: "Technology",
        },
    ]);
    ngAfterInit() {}
}
