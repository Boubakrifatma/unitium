import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatTabsModule } from "@angular/material/tabs";
import { MatListItem, MatListModule } from "@angular/material/list";
import { IncrementorComponent } from "../../../components/incrementor/app-incrementor.component";
import { ChartData, ChartConfiguration } from "chart.js";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
import { MatBadgeModule } from "@angular/material/badge";
register();

interface Review {
    id: number;
    authorName: string;
    authorImage: string;
    date: string;
    rating: number;
    comment: string;
}

@Component({
    selector: "app-product",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatIconModule, MatTabsModule, MatBadgeModule, MatButtonModule, MatListModule, MatChipsModule, IncrementorComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">E-Commerce Shop</h3>
                        <p class="small opacity-50">Purchase from anywhere...</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton="filled" routerLink="/app/cart" matBadge="3" matBadgeColor="warn"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="../add-product"><mat-icon class="material-icons-outlined">add</mat-icon></button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in pt-3 pb-lg-3 mb-3">
            <div class="row gx-3">
                <div class="col col-md mb-3 mb-md-0"></div>
            </div>
        </div>
        <div class="container fade-in">
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <div class="row gx-3">
                        <div class="col-12 col-md-5 col-lg-4">
                            <!-- image swiper -->
                            <swiper-container class="mb-3" #swiperMain thumbs-swiper=".swiperThumbs">
                                <swiper-slide>
                                    <img src="assets/img/product1.jpg" alt="" class="w-100 rounded" />
                                </swiper-slide>
                                <swiper-slide>
                                    <img src="assets/img/product2.jpg" alt="" class="w-100 rounded" />
                                </swiper-slide>
                                <swiper-slide>
                                    <img src="assets/img/product3.jpg" alt="" class="w-100 rounded" />
                                </swiper-slide>
                                <swiper-slide>
                                    <img src="assets/img/product4.jpg" alt="" class="w-100 rounded" />
                                </swiper-slide>
                                <swiper-slide>
                                    <img src="assets/img/product5.jpg" alt="" class="w-100 rounded" />
                                </swiper-slide>
                            </swiper-container>

                            <!-- Thumbs Swiper -->
                            <swiper-container class="w-100 swiperThumbs mb-3 mb-md-0" #swiperThumbs [slidesPerView]="'auto'" [spaceBetween]="10">
                                <swiper-slide class="width-80">
                                    <div class="height-80 w-100 rounded coverimg">
                                        <img src="assets/img/product1.jpg" alt="" />
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-80">
                                    <div class="height-80 w-100 rounded coverimg">
                                        <img src="assets/img/product2.jpg" alt="" />
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-80">
                                    <div class="height-80 w-100 rounded coverimg">
                                        <img src="assets/img/product3.jpg" alt="" />
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-80">
                                    <div class="height-80 w-100 rounded coverimg">
                                        <img src="assets/img/product4.jpg" alt="" />
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="width-80">
                                    <div class="height-80 w-100 rounded coverimg">
                                        <img src="assets/img/product5.jpg" alt="" />
                                    </div>
                                </swiper-slide>
                            </swiper-container>
                        </div>
                        <div class="col">
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col">
                                    <h4 class="mb-1">Home Decor</h4>
                                    <h5 class="text-theme">Bedsheets</h5>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton class="text-theme theme-red">
                                        <span class="material-symbols-outlined"> favorite </span>
                                        <!-- <mat-icon>favorite</mat-icon> -->
                                    </button>
                                </div>
                            </div>
                            <h2 class="mb-2">Mosaic Textured Bedsheets</h2>
                            <p class="text-secondary">
                                Elevate your bedroom with our Mosaic Textured Bedsheets, featuring a visually striking and artful pattern that adds sophisticated depth and character to any decor, whether modern or traditional. Crafted from high-quality, breathable fabric like cotton or polyester, these sheets offer year-round comfort, with a soft feel that promotes restful sleep. Durable, easy-care, and designed to bring artistic flair and elegance to your space, they are the perfect choice for
                                a stylish and comfortable retreat.
                            </p>
                            <div class="row gx-3 align-items-center">
                                <div class="col mb-3 mb-lg-4">
                                    <h1 class="fw-bold mb-1">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h1>
                                    <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                                </div>
                                <div class="col-auto text-end mb-3 mb-lg-4">
                                    <h4 class="mb-0">
                                        <mat-icon class="material-icons-outlined text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-theme theme-yellow">star</mat-icon>
                                    </h4>
                                    <p><span class="text-secondary">(4.8 - 152 ratings)</span></p>
                                </div>
                            </div>
                            <h3 class="mb-3">Available offers</h3>
                            <p class="mb-2"><b>Bank Offer</b>: <span class="text-secondary">Get 10% off upto ₹50 on minimum order value of ₹250 </span><span class="text-theme">T&C</span></p>
                            <p class="mb-2"><b>Bank Offer</b>: <span class="text-secondary">5% cashback on Bank Credit Card upto ₹4,000 per statement quarter </span><span class="text-theme">T&C</span></p>
                            <p class="mb-4"><b>Bank Offer</b>: <span class="text-secondary">5% cashback on AUO Credit Card upto ₹4,000 per calendar quarter </span><span class="text-theme">T&C</span></p>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <mat-tab-group mat-stretch-tabs="false" mat-align-tabs="center">
                <mat-tab label="Description">
                    <mat-card class="my-3 mb-lg-4 mx-1">
                        <mat-card-content>
                            <h3>Key Features</h3>
                            <h4 class="mb-2">Artistic Mosaic Design:</h4>
                            <p>A captivating pattern of intersecting shapes and colors creates a sophisticated and timeless aesthetic, acting as a stunning focal point for your bedroom.</p>
                            <h4 class="mb-2">Premium Comfort:</h4>
                            <p>Made from high-quality, breathable fabrics like cotton or polyester, these sheets provide a luxuriously soft, smooth, and skin-friendly surface for a restful night's sleep.</p>
                            <h4 class="mb-2">Year-Round Versatility:</h4>
                            <p>The breathable fabric helps regulate temperature, keeping you cool in summer and cozy in winter, making them ideal for all seasons.</p>
                            <h4 class="mb-2">Durable Quality:</h4>
                            <p>Expertly stitched and crafted with durable materials, these sheets are designed to maintain their beauty and softness through multiple washes.</p>
                            <h4 class="mb-2">Easy Care & Maintenance:</h4>
                            <p>Simply machine wash in cold water on a gentle cycle to keep your bedding fresh and vibrant.</p>
                            <h4 class="mb-2">Harmonious Coordination:</h4>
                            <p>Sets include matching pillow covers, creating a cohesive and stylish look for your bedroom.</p>
                            <h4 class="mb-2">Hypoallergenic & Skin-Friendly:</h4>
                            <p>Natural fibers in cotton bedding are excellent for those with sensitive skin or allergies, resisting dust mites and mold.</p>

                            <h3>Enhance Your Bedroom</h3>
                            <h4 class="mb-2">Sophisticated Decor:</h4>
                            <p>The intricate mosaic design adds a touch of artistic charm and elegance, blending seamlessly with both contemporary and traditional room styles.</p>
                            <h4 class="mb-2">A Perfect Gift:</h4>
                            <p>With their versatile design and luxurious feel, these sheets make a thoughtful and practical gift for weddings, housewarmings, or any special occasion.</p>
                            <h4 class="mb-2">A Sanctuary of Comfort:</h4>
                            <p>Transform your bedroom into a serene and restful retreat with a bedsheet that combines beauty with exceptional comfort and ease of care.</p>
                        </mat-card-content>
                    </mat-card>
                </mat-tab>
                <mat-tab label="Review">
                    <mat-card class="my-3 mb-lg-4 mx-1">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4">
                                @for (review of reviews(); track review.id) {
                                <div class="col-12 col-md-6 col-lg-4">
                                    <mat-card class="mb-3 mb-lg-4" appearance="outlined">
                                        <!-- Author Image -->
                                        <mat-card-content>
                                            <div class="row gx-3">
                                                <div class="col-auto">
                                                    <div class="avatar avatar-80 coverimg rounded-circle">
                                                        <img [src]="review.authorImage" [alt]="review.authorName + ' profile picture'" class="w-20 h-20 rounded-full object-cover border-2 border-indigo-400 dark:border-indigo-500" />
                                                    </div>
                                                </div>

                                                <div class="col">
                                                    <!-- Author Info & Rating -->
                                                    <h3 class="mb-1">{{ review.authorName }}</h3>
                                                    <p>@for(i of [1, 2, 3, 4, 5]; track i) {<mat-icon [class.theme-yellow]="i <= review.rating" [class.opacity-25]="i > review.rating" class="text-theme">star</mat-icon>}</p>
                                                    <!-- Review Comment -->
                                                    <p class="mb-3">{{ review.comment }}</p>
                                                    <p class="text-secondary">{{ review.date }}</p>
                                                </div>
                                            </div>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                                }
                            </div>
                        </mat-card-content>
                    </mat-card>
                </mat-tab>
            </mat-tab-group>

            <div class="text-center py-3 mb-3 mb-lg-4">
                <h2 class="mb-2">Best product for your desires</h2>
                <p class="text-secondary">We are recommending you best product in category.</p>
            </div>
            <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper">
                <swiper-slide class="width-280">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image routerLink="../product" class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product2.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <h4 class="mb-2" routerLink="../product">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-3 ">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </swiper-slide>
                <swiper-slide class="width-280">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <!-- <span class="material-symbols-outlined align-middle"> favorite </span> -->
                                <mat-icon>favorite</mat-icon>
                            </button>
                        </div>
                        <div mat-card-image routerLink="../product" class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product3.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-cyan align-middle">Flat $25.00 OFF</span></p>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <h4 class="mb-2" routerLink="../product">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-3 ">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </swiper-slide>
                <swiper-slide class="width-280">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image routerLink="../product" class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product6.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <h4 class="mb-2">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-3 ">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </swiper-slide>
                <swiper-slide class="width-280">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image routerLink="../product" class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product7.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-violet align-middle">Card EMI Offer</span></p>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <h4 class="mb-2">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-3 ">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </swiper-slide>
                <swiper-slide class="width-280">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image routerLink="../product" class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product1.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-violet align-middle">Card EMI Offer</span></p>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <h4 class="mb-2" routerLink="../product">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-3 ">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col">
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </swiper-slide>
            </swiper-container>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="row gx-3 align-items-center">
                            <div class="col">
                                <mat-card-content>
                                    <p class="mb-4"><span class="badge badge-light theme-magenta">25% Offer</span></p>
                                    <p class="text-theme theme-red mb-1">Smart Watch Series</p>
                                    <h2 class="mb-1">Just at $ 999.00</h2>
                                    <p class="text-secondary small mb-4">Offer valid till 30th Dec</p>
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </div>
                            <div class="col-5">
                                <div class="height-220 w-100 coverimg rounded">
                                    <img src="assets/img/product10.png" alt="" class="d-none" />
                                </div>
                            </div>
                        </div>
                    </mat-card>
                </div>
                <div class="col-12 col-md-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="row gx-3 align-items-center">
                            <div class="col">
                                <mat-card-content>
                                    <p class="mb-4"><span class="badge badge-light theme-magenta">Flat $ 50.00 OFF</span></p>
                                    <p class="text-theme theme-red mb-1">Dress for Woman</p>
                                    <h2 class="mb-1">Now $ 210.00</h2>
                                    <p class="text-secondary small mb-4">Offer valid on App only</p>
                                    <button matButton="filled" class="theme-red"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </div>
                            <div class="col-5">
                                <div class="height-220 w-100 coverimg rounded">
                                    <img src="assets/img/product9.png" alt="" class="d-none" />
                                </div>
                            </div>
                        </div>
                    </mat-card>
                </div>
                <div class="col-12 col-md-12 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="row gx-3 align-items-center">
                            <div class="col">
                                <mat-card-content>
                                    <p class="mb-4"><span class="badge badge-light theme-magenta">25% Offer</span></p>
                                    <p class="text-theme theme-red mb-1">SmartPhone Perks</p>
                                    <h2 class="mb-1">Upto 25% Off</h2>
                                    <p class="text-secondary small mb-4">Offer valid till 30th Dec</p>
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </div>
                            <div class="col-5">
                                <div class="height-220 w-100 coverimg rounded">
                                    <img src="assets/img/product11.png" alt="" class="d-none" />
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
export class ProductComponent implements OnInit {
    reviews = signal<Review[]>([
        {
            id: 1,
            authorName: "Michael Chen",
            authorImage: "assets/img/user-4.jpg",
            date: "September 1, 2026",
            rating: 5,
            comment: "Excellent product! The quality is top-notch and it exceeded my expectations. I highly recommend it to everyone.",
        },
        {
            id: 2,
            authorName: "Sarah Johnson",
            authorImage: "assets/img/user-1.jpg",
            date: "August 28, 2026",
            rating: 4,
            comment: "Very happy with my purchase. The item works as described, although the delivery was a bit slower than expected. Overall, a great experience.",
        },
        {
            id: 3,
            authorName: "Davi Rodriguez",
            authorImage: "assets/img/user-5.jpg",
            date: "August 20, 2026",
            rating: 5,
            comment: "Fantastic! This is exactly what I was looking for. The design is sleek and the functionality is perfect. Five stars!",
        },
        {
            id: 4,
            authorName: "Emily White",
            authorImage: "assets/img/user-2.jpg",
            date: "August 15, 2026",
            rating: 3,
            comment: "It's an okay product. It does the job, but I feel like it could be more durable. The features are good, but I have some concerns about its longevity.",
        },
        {
            id: 5,
            authorName: "James Brown",
            authorImage: "assets/img/user-3.jpg",
            date: "August 10, 2026",
            rating: 5,
            comment: "Absolutely amazing! I am blown away by the quality and performance. This is the best item I've bought all year. Great value.",
        },
    ]);
    ngOnInit() {}
}
