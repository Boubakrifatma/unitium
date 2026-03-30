import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatDivider, MatListItem, MatListModule } from "@angular/material/list";
import { IncrementorComponent } from "../../../components/incrementor/app-incrementor.component";
import { MatBadgeModule } from "@angular/material/badge";
@Component({
    selector: "app-cart",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatDivider, MatIconModule, MatBadgeModule, MatButtonModule, MatListModule, MatChipsModule, IncrementorComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Your Cart</h3>
                        <p class="small opacity-50">Finalize and review summary...</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton="filled" routerLink="/app/cart" matBadge="3" matBadgeColor="warn"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="../checkout"><mat-icon class="material-icons-outlined">credit_card</mat-icon></button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 gx-lg-4">
                                <div class="col col-md">
                                    <h4 class="mb-2">Delivery Address</h4>
                                    <p class="text-secondary">2000, Las Vegas Blvd S, The Venetian Resort, NV, Las Vegas, 89104</p>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton><mat-icon class="material-icons-outlined">edit_note</mat-icon></button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <!-- cart item -->

                    <mat-card class="mb-3">
                        <mat-card-content>
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-auto">
                                    <div class="height-120 w-100 rounded coverimg mb-3 position-relative">
                                        <img src="assets/img/product1.jpg" alt="" />
                                        <div class="position-absolute top-0 end-0 m-2 z-index-1">
                                            <button matMiniFab class="text-theme theme-red">
                                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                                <!-- <mat-icon>favorite</mat-icon> -->
                                            </button>
                                        </div>
                                    </div>
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col col-lg col-xl">
                                    <div class="row gx-3">
                                        <div class="col-12 col-md mb-3 mb-md-0">
                                            <h4 class="mb-2">Mosaic Textured Bedsheets</h4>
                                            <p class="text-secondary small">Seller: Avnit Suppliers</p>

                                            <h3 class="fw-bold mb-2">$ 150.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                            <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                                        </div>
                                        <div class="col-12 col-md">
                                            <p class="mb-2">
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                            </p>
                                            <span class="ms-1 align-middle text-secondary">4.2 - 165 Review</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-md-auto position-relative">
                                    <button matButton class="theme-red"><mat-icon>delete</mat-icon> Remove</button>
                                    <button matButton><mat-icon>schedule</mat-icon> Save for later</button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="mb-3">
                        <mat-card-content>
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-auto">
                                    <div class="height-120 w-100 rounded coverimg mb-3 position-relative">
                                        <img src="assets/img/product3.jpg" alt="" />
                                        <div class="position-absolute top-0 end-0 m-2 z-index-1">
                                            <button matMiniFab class="text-theme theme-red">
                                                <span class="material-symbols-outlined align-middle"> favorite </span>
                                                <!-- <mat-icon>favorite</mat-icon> -->
                                            </button>
                                        </div>
                                    </div>
                                    <app-incrementor></app-incrementor>
                                </div>
                                <div class="col col-lg col-xl">
                                    <div class="row gx-3">
                                        <div class="col-12 col-md mb-3 mb-md-0">
                                            <h4 class="mb-2">Mosaic Textured Bedsheets</h4>
                                            <p class="text-secondary small">Seller: Avnit Suppliers</p>

                                            <h3 class="fw-bold mb-2">$ 150.00 <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                            <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                                        </div>
                                        <div class="col-12 col-md">
                                            <p class="mb-2">
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                                <mat-icon class="text-theme theme-yellow align-middle">star</mat-icon>
                                            </p>
                                            <span class="ms-1 align-middle text-secondary">4.2 - 165 Review</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-md-auto position-relative">
                                    <button matButton class="theme-red"><mat-icon>delete</mat-icon> Remove</button>
                                    <button matButton><mat-icon>schedule</mat-icon> Save for later</button>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-4">
                    <mat-card>
                        <mat-card-header class="mb-3">
                            <h4>Price Total</h4>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="row gx-3 mb-3">
                                <div class="col text-secondary">Price</div>
                                <div class="col-auto fw-bold">$ 450.00</div>
                            </div>
                            <div class="row gx-3 mb-3">
                                <div class="col text-secondary">Discount</div>
                                <div class="col-auto fw-bold text-theme theme-green">- $ 100.00</div>
                            </div>
                            <div class="row gx-3 mb-3">
                                <div class="col text-secondary">Coupon/Bank Offer</div>
                                <div class="col-auto fw-bold text-theme theme-green">- $ 50.00</div>
                            </div>
                            <div class="row gx-3 mb-3">
                                <div class="col text-secondary">Platform Fee</div>
                                <div class="col-auto fw-bold">$ 0.00</div>
                            </div>

                            <mat-divider class="mb-3"></mat-divider>

                            <div class="row gx-3 mb-3">
                                <div class="col text-secondary"><h3>Total</h3></div>
                                <div class="col-auto"><h3>$ 300.00</h3></div>
                            </div>
                            <mat-divider class="mb-3"></mat-divider>

                            <h4 class="text-theme theme-green">You will save $150 on this order</h4>

                            <button matButton="filled" class="w-100" routerLink="../checkout"><mat-icon class="material-icons-outlined">credit_card</mat-icon> Checkout</button>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="text-center py-3 mb-3 mb-lg-4">
                <h2 class="mb-2">
                    You have few items,<br />
                    saved for later
                </h2>
                <p class="text-secondary">Add product to cart for checkout.</p>
            </div>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 col-xxl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="h-100 width-100 rounded coverimg">
                                        <img src="assets/img/product1.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3">Mosaic Textured Bedsheets</h4>
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
                                    <div class="h-100 width-100 rounded coverimg">
                                        <img src="assets/img/product2.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3">Apparels that shines</h4>
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
                                    <div class="h-100 width-100 rounded coverimg">
                                        <img src="assets/img/product3.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 class="mb-3">Lovely shades</h4>
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
export class CartComponent implements OnInit {
    ngOnInit() {}
}
