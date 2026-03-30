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

@Component({
    selector: "app-blog-details",
    standalone: true,
    imports: [CommonModule, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <span class="m-3 badge theme-red d-inline-block"> United States </span>
                        <h1 class="mb-3">Material CSS in Angular: A Developer's Guide</h1>
                        <p class="opacity-75 mb-3 mb-lg-4">By <span>AdminUIUX</span> on Jul 30, 2026</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container fade-in">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <!-- Blog Image -->
                        <div mat-card-image class="coverimg w-100 height-300" routerLink="/web/blog-details">
                            <img src="assets/img/category1.jpg" alt="Blog post image" class="d-none" />
                            <!-- Category Tag -->
                            <span class="position-absolute top-0 start-0 m-3 badge theme-red"> United States </span>
                        </div>
                        <mat-card-content class="pt-3 pt-lg-4">
                            <h2>Great Article on Material CSS in Angular: A Developer's Guide</h2>
                            <p>
                                Material Design, a design language developed by Google, provides a comprehensive set of guidelines and components for creating beautiful, modern, and consistent user interfaces. For developers working with Angular, the official Angular Material library offers a seamless and powerful way to integrate these design principles into your applications. This guide will walk you through the process, from setup to implementation, helping you build stunning UIs with ease.
                            </p>

                            What is Angular Material?
                            <p>Angular Material is an official UI component library that provides reusable and accessible UI components based on the Material Design specification. It's not just a collection of styled elements; it's a complete system that includes a rich set of features like:</p>
                            <ul>
                                <li>Pre-built Components: A wide range of high-quality components for everything from buttons and form fields to complex data tables and navigation menus.</li>

                                <li>Theming: A robust theming system that allows you to easily customize colors, typography, and visual density to match your brand.</li>

                                <li>Accessibility: Components are designed with accessibility in mind, following WAI-ARIA standards to ensure your application is usable by everyone.</li>
                            </ul>

                            Getting Started: Installation and Setup
                            <p>Adding Angular Material to your project is straightforward thanks to the Angular CLI. The ng add command handles all the necessary configuration, including installing the package, importing required modules, and setting up an initial theme.</p>

                            <p>First, navigate to your Angular project's root directory and run the following command:</p>

                            <pre><code>ng add @angular/material
</code>
</pre>

                            <p>The CLI will prompt you to choose an initial theme, set up typography styles, and enable Angular animations.</p>
                            <ul>
                                <li>Choose a Theme: You can select a pre-built theme (e.g., Indigo/Pink, Deep Purple/Amber) or a custom one. You can always change this later.</li>
                                <li>Set up Typography: This will import the Material Design typography styles.</li>
                                <li>Enable Animations: Angular Material uses animations for many components, so it's essential to enable the BrowserAnimationsModule.</li>
                            </ul>
                            <p>After the installation, your app.module.ts (or the relevant standalone component file) will have the BrowserAnimationsModule imported, and your main style.css will be updated with the chosen theme.</p>

                            Using Components in Your Application
                            <p>Once the setup is complete, you can begin using Angular Material components in your templates. You'll need to import the specific component modules you plan to use. For example, to use the <code>&lt;mat-card&gt;</code> and <code>&lt;mat-button&gt;</code> components, you would <code>import MatCardModule </code> and <code>MatButtonModule </code>.</p>

                            <p>Here's a simple example of a component that uses a Material Card to display some information:</p>
                            <pre><code>// app.component.ts
import &#123; Component &#125; from '@angular/core';

@Component(&#123;
  selector: 'app-root',
  template: '
    &lt;div class="p-8"&gt;
      &lt;mat-card class="max-w-md mx-auto"&gt;
        &lt;mat-card-header&gt;
          &lt;mat-card-title&gt;Article Card&lt;/mat-card-title&gt;
          &lt;mat-card-subtitle&gt;A simple example&lt;/mat-card-subtitle&gt;
        &lt;/mat-card-header&gt;
        &lt;mat-card-content&gt;
          &lt;p&gt;This is an example of a Material Card component in an Angular application. It is a flexible container for displaying content.&lt;/p&gt;
        &lt;/mat-card-content&gt;
        &lt;mat-card-actions&gt;
          &lt;button mat-raised-button color="primary"&gt;Click Me&lt;/button&gt;
        &lt;/mat-card-actions&gt;
      &lt;/mat-card&gt;
    &lt;/div&gt;
  ',
  styleUrls: ['./app.component.css']
&#125;)
export class AppComponent &#123;&#125;
</code></pre>

                            <p>In the component's module file (e.g., app.module.ts), you would need to import the necessary modules and add them to the imports array:</p>
                            <pre><code>// app.module.ts

import &#123; NgModule &#125; from '&64@;angular/core';
import &#123; BrowserModule &#125; from '&64@;angular/platform-browser';
import &#123; BrowserAnimationsModule &#125; from '&64@;angular/platform-browser/animations';
import &#123; MatCardModule &#125; from '&64@;angular/material/card';
import &#123; MatButtonModule &#125; from '&64@;angular/material/button';
import &#123; AppComponent &#125; from './app.component';

&64@;NgModule(&#123;
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatButtonModule
  ],
  providers: [],
  bootstrap: [AppComponent]
&#125;)
export class AppModule &#123; &#125;

</code>
</pre>

                            <p>With standalone components, the process is even simpler. You just need to import the component modules directly into your component's imports array.</p>

                            Theming and Customization
                            <p>One of the most powerful features of Angular Material is its theming system. It allows you to define a color palette, typography, and density for your entire application. You can define your own theme by creating a custom Sass file and including it in your project.</p>

                            <p>Here is a simplified example of a custom theme file (custom-theme.scss):</p>
                            <pre><code>@use '@angular/material' as mat; 
@include mat.core(); 

// Define a custom primary and accent palette

$my-app-primary: mat.define-palette(mat.$indigo-palette); 
$my-app-accent: mat.define-palette(mat.$pink-palette, A200, A100, A400); 

// Define a light theme 
$my-app-theme: mat.define-light-theme(( color: ( primary: $my-app-primary, accent: $my-app-accent, ) )); 

// Apply the theme 
@include mat.all-component-themes($my-app-theme); </code> </pre>

                            <p>You would then import this file into your main stylesheet (styles.scss). This gives you fine-grained control over the look and feel of your application without having to write custom styles for every component.</p>

                            Conclusion
                            <p>Angular Material is an invaluable tool for any Angular developer looking to build professional, accessible, and beautiful applications. Its pre-built components, powerful theming system, and commitment to accessibility make it a top choice for creating a consistent and delightful user experience. By following this guide, you have everything you need to get started on your journey to mastering Material Design in Angular.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <h3 class="mb-2">Categories</h3>
                        </mat-card-header>
                        <nav class="websidebar-nav mb-2">
                            <mat-nav-list>
                                <a mat-list-item>Technology </a>
                                <a mat-list-item>UX Design </a>
                                <a mat-list-item>Design Thinking </a>
                                <a mat-list-item>Design Success </a>
                                <a mat-list-item>Grow Business </a>
                            </mat-nav-list>
                        </nav>
                    </mat-card>
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <h3 class="mb-2">Share</h3>
                            <a matIconButton class="mx-1"><img src="assets/img/i-logo.webp" alt="" /></a>
                            <a matIconButton class="mx-1"><img src="assets/img/f-logo.png" alt="" /></a>
                            <a matIconButton class="mx-1"><img src="assets/img/l-logo.png" alt="" /></a>
                            <a matIconButton class="mx-1"><img src="assets/img/x-logo.png" alt="" /></a>
                        </mat-card-content>
                    </mat-card>
                    <p class="text-secondary small text-center mb-3">Advertisement</p>
                    <mat-card class="text-center mb-3 mb-lg-4">
                        <mat-card-content>
                            <img mat-card-image src="assets/img/home.png" alt="Blog Advertisement image" class="w-100 rounded mb-3" />
                            <h3>Thing so better with us</h3>
                        </mat-card-content>
                    </mat-card>
                    <p class="text-secondary small text-center mb-3">Trending Product</p>
                    <mat-card class="mb-3 mb-lg-4 overflow-hidden">
                        <div class="row gx-3 align-items-center">
                            <div class="col">
                                <mat-card-content>
                                    <p class="mb-4"><span class="badge badge-light theme-magenta">Flat $ 50.00 OFF</span></p>
                                    <p class="text-theme mb-1">Dress for Woman</p>
                                    <h2 class="mb-1">Now $ 210.00</h2>
                                    <p class="text-secondary small mb-4">Offer valid on App only</p>
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </div>
                            <div class="col-5">
                                <div class="height-220 w-100 coverimg">
                                    <img src="assets/img/product8.jpg" alt="" class="d-none" />
                                </div>
                            </div>
                        </div>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogDetailsComponent {
    ngAfterInit() {}
}
