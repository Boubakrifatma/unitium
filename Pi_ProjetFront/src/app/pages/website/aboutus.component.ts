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
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();

@Component({
    selector: "app-about-us",
    standalone: true,
    imports: [CommonModule, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="bg-theme-white-gradient bg-light-gradient position-relative pt-5 mb-3 mb-lg-4">
            <div class="container py-4 pt-lg-5 z-index-1 position-relative ">
                <div class="row gx-3 gx-lg-4 justify-content-center text-center">
                    <div class="col-12 col-lg-8 col-xl-6 pt-3 pt-lg-5">
                        <h4 class="opacity-75">About us</h4>
                        <h1 class="mb-3">
                            We Develop Multipurpose <br />
                            <span class="text-theme">HTML UI templates</span> for Web & Mobile Apps
                        </h1>
                        <p class="opacity-75 mb-4 mb-lg-5">Enhance your web projects with our responsive Angular Material Admin Dashboard Template. This comprehensive UI kit provides a sleek, modern, and intuitive design to help you build powerful, feature-rich admin panels with ease.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="row gx-3 gx-lg-4 py-4 py-lg-5">
                <div class="col-12 col-lg-12 col-xl-4 mb-3 mb-lg-4">
                    <h3 class="text-theme">Know more about us</h3>
                    <h2>We Believe In Creative Design along with Flexibility & Easy to adopt new functionalities</h2>
                    <p class="text-secondary">Our template is specifically designed to fast-track your Material UI UX Multipurpose Admin, finance, ecommerce, social, calendar, dashboards for business domain by providing ready-to-use UI pages tailored to industries. With pre-built pages like Shop, Products, dashboards, statistics, finace, cart, reminders, user profiles, invoice, and user settings etc.</p>
                </div>
                <div class="col-12 col-lg-6 col-xl-4 mb-3 mb-lg-4">
                    <mat-card class="h-100 position-relative">
                        <div class="coverimg h-100 w-100 position-absolute top-0 start-0 rounded">
                            <img src="assets/img/category12.jpg" alt="" />
                        </div>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xl-4 mb-3 mb-lg-4">
                    <mat-card class="bg-theme text-white position-relative">
                        <div class="coverimg h-100 w-100 position-absolute top-0 start-0 rounded opacity-25">
                            <img src="assets/img/background2.jpg" alt="" />
                        </div>
                        <mat-card-content class="p-4 p-lg-5 z-index-1 position-relative">
                            <h2>Start your projectsWeb & Mobile App with Creative and Unique HTML templates</h2>
                            <p class="opacity-75">Experience the ease of development with our accessible and user-centered Bootstrap HTML templates. Explore a vast collection of admin templates and mobile app UI/UX designs, all crafted for optimal user experience. Start building stunning, user-friendly applications today!</p>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4 theme-yellow">
                        <mat-card-content class="p-lg-3 p-xl-4">
                            <div class="avatar avatar-40 text-theme rounded mb-3">
                                <mat-icon class="material-icons-outlined text-lg">lightbulb</mat-icon>
                            </div>
                            <h3 class="mb-3">Creative Ideas Workflow</h3>
                            <p class="text-secondary">Our HTML templates are built with developers in mind, featuring a clean structure for effortless integration with your preferred technology.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4 theme-orange">
                        <mat-card-content class="p-lg-3 p-xl-4">
                            <div class="avatar avatar-40 text-theme rounded mb-3">
                                <mat-icon class="material-icons-outlined text-lg">group</mat-icon>
                            </div>
                            <h3 class="mb-3">User Cetered Designs</h3>
                            <p class="text-secondary">User-focused design is at the heart of everything we do. Template customization & consistent design ensure a seamless experience for your users.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-0 mb-lg-4 theme-violet">
                        <mat-card-content class="p-lg-3 p-xl-4">
                            <div class="avatar avatar-40 text-theme rounded mb-3">
                                <mat-icon class="material-icons-outlined text-lg">web</mat-icon>
                            </div>
                            <h3 class="mb-3">Smart Coding Development</h3>
                            <p class="text-secondary">Our template's feature clean, well-commented, & validated code, providing max flexibility across major devices to ease for developers & clients.</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="row gx-3 gx-lg-4 py-4 py-lg-5">
                <div class="col-12 col-lg-6 col-xl-3">
                    <swiper-container slides-per-view="1" space-between="20px" autoplay="true" class="swiper swiperThumbs">
                        <swiper-slide class="w-100">
                            <div class="coverimg height-400 w-100 rounded mb-3 mb-lg-4">
                                <img src="assets/img/user-7.jpg" alt="" />
                            </div>
                        </swiper-slide>
                        <swiper-slide class="w-100">
                            <div class="coverimg height-400 w-100 rounded mb-3 mb-lg-4">
                                <img src="assets/img/user-10.jpg" alt="" />
                            </div>
                        </swiper-slide>
                        <swiper-slide class="w-100">
                            <div class="coverimg height-400 w-100 rounded mb-3 mb-lg-4">
                                <img src="assets/img/user-5.jpg" alt="" />
                            </div>
                        </swiper-slide>
                        <swiper-slide class="w-100">
                            <div class="coverimg height-400 w-100 rounded mb-3 mb-lg-4">
                                <img src="assets/img/user-6.jpg" alt="" />
                            </div>
                        </swiper-slide>
                    </swiper-container>
                    <div class="coverimg height-100 w-100 rounded mb-3 mb-lg-4">
                        <img src="assets/img/category1.jpg" alt="" />
                    </div>
                </div>
                <div class="col-12 col-lg-6 col-xl-9">
                    <h3 class="text-theme">Know what our customer says</h3>
                    <h1>Customer satisfaction is key to success</h1>
                    <p class="text-secondary mb-4">
                        We believe that great design seamlessly blends artistic vision with<br />
                        practical functionality, creating experiences that are both beautiful and intuitive.
                    </p>
                    <swiper-container slides-per-view="auto" thumbs-swiper=".swiperThumbs" space-between="20px" autoplay="true" pagination="true" class="swiper">
                        <swiper-slide class="pb-3 width-400">
                            <mat-card class="overflow-hidden mb-4">
                                <mat-card-content class="p-lg-4">
                                    <span class="avatar avatar-50 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50">
                                            <path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)" />
                                        </svg>
                                    </span>
                                    <h3 class="mb-2">Fantastic work as what we need</h3>
                                    <p class="text-secondary">AdminUIUX completely transformed our internal dashboard, making complex data intuitive and actionable. The streamlined interface cut our daily report generation time by over 40%. If you need efficient design and administrative clarity, look no further.</p>
                                    <br />
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="coverimg avatar avatar-60 rounded">
                                                <img src="assets/img/user-7.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="text-truncated mb-1">Rick Dino</h3>
                                            <p class="mb-1">London, UK</p>
                                            <p class="text-secondary small">CEO, Webmavdev.com</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        <swiper-slide class="pb-3 width-400">
                            <mat-card class="overflow-hidden mb-4">
                                <mat-card-content class="p-lg-4">
                                    <span class="avatar avatar-50 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50">
                                            <path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)" />
                                        </svg>
                                    </span>
                                    <h3 class="mb-2">Gear up with new system design</h3>
                                    <p class="text-secondary">We struggled with a clunky, outdated system, but AdminUIUX provided a solution that was easy to adopt. The training materials and transition support were flawless, ensuring zero disruption to our workflow. Professional, reliable, and highly recommended for any enterprise solution</p>
                                    <br />
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="coverimg avatar avatar-60 rounded">
                                                <img src="assets/img/user-10.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="text-truncated mb-1">Carala Trio</h3>
                                            <p class="mb-1">Wembly, UK</p>
                                            <p class="text-secondary small">Project Manager, Console.log</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        <swiper-slide class="pb-3 width-400">
                            <mat-card class="overflow-hidden mb-4">
                                <mat-card-content class="p-lg-4">
                                    <span class="avatar avatar-50 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50">
                                            <path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)" />
                                        </svg>
                                    </span>
                                    <h3 class="mb-2">So futuristic goal achieve</h3>
                                    <p class="text-secondary">Their approach to user experience design is modern, clean, and perfectly aligned with current trends. We received overwhelmingly positive feedback from our customers on the new checkout flow. A fantastic investment that directly boosted our conversion rates</p>
                                    <br />
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="coverimg avatar avatar-60 rounded">
                                                <img src="assets/img/user-5.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="text-truncated mb-1">Amazing Person</h3>
                                            <p class="mb-1">Canada, UK</p>
                                            <p class="text-secondary small">Unknown</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        <swiper-slide class="pb-3 width-400">
                            <mat-card class="overflow-hidden mb-4">
                                <mat-card-content class="p-lg-4">
                                    <span class="avatar avatar-50 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="30.575" height="24.416" viewBox="0 0 30.575 24.416" class="w-100 opacity-50">
                                            <path id="Path_71" data-name="Path 71" d="M9.326,13.916H-2.919V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159H9.326Zm18.33,0H15.411V1.745q0-10.852,12.245-12.245v6.086q-5.939.22-6.086,6.159h6.086Z" transform="translate(2.919 10.5)" />
                                        </svg>
                                    </span>
                                    <h3 class="mb-2">We are at top in Australia</h3>
                                    <p class="text-secondary">The support team at AdminUIUX is unparalleled in responsiveness and technical expertise. They resolved a critical integration bug within hours, preventing major downtime during our peak season. Truly a partner in keeping our systems running smoothly and securely.</p>
                                    <br />
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="coverimg avatar avatar-60 rounded">
                                                <img src="assets/img/user-6.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h3 class="text-truncated mb-1">Xen Chi</h3>
                                            <p class="mb-1">AU</p>
                                            <p class="text-secondary small">Owner, carmobi world tour</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                    </swiper-container>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AboutUsComponent {
    ngAfterInit() {}
}
