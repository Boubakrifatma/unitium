import { Component, OnInit, AfterViewInit, signal, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CommonModule, AsyncPipe } from "@angular/common";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBar, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarModule, MatSnackBarRef } from "@angular/material/snack-bar";
import { MatDatepickerInputEvent, MatCalendarCellClassFunction, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { startWith, map, Observable } from "rxjs";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { TableItem } from "./orders.component";
import { MatSelectModule } from "@angular/material/select";

@Component({
    selector: "app-createditorder",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [CommonModule, MatDividerModule, MatAutocompleteModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBarModule, MatDialogTitle, MatButtonModule, FormsModule, MatIconModule, MatChipsModule, MatDatepickerModule, ReactiveFormsModule, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
    template: `
        <h3 mat-dialog-title>
            Order: {{ orderData.Product }} <br />
            <small class="text-secondary ps-2">Order placed on: {{ orderData.Date }} {{ orderData.Time }}</small>
        </h3>
        <mat-dialog-content class="mat-typography">
            @if (orderData) {
            <form class="">
                <div class="row gx-3 align-items-center">
                    <div class="col-12">
                        <h4 class="my-3">Product</h4>
                    </div>
                    <div class="col-12">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Product Name</mat-label>
                            <input matInput [(ngModel)]="orderData.Product" name="expense" />
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Category</mat-label>
                            <mat-select [(ngModel)]="orderData.Category" name="category">
                                <mat-option value="">Select Category</mat-option>
                                <mat-option value="Accessories">Accessories</mat-option>
                                <mat-option value="Accessories">Accessories</mat-option>
                                <mat-option value="Clothing">Clothing</mat-option>
                                <mat-option value="Extras">Extras</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Sub Category</mat-label>
                            <mat-select [(ngModel)]="orderData.SubCategory" name="subcategory">
                                <mat-option value="">Select</mat-option>
                                <mat-option value="Men Shoes">Men Shoes</mat-option>
                                <mat-option value="Watch">Watch</mat-option>
                                <mat-option value="Room Heater">Room Heater</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Amount ({{ orderData.Currency }})</mat-label>
                            <input matInput [(ngModel)]="orderData.Price" name="price" />
                        </mat-form-field>
                    </div>
                    <div class="col-12">
                        <h4 class="my-3">Customer</h4>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Orderby</mat-label>
                            <input matInput [(ngModel)]="orderData.OrderBy" name="orderby" />
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Email</mat-label>
                            <input matInput [(ngModel)]="orderData.Email" name="email" />
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Delivered to</mat-label>
                            <input matInput [(ngModel)]="orderData.DeliverTo" name="deliverto" />
                        </mat-form-field>
                    </div>
                    <div class="col-12">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Address</mat-label>
                            <textarea matInput [(ngModel)]="orderData.Address" name="address"></textarea>
                        </mat-form-field>
                    </div>

                    <div class="col-12">
                        <h4 class="my-3">Order Status</h4>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 col-xl-4">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Status</mat-label>
                            <mat-select [(ngModel)]="orderData.Status" name="status">
                                <mat-option value="">Select</mat-option>
                                <mat-option value="Delivered">Delivered</mat-option>
                                <mat-option value="Cancelled">Cancelled</mat-option>
                                <mat-option value="Processing">Processing</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>
            </form>
            }
        </mat-dialog-content>
        <mat-dialog-actions>
            <div class="col">
                <button matButton="filled" (click)="updateOrder()"><mat-icon class="material-icons-outlined">event</mat-icon> Update</button>
            </div>
            <div class="col-auto">
                <button matButton mat-dialog-close class="theme-red">Cancel</button>
            </div>
        </mat-dialog-actions>
    `,
    styles: [``],
})
export class CreateEditOrderModal {
    public orderData: TableItem;

    constructor(public dialogRef: MatDialogRef<CreateEditOrderModal>, @Inject(MAT_DIALOG_DATA) public data: TableItem, private snackBar: MatSnackBar) {
        this.orderData = data;
        if (!this.orderData.Status) {
            this.orderData.Status = "";
        }
    }

    updateOrder(): void {
        // Simulate a successful API call or update operation
        setTimeout(() => {
            this.openSnackBar("Order has been successfully updated.", "Dismiss");
        }, 1000);
    }

    openSnackBar(message: string, action: string): void {
        this.snackBar.open(message, action, {
            duration: 3000,
            verticalPosition: "top",
            horizontalPosition: "right",
            panelClass: ["bg-light-theme", "theme-green"],
        });
    }
}
