import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatListItem, MatListModule } from "@angular/material/list";
import { MatBadgeModule } from "@angular/material/badge";
import { IncrementorComponent } from "../../../components/incrementor/app-incrementor.component";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();

@Component({
    selector: "app-ecommerce",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatIconModule, MatBadgeModule, MatButtonModule, MatListModule, MatChipsModule, IncrementorComponent],
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

        <div class="container fade-in">
            <swiper-container slides-per-view="1.2" space-between="20px" autoplay="true" class="swiper">
                <swiper-slide>
                    <div class="row gx-3 align-items-center z-index-1 position-relative">
                        <div class="col-12 col-lg-6 col-xxl-8 text-white">
                            <mat-card class="bg-theme text-white overflow-hidden mb-3 mb-lg-4">
                                <mat-card-content class="p-lg-4 p-xxl-5 position-relative">
                                    <div class="position-absolute top-0 start-0 h-100 w-100 coverimg opacity-25 z-index-0">
                                        <img src="assets/img/background2.jpg" alt="" class="d-none" />
                                    </div>
                                    <div class="position-relative z-index-1">
                                        <p class="mb-3"><mat-icon class="align-middle me-2">redeem</mat-icon> Grab the right offer now</p>
                                        <h2 class="mb-3">Best Winter Collection</h2>
                                        <h3>Limited-Time Offers: "Flash Sale for a Last Chance to Save"</h3>
                                        <p class="opacity-75 mb-3 mb-lg-5">Collection that never before you have seen and best in class designs. Overall for kids and adult, men and women all kind of extra delightful collection.</p>
                                        <button matButton="filled" color="" class="theme-red"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Shop Now</button>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-lg-6 col-xxl-4 ms-auto">
                            <mat-card class="mb-3 mb-lg-4 w-100">
                                <mat-card-content>
                                    <p class="text-theme theme-red mb-1">From the Bestseller</p>
                                    <h2>Saving upto 20%</h2>
                                </mat-card-content>
                                <mat-list>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                            <img src="assets/img/product1.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle>Mosaic Textured Bedsheets</span>
                                        <span matListItemLine class="fw-bold">$ 152.00 <s class="text-secondary fw-normal">$180.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                            <span class="text-secondary"> 152 ratings</span>
                                        </span>
                                    </mat-list-item>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                            <img src="assets/img/product6.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle>Apparels that shine</span>
                                        <span matListItemLine class="fw-bold">$ 80.00 <s class="text-secondary fw-normal">$ 120.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star_half</mat-icon>

                                            <span class="text-secondary"> 189 ratings</span>
                                        </span>
                                    </mat-list-item>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                            <img src="assets/img/product3.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle>Window Curtains</span>
                                        <span matListItemLine class="fw-bold">$ 135.00 <s class="text-secondary fw-normal">$ 144.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                            <span class="text-secondary"> 35 ratings</span>
                                        </span>
                                    </mat-list-item>
                                </mat-list>
                            </mat-card>
                        </div>
                    </div>
                </swiper-slide>
                <swiper-slide>
                    <div class="row gx-3 align-items-center z-index-1 position-relative">
                        <div class="col-12 col-lg-6 col-xxl-8 text-white">
                            <mat-card class="mb-3 mb-lg-4 bg-theme text-white overflow-hidden theme-violet">
                                <mat-card-content class="p-lg-4 p-xxl-5 position-relative">
                                    <div class="position-absolute top-0 start-0 h-100 w-100 coverimg opacity-25 z-index-0">
                                        <img src="assets/img/background1.jpg" alt="" class="d-none" />
                                    </div>
                                    <div class="position-relative z-index-1">
                                        <p class="mb-3"><mat-icon class="align-middle me-2">redeem</mat-icon> Grab the right offer now</p>
                                        <h2 class="mb-3">Cool Summer Collection</h2>
                                        <h3>Limited-Time Offers that makes more sense</h3>
                                        <p class="opacity-75 mb-3 mb-lg-5">Collection that never before you have seen and best in class designs. Overall for kids and adult, men and women all kind of extra delightful collection.</p>
                                        <button matButton="filled" color="" class="theme-red"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Shop Now</button>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-lg-6 col-xl-4 ms-auto">
                            <mat-card class="mb-3 mb-lg-4 w-100">
                                <mat-card-content>
                                    <p class="text-theme theme-red mb-1">Popular in your town</p>
                                    <h2>Saving upto 35%</h2>
                                </mat-card-content>
                                <mat-list>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg" routerLink="../product">
                                            <img src="assets/img/product1.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle routerLink="../product">Mosaic Textured Bedsheets</span>
                                        <span matListItemLine class="fw-bold">$ 152.00 <s class="text-secondary fw-normal">$180.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                            <span class="text-secondary"> 152 ratings</span>
                                        </span>
                                    </mat-list-item>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg" routerLink="../product">
                                            <img src="assets/img/product6.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle routerLink="../product">Apparels that shine</span>
                                        <span matListItemLine class="fw-bold">$ 80.00 <s class="text-secondary fw-normal">$ 120.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star_half</mat-icon>

                                            <span class="text-secondary"> 189 ratings</span>
                                        </span>
                                    </mat-list-item>
                                    <mat-list-item>
                                        <div matListItemIcon class="avatar avatar-60 rounded coverimg" routerLink="../product">
                                            <img src="assets/img/product3.jpg" alt="" />
                                        </div>
                                        <span matListItemTitle routerLink="../product">Window Curtains</span>
                                        <span matListItemLine class="fw-bold">$ 135.00 <s class="text-secondary fw-normal">$ 144.00</s></span>
                                        <span matListItemLine>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                            <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>

                                            <span class="text-secondary"> 35 ratings</span>
                                        </span>
                                    </mat-list-item>
                                </mat-list>
                            </mat-card>
                        </div>
                    </div>
                </swiper-slide>
            </swiper-container>

            <swiper-container slides-per-view="auto" space-between="10px" autoplay="true" class="swiper text-center">
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <mat-card class="text-theme avatar avatar-80 rounded mx-auto mb-2">
                            <mat-icon class="material-icons-outlined my-2">dataset</mat-icon>
                        </mat-card>
                        <p class="text-secondary small">All</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category1.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Decor</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category2.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Jewelry</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category3.jpg" alt="" />
                        </div>
                        <p class="text-secondary small text-truncated">Appliances</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category4.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Mobile</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category5.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Grocery</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category6.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Kitchen</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category7.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Watch</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category8.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Offers</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category9.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Games</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category10.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Men</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/user-2.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Women</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <div class="text-theme avatar avatar-80 rounded mx-auto mb-2 coverimg">
                            <img src="assets/img/category12.jpg" alt="" />
                        </div>
                        <p class="text-secondary small">Kids</p>
                    </div>
                </swiper-slide>
                <swiper-slide class="width-90">
                    <div class="mb-3 mb-lg-4 mx-1">
                        <mat-card class="text-theme avatar avatar-80 rounded mx-auto mb-2">
                            <mat-icon class="material-icons-outlined my-2">more_horiz</mat-icon>
                        </mat-card>
                        <p class="text-secondary small">Other</p>
                    </div>
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

            <div class="text-center py-3 mb-3 mb-lg-4">
                <h2 class="mb-2">Top Trending products for you</h2>
                <p class="text-secondary">Get the most loved and demanded products.</p>
            </div>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product4.jpg" alt="" />
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <!-- <span class="material-symbols-outlined align-middle"> favorite </span> -->
                                <mat-icon>favorite</mat-icon>
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product5.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-cyan align-middle">Flat $25.00 OFF</span></p>
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product1.jpg" alt="" />
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>
                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product2.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-blue align-middle">Bank Offer</span></p>
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>

                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <div class="position-absolute top-0 end-0 m-3 z-index-1">
                            <button matMiniFab class="text-theme theme-red">
                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                <!-- <mat-icon>favorite</mat-icon> -->
                            </button>
                        </div>
                        <div mat-card-image class="height-180 w-100 rounded coverimg mb-3">
                            <img src="assets/img/product3.jpg" alt="" />
                        </div>
                        <mat-card-content>
                            <p><span class="badge badge-light theme-magenta align-middle">20% OFF</span></p>
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
                                <div class="col-auto">
                                    <button matIconButton class="text-theme">
                                        <span class="material-symbols-outlined"> keyboard_arrow_right </span>
                                    </button>
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
                </div>

                <div class="col-12 col-lg-6 col-xl-4 col-xxl-3">
                    <mat-card class="bg-light-theme text-center mb-3 mb-lg-4 theme-orange">
                        <mat-card-content>
                            <img src="assets/img/product11.png" class="height-160 mb-3" alt="" />
                            <p class="mb-4"><span class="badge theme-magenta">25% Offer</span></p>
                            <p class="text-theme theme-red mb-1">SmartPhone Perks</p>
                            <h2 class="mb-1">Upto 25% Off</h2>
                            <p class="text-secondary small mb-4">Offer valid till 30th Dec</p>
                            <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            <div class="text-center py-3 mb-3 mb-lg-4">
                <h2 class="mb-2">
                    Best Products that makes<br />
                    you feel alive
                </h2>
                <p class="text-secondary">User experience matters at when you feel good at.</p>
            </div>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 col-xxl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="h-100 width-100 rounded coverimg" routerLink="../product">
                                        <img src="assets/img/product1.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3" routerLink="../product">Mosaic Textured Bedsheets</h4>
                                    <h3 class="fw-bold mb-2">$ 152.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 152 ratings</span>
                                    </p>
                                    <div class="row gx-1">
                                        <div class="col">
                                            <button matIconButton class="text-theme theme-red">
                                                <span class="material-symbols-outlined"> favorite </span>
                                                <!-- <mat-icon>favorite</mat-icon> -->
                                            </button>
                                        </div>
                                        <div class="col-auto">
                                            <app-incrementor></app-incrementor>
                                        </div>
                                        <div class="col-auto">
                                            <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xxl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="h-100 width-100 rounded coverimg" routerLink="../product">
                                        <img src="assets/img/product2.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3" routerLink="../product">Apparels that shines</h4>
                                    <h3 class="fw-bold mb-2">$ 80.00 <s class="text-secondary fw-normal">$ 90.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star_half</mat-icon>
                                        <span class="text-secondary"> 35 ratings</span>
                                    </p>
                                    <div class="row gx-1">
                                        <div class="col">
                                            <button matIconButton class="text-theme theme-red">
                                                <span class="material-symbols-outlined"> favorite </span>
                                                <!-- <mat-icon>favorite</mat-icon> -->
                                            </button>
                                        </div>
                                        <div class="col-auto">
                                            <app-incrementor></app-incrementor>
                                        </div>
                                        <div class="col-auto">
                                            <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-6 col-xxl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="h-100 width-100 rounded coverimg" routerLink="../product">
                                        <img src="assets/img/product3.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3" routerLink="../product">Lovely shades</h4>
                                    <h3 class="fw-bold mb-2">$ 198.00 <s class="text-secondary fw-normal">$ 220.00</s></h3>
                                    <p>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <mat-icon class="material-icons-outlined text-sm text-theme theme-yellow">star</mat-icon>
                                        <span class="text-secondary"> 124 ratings</span>
                                    </p>
                                    <div class="row gx-1">
                                        <div class="col">
                                            <button matIconButton class="text-theme theme-red">
                                                <!--<span class="material-symbols-outlined"> favorite </span> -->
                                                <mat-icon>favorite</mat-icon>
                                            </button>
                                        </div>
                                        <div class="col-auto">
                                            <app-incrementor></app-incrementor>
                                        </div>
                                        <div class="col-auto">
                                            <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EcommerceComponent implements OnInit {
    ngOnInit() {}
}
