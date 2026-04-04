import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, signal } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDividerModule } from "@angular/material/divider";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatRadioModule } from "@angular/material/radio";
import { ReactiveFormsModule, FormBuilder, FormGroup } from "@angular/forms";
import { MatBadgeModule } from "@angular/material/badge";
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-add-product",
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatBadgeModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDividerModule, MatSlideToggleModule, MatRadioModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Add Product to Shop</h3>
                        <p class="small opacity-50">Quick add products to your store</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="/app/cart" matBadge="3" matBadgeColor="warn"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matIconButton routerLink="/app/ecommerce"><mat-icon class="material-icons-outlined">storefront</mat-icon></button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            <!-- Main Form Content -->
            <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
                <div class="row gx-3 gx-lg-4">
                    <div class="col-12 col-lg-8">
                        <!-- Left Column: Product Details -->
                        <mat-card class="mb-3 mb-lg-4">
                            <mat-card-content class="pb-0">
                                <h3 class="mb-4">Product Details</h3>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Product Name</mat-label>
                                    <input matInput formControlName="name" required placeholder="e.g., Ceramic Coffee Mug" />
                                    <mat-error *ngIf="productForm.get('name')?.invalid">Product name is required</mat-error>
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100 ">
                                    <mat-label>Product Description</mat-label>
                                    <textarea matInput formControlName="description" required rows="5" placeholder="Provide a detailed description of the product"></textarea>
                                    <mat-error *ngIf="productForm.get('description')?.invalid">Description is required</mat-error>
                                </mat-form-field>

                                <h4 class="mb-3">Discount Type:</h4>
                                <mat-radio-group formControlName="discountType" class="d-block mb-3" color="primary">
                                    <mat-radio-button value="none">No Discount</mat-radio-button>
                                    <mat-radio-button value="flat">Flat Discount</mat-radio-button>
                                    <mat-radio-button value="percentage">Percentage</mat-radio-button>
                                </mat-radio-group>

                                <h4 class="mb-3">Pricing:</h4>
                                <div class="row">
                                    <div class="col-12 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Price</mat-label>
                                            <input matInput type="number" formControlName="price" required placeholder="e.g., 25.00" />
                                            <mat-icon matPrefix>attach_money</mat-icon>
                                            <mat-error *ngIf="productForm.get('price')?.invalid">Price is required and must be a number</mat-error>
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-lg-4 col-xl-3" *ngIf="productForm.get('discountType')?.value !== 'none'">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Offer Price</mat-label>
                                            <input matInput type="number" formControlName="offerPrice" placeholder="e.g., 20.00" />
                                            <mat-icon matPrefix>attach_money</mat-icon>
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-lg-4 col-xl-3" *ngIf="productForm.get('discountType')?.value !== 'none'">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>{{ productForm.get("discountType")?.value === "flat" ? "Flat Discount" : "Percentage Discount" }}</mat-label>
                                            <input matInput type="number" formControlName="discountValue" required placeholder="e.g., 5.00" />
                                            <mat-icon matPrefix *ngIf="productForm.get('discountType')?.value === 'flat'">attach_money</mat-icon>
                                            <mat-icon matSuffix *ngIf="productForm.get('discountType')?.value === 'percentage'">percent</mat-icon>
                                            <mat-error *ngIf="productForm.get('discountValue')?.invalid">Discount value is required</mat-error>
                                        </mat-form-field>
                                    </div>
                                    <div class="col-12 col-lg-4 col-xl-3">
                                        <mat-form-field appearance="outline" class="w-100">
                                            <mat-label>Tax Information</mat-label>
                                            <input matInput formControlName="tax" placeholder="e.g., 5% VAT" />
                                            <mat-icon matSuffix>percent</mat-icon>
                                        </mat-form-field>
                                    </div>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <div class="col-12 col-lg-4">
                        <!-- Right Column: Images & Meta -->
                        <mat-card class="mb-3 mb-lg-4">
                            <mat-card-header>
                                <h3 class="mb-4">Images & Meta Info</h3>
                            </mat-card-header>
                            <mat-card-content class="pb-0">
                                <!-- Image Dropzone -->
                                <mat-card class="bg-light-theme text-center shadow-none mb-3 mb-lg-4" [ngClass]="{ 'theme-': isDragging, 'theme-green': !isDragging }" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)" (click)="fileInput.click()">
                                    <mat-card-content>
                                        <mat-icon class="mb-3">cloud_upload</mat-icon>
                                        <p class="mb-1">Drag & drop images here or click to browse</p>
                                        <p class="opacity-50 small">Supports JPG, PNG, WEBP, up to 5MB each</p>
                                        <input type="file" #fileInput (change)="onFileSelected($event)" multiple hidden />
                                    </mat-card-content>
                                </mat-card>

                                <!-- Image Previews -->

                                <div *ngIf="images().length > 0" class="row gx-3">
                                    @for (image of images(); track image.name) {
                                    <div class="col-auto">
                                        <mat-card class="avatar avatar-90 position-relative mb-4" appearance="outlined">
                                            <img mat-card-image [src]="image.src" alt="Product Image" class="w-100" />
                                            <button matMiniFab (click)="removeImage(image)" class="position-absolute top-50 start-50 translate-middle z-index-1 theme-red">
                                                <mat-icon>delete</mat-icon>
                                            </button>
                                        </mat-card>
                                    </div>
                                    }
                                </div>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Product Status</mat-label>
                                    <mat-select formControlName="status" required>
                                        <mat-option value="Active">Active</mat-option>
                                        <mat-option value="Draft">Draft</mat-option>
                                        <mat-option value="Archived">Archived</mat-option>
                                    </mat-select>
                                    <mat-error *ngIf="productForm.get('status')?.invalid">Status is required</mat-error>
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Category</mat-label>
                                    <mat-select formControlName="category" required>
                                        <mat-option *ngFor="let category of categories()" [value]="category">{{ category }}</mat-option>
                                    </mat-select>
                                    <mat-error *ngIf="productForm.get('category')?.invalid">Category is required</mat-error>
                                </mat-form-field>

                                <mat-form-field appearance="outline" class="w-100" *ngIf="subcategories().length > 0">
                                    <mat-label>Sub-Category</mat-label>
                                    <mat-select formControlName="subcategory">
                                        <mat-option *ngFor="let subcategory of subcategories()" [value]="subcategory">{{ subcategory }}</mat-option>
                                    </mat-select>
                                </mat-form-field>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>

                <button mat-flat-button color="primary" type="submit" [disabled]="productForm.invalid" class="w-full sm:w-auto px-8 rounded-full shadow-lg">Create Product</button>
            </form>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddProductComponent implements OnInit, OnDestroy {
    productForm: FormGroup;
    isDragging = signal(false);
    images = signal<{ name: string; src: string }[]>([]);
    darkMode = signal(false);
    private destroy$ = new Subject<void>();

    categories = signal<string[]>(["Electronics", "Clothing", "Home & Garden", "Books"]);
    subcategories = signal<string[]>([]);

    private subcategoryMap: { [key: string]: string[] } = {
        Electronics: ["Laptops", "Smartphones", "Headphones"],
        Clothing: ["T-shirts", "Jeans", "Jackets"],
        "Home & Garden": ["Furniture", "Decor", "Tools"],
        Books: ["Fiction", "Non-Fiction", "Academic"],
    };

    constructor(private fb: FormBuilder) {
        this.productForm = this.fb.group({
            name: [""],
            description: [""],
            price: [null],
            offerPrice: [null],
            discountType: ["none"],
            discountValue: [null],
            tax: [""],
            status: ["Active"],
            category: [""],
            subcategory: [""],
        });

        this.productForm
            .get("category")
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((category) => {
                this.subcategories.set(this.subcategoryMap[category] || []);
                this.productForm.get("subcategory")?.setValue("");
            });
    }

    ngOnInit(): void {}

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
        if (event.dataTransfer?.files) {
            this.processFiles(event.dataTransfer.files);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.processFiles(input.files);
        }
    }

    processFiles(files: FileList) {
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images.update((imgs) => [...imgs, { name: file.name, src: e.target?.result as string }]);
            };
            reader.readAsDataURL(file);
        });
    }

    removeImage(imageToRemove: { name: string; src: string }) {
        this.images.update((imgs) => imgs.filter((img) => img.src !== imageToRemove.src));
    }

    onSubmit() {
        if (this.productForm.valid) {
            console.log("Form Submitted!", this.productForm.value);
            console.log("Images:", this.images());
        } else {
            console.error("Form is invalid.");
        }
    }
}
