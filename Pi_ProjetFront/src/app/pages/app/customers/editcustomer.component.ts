import { Component, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { TableItem } from "./customers.component"; // Import the interface

@Component({
    selector: "app-edit-customer-dialog",
    imports: [CommonModule, MatDialogModule, MatInputModule, MatIconModule, MatButtonModule, MatFormFieldModule, ReactiveFormsModule],
    template: `<h4 mat-dialog-title>Edit Customer Profile</h4>
        <mat-dialog-content>
            <form [formGroup]="customerForm" class="pt-2">
                <div class="row gx-3">
                    <div class="col-12 col-lg-4 text-center">
                        <div class="height-180 width-180 lh-20 position-relative d-block mx-auto">
                            <div class="position-absolute bottom-0 end-0 z-index-1 m-2">
                                <button matMiniFab="elevated" onclick="this.nextElementSibling.click()"><mat-icon class="material-icons-outlined mx-0">photo_camera</mat-icon></button>
                                <input type="file" class="d-none" />
                            </div>
                            <div class="coverimg avatar avatar-180 mb-0 position-relative z-index-0 overflow-hidden rounded-circle" style="background-image:url('{{ data.customerImage }}')"></div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-8">
                        <div class="row gx-3">
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Customer Name</mat-label>
                                    <input matInput formControlName="customerName" required />
                                    <mat-error *ngIf="customerForm.get('customerName')?.invalid">Name is required</mat-error>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-lg-6"></div>
                        </div>
                        <div class="row gx-3">
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>City</mat-label>
                                    <input matInput formControlName="city" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Country</mat-label>
                                    <input matInput formControlName="country" />
                                </mat-form-field>
                            </div>
                        </div>
                        <div class="row gx-3">
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Email</mat-label>
                                    <input matInput formControlName="email" type="email" required />
                                    <mat-error *ngIf="customerForm.get('email')?.hasError('email') && !customerForm.get('email')?.hasError('required')"> Please enter a valid email address </mat-error>
                                    <mat-error *ngIf="customerForm.get('email')?.hasError('required')"> Email is required </mat-error>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Phone</mat-label>
                                    <input matInput formControlName="phone" />
                                </mat-form-field>
                            </div>
                        </div>
                        <div class="row gx-3">
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Total Purchase (Lifetime)</mat-label>
                                    <input matInput formControlName="totalPurchaseLifetime" type="number" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-lg-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Total Purchase (This Month)</mat-label>
                                    <input matInput formControlName="totalPurchaseThisMonth" type="number" />
                                </mat-form-field>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </mat-dialog-content>

        <mat-dialog-actions>
            <button matButton="filled" color="primary" [disabled]="customerForm.invalid" (click)="onSave()">Save</button>
            <button matButton (click)="onCancel()" class="ms-auto theme-red">Cancel</button>
        </mat-dialog-actions>`,
    styles: [``],
})
export class EditCustomerDialogComponent {
    // Use FormGroup to manage the form controls
    customerForm = new FormGroup({
        customerImage: new FormControl(this.data.customerImage),
        customerName: new FormControl("", Validators.required),
        city: new FormControl(""),
        country: new FormControl(""),
        email: new FormControl("", [Validators.required, Validators.email]),
        phone: new FormControl(""),
        totalPurchaseLifetime: new FormControl(0),
        totalPurchaseThisMonth: new FormControl(0),
    });

    constructor(public dialogRef: MatDialogRef<EditCustomerDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: TableItem) {
        // Populate the form with the data passed from the parent component
        this.customerForm.patchValue(data);
    }

    // Closes the dialog without saving
    onCancel(): void {
        this.dialogRef.close();
    }

    // Closes the dialog and returns the updated form data
    onSave(): void {
        if (this.customerForm.valid) {
            this.dialogRef.close(this.customerForm.value);
        }
    }
}
