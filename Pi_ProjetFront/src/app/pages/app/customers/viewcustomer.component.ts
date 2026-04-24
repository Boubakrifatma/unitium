import { Component, Input, signal, Output, EventEmitter } from "@angular/core";
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TableItem } from "./customers.component";
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";

@Component({
    selector: "app-view-customer-drawer",
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatToolbarModule],
    template: `
        @if (customer) {
        <mat-toolbar>
            <h2 class="fw-bold">Customer Details</h2>
            <span class="spacer"></span>
            <button matIconButton aria-label="theme close" (click)="closeDrawer.emit()">
                <mat-icon>close</mat-icon>
            </button>
        </mat-toolbar>
        <div class="text-center">
            <div class="avatar avatar-140 coverimg rounded-circle mb-3" style="background-image:url({{ customer.customerImage }})">
                <img class="d-none" [src]="customer.customerImage" alt="Customer Image" />
            </div>
            <h3 class="mb-1">{{ customer.customerName }}</h3>
            <p class="text-secondary">{{ customer.city }}</p>
        </div>
        <mat-card class="m-3">
            <mat-card-content>
                <h4 class="mb-3">Contact Info</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-4"><p class="text-secondary">Email</p></div>
                    <div class="col-8">
                        <p>{{ customer.email }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-4"><p class="text-secondary">Phone</p></div>
                    <div class="col-8">
                        <p>{{ customer.phone }}</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Location Info</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-5"><p class="text-secondary">City</p></div>
                    <div class="col-7">
                        <p>{{ customer.city }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-5">
                        <p class="text-secondary">Country</p>
                    </div>
                    <div class="col-7">
                        <p>{{ customer.country }}</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Purchase History</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-5"><p class="text-secondary">Lifetime</p></div>
                    <div class="col-7">
                        <p>{{ formatCurrency(customer.totalPurchaseLifetime) }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-5">
                        <p class="text-secondary">This month</p>
                    </div>
                    <div class="col-7">
                        <p>{{ formatCurrency(customer.totalPurchaseThisMonth) }}</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Order Status</h4>
                <div class="mb-3 mb-lg-2">
                    <div class="badge badge-light theme-blue me-2 mb-2 d-inline-block">
                        <h4>{{ customer.activeOrders }} Active</h4>
                    </div>
                    <div class="badge badge-light theme-green me-2 mb-2 d-inline-block">
                        <h4>{{ customer.completedOrders }} Completed</h4>
                    </div>
                    <div class="badge badge-light theme-red me-2 mb-2 d-inline-block">
                        <h4>{{ customer.cancelledOrders }} Rejected</h4>
                    </div>
                </div>
            </mat-card-content>
        </mat-card>
        <div class="px-3">
            <div class="row gx-3 mb-2">
                <div class="col">
                    <button matButton="filled" (click)="editCustomer.emit()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                </div>
                <div class="col-auto">
                    <button matButton class="theme-red" (click)="closeDrawer.emit()">Cancel</button>
                </div>
            </div>
        </div>
        }
    `,
})
export class ViewCustomerDrawerComponent {
    @Input() customer: TableItem | null = null;
    @Output() closeDrawer = new EventEmitter<void>();
    @Output() editCustomer = new EventEmitter<void>();

    formatCurrency(value: number): string {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    }
}
