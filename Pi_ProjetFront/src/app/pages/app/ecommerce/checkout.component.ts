import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatListItem, MatListModule } from "@angular/material/list";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatBadgeModule } from "@angular/material/badge";
import { MatCheckboxModule } from "@angular/material/checkbox";

@Component({
    selector: "app-checkout",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatIconModule, MatFormField, MatCheckboxModule, MatInputModule, MatSelectModule, MatBadgeModule, MatButtonModule, MatListModule, MatChipsModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-auto mb-3 mb-md-0">
                        <button matIconButton routerLink="../cart"><mat-icon class="material-icons-outlined">arrow_back</mat-icon></button>
                    </div>
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Make a Payment</h3>
                        <p class="small opacity-50">Proceed to pay for your order...</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton="filled" routerLink="/app/cart" matBadge="3" matBadgeColor="warn"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="/app/ecommerce"><mat-icon class="material-icons-outlined">storefront</mat-icon></button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 gx-lg-4 mb-3">
                                <div class="col col-md">
                                    <h4 class="mb-2">Delivery Address</h4>
                                    <p class="text-secondary">2000, Las Vegas Blvd S, The Venetian Resort, NV, Las Vegas, 89104</p>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton><mat-icon class="material-icons-outlined">edit_note</mat-icon></button>
                                </div>
                            </div>
                            <mat-divider class="mb-3"></mat-divider>
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-12 col-xl mb-3 mb-xl-0">
                                    <p class="text-secondary mb-2">Name</p>
                                    <h4 class="mb-2">AdminUIUX</h4>
                                </div>
                                <div class="col-12 col-xl mb-3 mb-xl-0">
                                    <p class="text-secondary mb-2">Email</p>
                                    <h4 class="mb-2">info@adminuiux.com</h4>
                                </div>
                                <div class="col-12 col-xl">
                                    <p class="text-secondary mb-2">Phone</p>
                                    <h4 class="mb-2">+016696696694A58</h4>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <!-- payment -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h4 class="mb-3 mb-lg-4">Credit Card Payment</h4>
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-12 col-xxl-5">
                                    <mat-form-field class="w-100" appearance="outline">
                                        <mat-label>Credit Card Number</mat-label>
                                        <input matInput />
                                    </mat-form-field>
                                </div>
                                <div class="col-12 col-xxl-5">
                                    <div class="row gx-3">
                                        <div class="col">
                                            <mat-form-field class="w-100" appearance="outline">
                                                <mat-label>Expiry Month</mat-label>
                                                <mat-select>
                                                    <mat-option value="01">01</mat-option>
                                                    <mat-option value="02">02</mat-option>
                                                    <mat-option value="03">03</mat-option>
                                                    <mat-option value="04">04</mat-option>
                                                    <mat-option value="05">05</mat-option>
                                                    <mat-option value="06">06</mat-option>
                                                    <mat-option value="07">07</mat-option>
                                                    <mat-option value="08">08</mat-option>
                                                    <mat-option value="09">09</mat-option>
                                                    <mat-option value="10">10</mat-option>
                                                    <mat-option value="11">11</mat-option>
                                                    <mat-option value="12">12</mat-option>
                                                </mat-select>
                                            </mat-form-field>
                                        </div>
                                        <div class="col">
                                            <mat-form-field class="w-100" appearance="outline">
                                                <mat-label>Expiry Year</mat-label>
                                                <mat-select>
                                                    <mat-option value="2025">2025</mat-option>
                                                    <mat-option value="2026">2026</mat-option>
                                                    <mat-option value="2027">2027</mat-option>
                                                    <mat-option value="2028" selected>2028</mat-option>
                                                    <mat-option value="2029">2029</mat-option>
                                                    <mat-option value="2030">2030</mat-option>
                                                    <mat-option value="2031">2031</mat-option>
                                                    <mat-option value="2032">2032</mat-option>
                                                </mat-select>
                                            </mat-form-field>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-xxl-2">
                                    <mat-form-field class="w-100" appearance="outline">
                                        <mat-label>CVV</mat-label>
                                        <input matInput />
                                    </mat-form-field>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h4 class="mb-3 mb-lg-4">UPI Payment</h4>
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col-12 col-lg-5">
                                    <mat-form-field class="w-100" appearance="outline">
                                        <mat-label>UPI Address</mat-label>
                                        <input matInput value="adminuiux@1upi" />
                                    </mat-form-field>
                                </div>
                                <div class="col-auto">
                                    <p class="text-theme theme-green mb-3"><mat-icon class="align-middle">check_circle</mat-icon> UPI is Valid</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                    <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-orange">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <mat-icon class="text-theme">info</mat-icon>
                                </div>
                                <div class="col">
                                    <h4 class="mb-2">Cancellation Policy</h4>
                                    <p>Please be advised that all merchandise is subject to a 5-day return policy from the date of receipt. Cancellations are not permitted once an order has entered the shipping process. Any returns outside of the specified 5-day period will not be accepted.</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-5 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
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
                        </mat-card-content>
                    </mat-card>
                    <mat-card>
                        <mat-card-content>
                            <mat-checkbox class="mb-3">By clicking this, I agree to the <a href="">Terms and Condition</a> and <a href="">Privacy Policy</a></mat-checkbox>
                            <button matButton="filled" class="w-100" routerLink="../invoice"><mat-icon class="material-icons-outlined">credit_card</mat-icon> Pay for My Order</button>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CheckoutComponent implements OnInit {
    ngOnInit() {}
}
