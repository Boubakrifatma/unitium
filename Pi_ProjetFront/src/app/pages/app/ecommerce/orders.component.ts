import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { PageRightComponent } from "../../../components/page-right/pageright.component";
import { CreateEditOrderModal } from "./orderdetails.component";
import { PolarAreaChartjs180Component } from "../../../components/charts/polararea-chartjs-180.component";
declare const jsVectorMap: any;

export interface TableItem {
    Product: string;
    Category: string;
    Price: string;
    OrderBy: string;
    Email: string;
    Date: string;
    Status: string;
    DeliverTo: string;
    Address: string;
    Location: string;
    Payment: string;
    productImage: string;
    Time: string;
    SKU: string;
    SubCategory: string;
    Currency: string;
}

@Component({
    selector: "app-orders",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatSortModule, MatChipsModule, MatProgressBarModule, PageRightComponent, PolarAreaChartjs180Component],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Orders</h3>
                        <p class="small opacity-50">Monitor your sales activity</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <app-page-right></app-page-right>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <!-- order overview -->
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                        <mat-icon class="material-icons-outlined">assignment</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Processed</p>
                                    <h3>135</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                                        <mat-icon class="material-icons-outlined">add_shopping_cart</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Booked</p>
                                    <h3>523</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                                        <mat-icon class="material-icons-outlined">remove_shopping_cart</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Rejected</p>
                                    <h3>13</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                                        <mat-icon class="material-icons-outlined">location_on</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Delivered</p>
                                    <h3>6521</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="row gx-3 gx-lg-4">
                <!-- Orders -->
                <div class="col-12 col-md-12 position-relative">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">storefront</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3">
                                        <h3 class="mb-1">Orders</h3>
                                        <p class="text-secondary small">All in orders items</p>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                                        <mat-form-field appearance="outline" class="w-100 inline-small">
                                            <mat-label>Search</mat-label>
                                            <mat-icon matPrefix>search</mat-icon>
                                            <input matInput placeholder="Search" (keyup)="applyFilter($event)" #searchinput />
                                        </mat-form-field>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>

                        <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">
                            <!-- Product Column -->
                            <ng-container matColumnDef="product">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Product</th>
                                <td mat-cell *matCellDef="let item" class="py-2" (click)="openDialog(item)">
                                    <p class="mat-mobile-label">Product</p>
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded">
                                                <img [src]="item.productImage" alt="{{ item.Product }}" class="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-0">{{ item.Product }} <mat-icon class="material-icons-outlined text-sm text-theme">edit</mat-icon></h4>
                                            <p class="text-secondary small">{{ item.SKU }}</p>
                                        </div>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Category Column -->
                            <ng-container matColumnDef="category">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Category</th>
                                <td mat-cell *matCellDef="let item" class="">
                                    <p class="mat-mobile-label">Category</p>
                                    <div>
                                        <p class="mb-0">{{ item.Category }}</p>
                                        <p class="text-secondary small">{{ item.SubCategory }}</p>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- delivery Column -->
                            <ng-container matColumnDef="deliverTo">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Delivery</th>
                                <td mat-cell *matCellDef="let item" class="">
                                    <p class="mat-mobile-label">Delivery</p>
                                    <div>
                                        <p class="mb-0">{{ item.Address }}</p>
                                        <p class="text-secondary small">{{ item.DeliverTo }}</p>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Price Column -->
                            <ng-container matColumnDef="price">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Price</th>
                                <td mat-cell *matCellDef="let item" class="">
                                    <p class="mat-mobile-label">Price</p>
                                    <div>
                                        <h4 class="mb-0">{{ item.Price }}</h4>
                                        <p class="text-secondary small">{{ item.Currency }}</p>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Status Column -->
                            <ng-container matColumnDef="status">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Status</th>
                                <td mat-cell *matCellDef="let item" class=" ">
                                    <p class="mat-mobile-label">Status</p>
                                    <div>
                                        <span
                                            class="badge badge-light"
                                            [ngClass]="{
                                                'theme-green': item.Status === 'Delivered',
                                                'theme-orange': item.Status === 'Processing' || item.Status === 'Waiting',
                                                'theme-red': item.Status === 'Cancelled'
                                            }">
                                            {{ item.Status }}
                                        </span>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Payment Column -->
                            <ng-container matColumnDef="payment">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Payment</th>
                                <td mat-cell *matCellDef="let item" class="">
                                    <p class="mat-mobile-label">Payment</p>
                                    <div>
                                        <span
                                            class="badge"
                                            [ngClass]="{
                                                'theme-green': item.Payment === 'Paid',
                                                'theme-orange': item.Payment === 'Waiting',
                                                'theme-red': item.Payment === 'Cancelled'
                                            }">
                                            {{ item.Payment }}
                                        </span>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Actions Column -->
                            <ng-container matColumnDef="actions">
                                <th mat-header-cell *matHeaderCellDef>Actions</th>
                                <td mat-cell *matCellDef="let item" class="">
                                    <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                        <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                    </button>
                                    <mat-menu #actionsMenu="matMenu">
                                        <button mat-menu-item (click)="openDialog(item)">
                                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                                            <span>Edit</span>
                                        </button>
                                        <button mat-menu-item (click)="deleteOrder(item)">
                                            <mat-icon class="material-icons-outlined">delete</mat-icon>
                                            <span>Delete</span>
                                        </button>
                                    </mat-menu>
                                </td>
                            </ng-container>

                            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                        </table>

                        <mat-card-content>
                            <!-- Paginator -->
                            <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of orders" class="bg-none"></mat-paginator>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- sales overview -->
            <h3 class="mb-1">Sales Overview</h3>
            <p class="text-secondary mb-3 mb-lg-4">Create future forward with detailed data</p>
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                        <mat-icon class="material-icons-outlined">shopping_cart</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Total Sales</p>
                                    <h3>320</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                                        <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Revenue</p>
                                    <h3>$ 50.0K</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                                        <mat-icon class="material-icons-outlined">paid</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Cost</p>
                                    <h3>$ 36.85K</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                                        <mat-icon class="material-icons-outlined">trending_up</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <p class="small text-secondary mb-1">Profit</p>
                                    <h3>$ 1.31K</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4 w-100">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                            <mat-icon class="material-icons-outlined">local_mall</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-1">Top Selling</h3>
                                        <p class="small text-secondary">Get stock in</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-list>
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
                <!-- Demanded Categories -->
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                            <mat-icon class="material-icons-outlined">star</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-1">Top Categories</h3>
                                        <p class="small text-secondary">Popular in selling</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="my-3 text-center">
                                <app-polararea-chartjs-180 class="avatar avatar-200 mx-auto"></app-polararea-chartjs-180>
                            </div>
                            <div class="row gx-3">
                                <div class="col-12 mb-3">
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 bg-light-theme text-theme rounded theme-yellow">
                                                <mat-icon class="material-icons-outlined">child_care</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">40%</h4>
                                            <p class="small text-secondary">Kids Play</p>
                                        </div>
                                        <div class="col text-end">
                                            <h4 class="mb-1">254k</h4>
                                            <p class="small text-secondary">Units</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 mb-3">
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 bg-light-theme text-theme rounded theme-green">
                                                <mat-icon class="material-icons-outlined">widgets </mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">10%</h4>
                                            <p class="small text-secondary">Tools</p>
                                        </div>
                                        <div class="col text-end">
                                            <h4 class="mb-1">325k</h4>
                                            <p class="small text-secondary">Units</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 mb-3">
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 bg-light-theme text-theme rounded theme-red">
                                                <mat-icon class="material-icons-outlined">tv</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">15%</h4>
                                            <p class="small text-secondary">Electronics</p>
                                        </div>
                                        <div class="col text-end">
                                            <h4 class="mb-1">161k</h4>
                                            <p class="small text-secondary">Units</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 mb-0">
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded bg-light-theme text-theme theme-blue">
                                                <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">house</mat-icon>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">25%</h4>
                                            <p class="small text-secondary">Decorative</p>
                                        </div>
                                        <div class="col text-end">
                                            <h4 class="mb-1">125k</h4>
                                            <p class="small text-secondary">Units</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- top buyer -->
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4 w-100">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                            <mat-icon class="material-icons-outlined">person</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-1">Top Buyer</h3>
                                        <p class="small text-secondary">Share offers & discounts</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-list>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                    <img src="assets/img/user-1.jpg" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>John Doe</span>
                                <span matListItemLine class="fw-bold">$ 1,070.77</span>
                                <span matListItemLine><span class="text-secondary">243 Units</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                    <img src="assets/img/user-2.jpg" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>Jenny D'Souza</span>
                                <span matListItemLine class="fw-bold">$ 1,030.77</span>
                                <span matListItemLine><span class="text-secondary">141 Units</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                    <img src="assets/img/user-3.jpg" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>Almandra</span>
                                <span matListItemLine class="fw-bold">$ 1,530.50</span>
                                <span matListItemLine><span class="text-secondary">120 Units</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                    <img src="assets/img/user-4.jpg" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>Monty Alberto</span>
                                <span matListItemLine class="fw-bold">$ 848.24</span>
                                <span matListItemLine><span class="text-secondary">100 Units</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-60 rounded coverimg">
                                    <img src="assets/img/user-5.jpg" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>Jackson Pvt. Ltd.</span>
                                <span matListItemLine class="fw-bold">$ 3750.00</span>
                                <span matListItemLine><span class="text-secondary">800 Units</span></span>
                            </mat-list-item>
                        </mat-list>
                    </mat-card>
                </div>
                <!-- top countries -->
                <div class="col-12 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                            <mat-icon class="material-icons-outlined">star</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h3 class="mb-1">Top Country</h3>
                                        <p class="small text-secondary">Popular buyers country</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div id="jsvectormap" class="w-100 height-180"></div>
                        </mat-card-content>
                        <mat-list>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-40 rounded coverimg">
                                    <img src="assets/img/english.png" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>USA</span>
                                <span matListItemLine class="fw-bold">$ 2,470.77 <span class="text-secondary">(243 Units)</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-40 rounded coverimg">
                                    <img src="assets/img/france.png" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>France</span>
                                <span matListItemLine class="fw-bold">$ 3,030.77 <span class="text-secondary">(141 Units)</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-40 rounded coverimg">
                                    <img src="assets/img/german.png" class="w-100" alt="" />
                                </div>
                                <span matListItemTitle>Almandra</span>
                                <span matListItemLine class="fw-bold">$ 3,130.50 <span class="text-secondary">(120 Units)</span></span>
                            </mat-list-item>
                            <mat-list-item>
                                <div matListItemIcon class="avatar avatar-40 rounded bg-light-theme theme-blue">
                                    <h5 class="text-theme">OT</h5>
                                </div>
                                <span matListItemTitle>Other</span>
                                <span matListItemLine class="fw-bold">$ 7,850.50 <span class="text-secondary">(450 Units)</span></span>
                            </mat-list-item>
                        </mat-list>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OrdersComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

    // table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    originalTabledata: TableItem[] = [
        {
            Product: "Shoes",
            Category: "Accessories",
            Price: "123.00",
            OrderBy: "Anant Rai",
            Email: "anant@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "John Johnson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613 This can be a map also",
            Payment: "Paid",
            productImage: "assets/img/product1.jpg",
            SKU: "SKUID: SH02521",
            SubCategory: "Men Shoes",
            Currency: "USD",
        },
        {
            Product: "Timex 0214 Watch",
            Category: "Accessories",
            Price: "154.00",
            OrderBy: "Jenny Jackson",
            Email: "jenny@gmailtestid.com",
            Date: "20-1-2022",
            Time: "10:05 am",
            Status: "Processing",
            DeliverTo: "Mirae Jackson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Paid",
            productImage: "assets/img/product2.jpg",
            SKU: "SKUID: SH02631",
            SubCategory: "Watch",
            Currency: "USD",
        },
        {
            Product: "FOGG",
            Category: "Extras",
            Price: "100.00",
            OrderBy: "Millie Danial",
            Email: "millie@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "Mark Danial",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Waiting",
            productImage: "assets/img/product3.jpg",
            SKU: "SKUID: SH03560",
            SubCategory: "Men Deo",
            Currency: "USD",
        },
        {
            Product: "Room Heater Hewells",
            Category: "Appliances",
            Price: "658.00",
            OrderBy: "Nick Vedhaa",
            Email: "vedhaa@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Cancelled",
            DeliverTo: "Micky Nick",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Cancelled",
            productImage: "assets/img/product4.jpg",
            SKU: "SKUID: RH03674",
            SubCategory: "Room Heater",
            Currency: "USD",
        },
        {
            Product: "Shoes",
            Category: "Accessories",
            Price: "685.00",
            OrderBy: "John Johnson",
            Email: "john@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Processing",
            DeliverTo: "John Johnson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Processing",
            productImage: "assets/img/product5.jpg",
            SKU: "SKUID: SH06581",
            SubCategory: "Men Shoes",
            Currency: "USD",
        },
        {
            Product: "Shoes",
            Category: "Accessories",
            Price: "685.00",
            OrderBy: "John Johnson",
            Email: "john@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "John Johnson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Processing",
            productImage: "assets/img/product1.jpg",
            SKU: "SKUID: SH06581",
            SubCategory: "Men Shoes",
            Currency: "USD",
        },
        {
            Product: "Shoes",
            Category: "Accessories",
            Price: "123.00",
            OrderBy: "John Johnson",
            Email: "john@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "John Johnson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Paid",
            productImage: "assets/img/product2.jpg",
            SKU: "SKUID: SH02631",
            SubCategory: "Men Shoes",
            Currency: "USD",
        },
        {
            Product: "Timex 0214 Watch",
            Category: "Accessories",
            Price: "154.00",
            OrderBy: "Mirae Jackson",
            Email: "mirae@gmailtestid.com",
            Date: "20-1-2022",
            Time: "10:05 am",
            Status: "Delivered",
            DeliverTo: "Mirae Jackson",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Paid",
            productImage: "assets/img/product3.jpg",
            SKU: "SKUID: SH02521",
            SubCategory: "Watch",
            Currency: "USD",
        },
        {
            Product: "FOGG",
            Category: "Extras",
            Price: "100.00",
            OrderBy: "Millie Danial",
            Email: "millie@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "Mark Danial",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Waiting",
            productImage: "assets/img/product4.jpg",
            SKU: "SKUID: SH03560",
            SubCategory: "Men Deo",
            Currency: "USD",
        },
        {
            Product: "Room Heater Hewells",
            Category: "Appliances",
            Price: "658.00",
            OrderBy: "Nick Vedhaa",
            Email: "vedhaa@gmailtestid.com",
            Date: "20-1-2022",
            Time: "9:00 am",
            Status: "Delivered",
            DeliverTo: "Micky Nick",
            Address: "2356, Street-5, New York 4586, US",
            Location: "Lat: 5.678167, Long: 12.078613This can be a map also",
            Payment: "Cancelled",
            productImage: "assets/img/product5.jpg",
            SKU: "SKUID: RH03674",
            SubCategory: "Room Heater",
            Currency: "USD",
        },
    ];

    dataSource = new MatTableDataSource<TableItem>(this.originalTabledata);
    displayedColumns: string[] = ["product", "category", "deliverTo", "price", "status", "payment", "actions"];
    selectedItem: TableItem | null = null;

    ngOnInit() {}
    ngAfterViewInit() {
        //table
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item: TableItem, header: string): string | number => {
            switch (header) {
                case "product":
                    return item.Product;
                case "category":
                    return item.Category;
                case "deliverTo":
                    return item.DeliverTo;
                case "price":
                    // To sort as a number, we must parse the string
                    return parseFloat(item.Price);
                case "status":
                    return item.Status;
                case "payment":
                    return item.Payment;
                default:
                    return "";
            }
        };

        this.dataSource.filterPredicate = (data: TableItem, filter: string) => {
            const dataStr = Object.values(data).join(" ").toLowerCase();
            return dataStr.indexOf(filter) !== -1;
        };

        //js vectormap
        const map = new jsVectorMap({
            selector: "#jsvectormap",
            regionStyle: {
                initial: {
                    fill: "rgba(0, 73, 232, 0.15)",
                    stroke: "rgba(0, 73, 232, 0.4)",
                    strokeWidth: 1,
                },
            },
            visualizeData: {
                scale: ["#f3faff", "#0049e8"],
                values: {
                    AF: 16.63,
                    AL: 11.58,
                    DZ: 158.97,
                    AO: 85.81,
                    AG: 1.1,
                    AR: 351.02,
                    AM: 8.83,
                    AU: 1219.72,
                    AT: 366.26,
                    AZ: 52.17,
                    BS: 7.54,
                    BH: 21.73,
                    BD: 105.4,
                    BB: 3.96,
                    BY: 52.89,
                    BE: 461.33,
                    BZ: 1.43,
                    BJ: 6.49,
                    BT: 1.4,
                    BO: 19.18,
                    BA: 16.2,
                    BW: 12.5,
                    BR: 2023.53,
                    BN: 11.96,
                    BG: 44.84,
                    BF: 8.67,
                    BI: 1.47,
                    KH: 11.36,
                    CM: 21.88,
                    CA: 1563.66,
                    CV: 1.57,
                    CF: 2.11,
                    TD: 7.59,
                    CL: 199.18,
                    CN: 5745.13,
                    CO: 283.11,
                    KM: 0.56,
                    CD: 12.6,
                    CG: 11.88,
                    CR: 35.02,
                    CI: 22.38,
                    HR: 59.92,
                    CY: 22.75,
                    CZ: 195.23,
                    DK: 304.56,
                    DJ: 1.14,
                    DM: 0.38,
                    DO: 50.87,
                    EC: 61.49,
                    EG: 216.83,
                    SV: 21.8,
                    GQ: 14.55,
                    ER: 2.25,
                    EE: 19.22,
                    ET: 30.94,
                    FJ: 3.15,
                    FI: 231.98,
                    FR: 2555.44,
                    GA: 12.56,
                    GM: 1.04,
                    GE: 11.23,
                    DE: 3305.9,
                    GH: 18.06,
                    GR: 305.01,
                    GD: 0.65,
                    GT: 40.77,
                    GN: 4.34,
                    GW: 0.83,
                    GY: 2.2,
                    HT: 6.5,
                    HN: 15.34,
                    HK: 226.49,
                    HU: 132.28,
                    IS: 12.77,
                    IN: 1430.02,
                    ID: 695.06,
                    IR: 337.9,
                    IQ: 84.14,
                    IE: 204.14,
                    IL: 201.25,
                    IT: 2036.69,
                    JM: 13.74,
                    JP: 5390.9,
                    JO: 27.13,
                    KZ: 129.76,
                    KE: 32.42,
                    KI: 0.15,
                    KR: 986.26,
                    KW: 117.32,
                    KG: 4.44,
                    LA: 6.34,
                    LV: 23.39,
                    LB: 39.15,
                    LS: 1.8,
                    LR: 0.98,
                    LY: 77.91,
                    LT: 35.73,
                    LU: 52.43,
                    MK: 9.58,
                    MG: 8.33,
                    MW: 5.04,
                    MY: 218.95,
                    MV: 1.43,
                    ML: 9.08,
                    MT: 7.8,
                    MR: 3.49,
                    MU: 9.43,
                    MX: 1004.04,
                    MD: 5.36,
                    MN: 5.81,
                    ME: 3.88,
                    MA: 91.7,
                    MZ: 10.21,
                    MM: 35.65,
                    NA: 11.45,
                    NP: 15.11,
                    NL: 770.31,
                    NZ: 138,
                    NI: 6.38,
                    NE: 5.6,
                    NG: 206.66,
                    NO: 413.51,
                    OM: 53.78,
                    PK: 174.79,
                    PA: 27.2,
                    PG: 8.81,
                    PY: 17.17,
                    PE: 153.55,
                    PH: 189.06,
                    PL: 438.88,
                    PT: 223.7,
                    QA: 126.52,
                    RO: 158.39,
                    RU: 1476.91,
                    RW: 5.69,
                    WS: 0.55,
                    ST: 0.19,
                    SA: 434.44,
                    SN: 12.66,
                    RS: 38.92,
                    SC: 0.92,
                    SL: 1.9,
                    SG: 217.38,
                    SK: 86.26,
                    SI: 46.44,
                    SB: 0.67,
                    ZA: 354.41,
                    ES: 1374.78,
                    LK: 48.24,
                    KN: 0.56,
                    LC: 1,
                    VC: 0.58,
                    SD: 65.93,
                    SR: 3.3,
                    SZ: 3.17,
                    SE: 444.59,
                    CH: 422.44,
                    SY: 59.63,
                    TW: 426.98,
                    TJ: 5.58,
                    TZ: 22.43,
                    TH: 312.61,
                    TL: 0.62,
                    TG: 3.07,
                    TO: 0.3,
                    TT: 21.2,
                    TN: 43.86,
                    TR: 729.05,
                    TM: 0,
                    UG: 17.12,
                    UA: 136.56,
                    AE: 239.65,
                    GB: 2258.57,
                    US: 1462.18,
                    UY: 40.71,
                    UZ: 37.72,
                    VU: 0.72,
                    VE: 285.21,
                    VN: 101.99,
                    YE: 30.02,
                    ZM: 15.69,
                    ZW: 5.57,
                },
            },
            map: "world",
        });
    }
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    deleteOrder(order: TableItem) {
        // console.log("Deleting order:", order);
        // Logic for deleting an order goes here
    }

    saveChanges() {
        if (this.selectedItem) {
            const index = this.originalTabledata.findIndex((i) => i === this.selectedItem);
            if (index !== -1) {
                // Find the original item and update its properties
                const originalItem = this.originalTabledata[index];
                originalItem.Product = this.selectedItem.Product;
                originalItem.Category = this.selectedItem.Category;
                originalItem.Status = this.selectedItem.Status;
            }
            this.selectedItem = null;
            this.dataSource.data = [...this.originalTabledata];
        }
    }

    editOrder(order: TableItem) {
        //console.log("Editing order:", order);
        this.selectedItem = { ...order };
    }
    openDialog(order: TableItem) {
        this.selectedItem = { ...order };
        this.dialog.open(CreateEditOrderModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: this.selectedItem,
        });
    }
}
