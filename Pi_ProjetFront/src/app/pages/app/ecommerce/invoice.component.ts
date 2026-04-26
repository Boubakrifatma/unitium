import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatListItem, MatListModule } from "@angular/material/list";
import { MatBadgeModule } from "@angular/material/badge";

@Component({
    selector: "app-invoice",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatIconModule, MatBadgeModule, MatButtonModule, MatListModule, MatChipsModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Invoice - #ID00045896</h3>
                        <p class="small opacity-50">02 July 2025 10:03 AM</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="/app/ecommerce"><mat-icon class="material-icons-outlined">storefront</mat-icon></button>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="/app/ecommerce"><mat-icon class="material-icons-outlined">download</mat-icon></button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <mat-card class="bg-light-theme mb-3 theme-green">
                <mat-card-content>
                    <div class="row gx-3">
                        <div class="col-auto">
                            <mat-icon class="avatar avatar-40 text-theme theme-green" style="font-size:30px">check_circle</mat-icon>
                        </div>
                        <div class="col">
                            <h3 class="mb-1">Order Placed Successfully!</h3>
                            <p class="opacity-75">Thank you for your order with us. You will soon receive updates once package shipped.</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            <mat-card class="mb-3 overflow-hidden">
                <mat-card-header class="bg-light-theme mb-3 mb-lg-4">
                    <div class="w-100">
                        <div class="row gx-3">
                            <div class="col-12 col-md mb-3">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 rounded-circle coverimg">
                                            <img src="assets/img/logo.png" alt="" />
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h4 class="mb-2">Avnit Suppliers</h4>
                                        <p class="text-secondary small mb-1">Reg. No: 124562100366659IAM00</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-6 col-md-auto px-lg-4 mb-3">
                                <p class="text-secondary small mb-2">Date of Issue</p>
                                <h4>02/07/2025</h4>
                            </div>
                            <div class="col-6 col-md-auto px-lg-4 mb-3">
                                <p class="text-secondary small mb-2">Date of Order</p>
                                <h4>01/07/2025</h4>
                            </div>
                            <div class="col-6 col-md-auto px-lg-4 mb-3">
                                <p class="text-secondary small mb-2">Invoice ID</p>
                                <h4>ID00045896</h4>
                            </div>
                            <div class="col-6 col-md-auto px-lg-4 mb-3">
                                <p class="text-secondary small mb-2">Payment</p>
                                <span class="badge theme-green">Paid</span> Credit Card
                            </div>
                        </div>
                    </div>
                </mat-card-header>
                <mat-card-content>
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-sm mb-3 mb-lg-4">
                            <div class="row gx-3 mb-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 rounded-circle coverimg">
                                        <img src="assets/img/product5.jpg" alt="" />
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="text-secondary small mb-1">Name</p>
                                    <h4>AdminUIUX</h4>
                                </div>
                            </div>

                            <div class="row gx-3 gx-lg-4">
                                <div class="col-6 col-sm-12 mb-3">
                                    <p class="text-secondary small mb-1">Email</p>
                                    <h4>info@adminuiux.com</h4>
                                </div>
                                <div class="col-6 col-sm-12 mb-3">
                                    <p class="text-secondary small mb-1">Phone</p>
                                    <h4>+016696696694A58</h4>
                                </div>
                            </div>

                            <p class="text-secondary small mb-1">Delivery Address</p>
                            <h4 class="mb-3">
                                2000, Las Vegas Blvd S, The Venetian Resort,<br />
                                NV, Las Vegas, 89104
                            </h4>
                        </div>
                        <div class="col-12 col-sm text-md-end mb-3 mb-lg-4">
                            <div class="row gx-3 mb-3">
                                <div class="col order-2 order-md-1">
                                    <p class="text-secondary small mb-1">Seller</p>
                                    <h4>Avnit Suppliers</h4>
                                </div>
                                <div class="col-auto order-1 order-md-2">
                                    <div class="avatar avatar-40 rounded-circle coverimg">
                                        <img src="assets/img/product1.jpg" alt="" />
                                    </div>
                                </div>
                            </div>

                            <div class="row gx-3 gx-lg-4">
                                <div class="col-6 col-sm-12 mb-3">
                                    <p class="text-secondary small mb-1">Seller Email</p>
                                    <h4>info@adminuiux.com</h4>
                                </div>
                                <div class="col-6 col-sm-12 mb-3">
                                    <p class="text-secondary small mb-1">Seller Phone</p>
                                    <h4>+016696696694A58</h4>
                                </div>
                            </div>

                            <p class="text-secondary small mb-1">Seller Address</p>
                            <h4 class="mb-3">
                                2456, Kans clad Blvd S, The Arvindo Resort,<br />
                                NV, Las Vegas, 89104
                            </h4>
                        </div>
                    </div>
                    <mat-divider class="mb-2"></mat-divider>
                    <div class="row gx-3 mb-2">
                        <div class="col fw-bold">Name</div>
                        <div class="col fw-bold">Quantity</div>
                        <div class="col fw-bold">Price</div>
                        <div class="col-auto fw-bold">Amount</div>
                    </div>
                    <mat-divider class="mb-3"></mat-divider>

                    <!-- product list -->
                    <div class="row gx-3 mb-3">
                        <div class="col">Mosaic Textured Bedsheets</div>
                        <div class="col">1</div>
                        <div class="col">$ 250.00</div>
                        <div class="col-auto fw-bold">$ 200.00</div>
                    </div>
                    <div class="row gx-3 mb-3">
                        <div class="col">Multi Color curtains</div>
                        <div class="col">1</div>
                        <div class="col">$ 250.00</div>
                        <div class="col-auto fw-bold">$ 250.00</div>
                    </div>
                    <mat-divider class="mb-3"></mat-divider>
                    <div class="row gx-3 mb-3">
                        <div class="col text-secondary">Subtotal</div>
                        <div class="col-auto fw-bold ">$ 450.00</div>
                    </div>

                    <!-- discounts, Fees and offers -->
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
                        <div class="col"><h3>Total</h3></div>
                        <div class="col-auto"><h3>$ 300.00</h3></div>
                    </div>
                    <mat-divider class="mb-3"></mat-divider>
                    <br /><br /><br />
                    <p class="text-secondary small mb-1">Thank you for shopping with us</p>

                    <div class="row gx-3 mb-3">
                        <div class="col"></div>
                        <div class="col-auto text-end">
                            <p class="text-secondary small mb-1">Signature</p>
                            <h4>AdminUIUX</h4>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class InvoiceComponent implements OnInit {
    ngOnInit() {}
}
