import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, DOCUMENT, Inject, Renderer2, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterModule } from "@angular/router";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatBadgeModule } from "@angular/material/badge";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatExpansionModule } from "@angular/material/expansion";
import { FormsModule } from "@angular/forms";
import { MatSliderModule } from "@angular/material/slider";
import { IncrementorComponent } from "../../../components/incrementor/app-incrementor.component";
import { register } from "swiper/element/bundle";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
register();

type ViewMode = "list" | "thumb";

interface Product {
    id: number;
    name: string;
    category: string;
    subCategory: string;
    price: number;
    rating: number;
    image: string;
}

@Component({
    selector: "app-products",
    standalone: true,
    imports: [CommonModule, RouterLink, CommonModule, MatCardModule, MatCheckboxModule, MatInputModule, MatButtonToggleModule, MatExpansionModule, MatIconModule, MatSliderModule, FormsModule, MatFormFieldModule, MatButtonModule, MatBadgeModule, IncrementorComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">All Products</h3>
                        <p class="small opacity-50">Large variety and series of products</p>
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
            <div class="inner-sidebar-wrap">
                <div class="inner-sidebar">
                    <div class="p-3">
                        <div class="row gx-3">
                            <div class="col-auto d-lg-none">
                                <button matIconButton (click)="innersidebar()" aria-label="Inner Menu">
                                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                                </button>
                            </div>
                            <div class="col">
                                <mat-form-field appearance="outline" class="w-100 inline-small">
                                    <mat-label>Search...</mat-label>
                                    <input matInput placeholder="Search..." />
                                    <mat-icon matSuffix>search</mat-icon>
                                </mat-form-field>
                            </div>
                        </div>
                    </div>

                    <div class="p-3">
                        <h4>Categories</h4>
                        @for (category of categories(); track category) {
                        <div class="">
                            <mat-checkbox (change)="toggleCategory(category)" [checked]="filters().categories.includes(category)">
                                <p>{{ category }}</p>
                            </mat-checkbox>
                            <span class="badge badge-light ms-2">{{ getCategoryCount(category) }}</span>
                        </div>
                        }
                    </div>

                    <div class="p-3">
                        <h4>Sub-Categories</h4>
                        @for (subCategory of subCategories(); track subCategory) {
                        <div class="">
                            <mat-checkbox (change)="toggleSubCategory(subCategory)" [checked]="filters().subCategories.includes(subCategory)">
                                {{ subCategory }}
                            </mat-checkbox>
                        </div>
                        }
                    </div>

                    <div class="p-3">
                        <h4>Price Range</h4>
                        <mat-slider class="w-100 mb-3" [max]="1000" [min]="0" [step]="10" (valueChange)="setPriceRange($event)" [value]="filters().priceRange">
                            <input matSliderThumb />
                        </mat-slider>
                        <p>$ {{ filters().priceRange }}</p>
                    </div>

                    <div class="p-3">
                        <h4>Rating</h4>
                        @for (rating of [5, 4, 3, 2, 1]; track rating) {
                        <div class="">
                            <mat-checkbox (change)="toggleRating(rating)" [checked]="filters().ratings.includes(rating)">
                                <div class="flex items-center">
                                    @for(i of [1, 2, 3, 4, 5]; track i) {
                                    <mat-icon [class.theme-yellow]="i <= rating" [class.opacity-25]="i > rating" class="text-sm text-theme">star</mat-icon>
                                    }
                                    <span class="ml-2 ">& up</span>
                                </div>
                            </mat-checkbox>
                        </div>
                        }
                    </div>
                </div>
                <div class="inner-sidebar-content">
                    <!-- filter and subtitle -->
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto order-1 order-sm-1 mb-3 mb-lg-4">
                            <button matButton (click)="innersidebar()" aria-label="Inner Menu"><span class="">Filter</span> <span class="badge badge-light theme-blue ms-2">3</span></button>

                            <button matIconButton class="text-theme" (click)="clearFilters()"><mat-icon>filter_list_off</mat-icon></button>
                        </div>
                        <div class="col-12 col-sm text-center order-3 order-sm-2 mb-3 mb-lg-4">
                            <h4 class="mb-0">{{ filteredProducts().length }} Products</h4>
                        </div>
                        <div class="col-auto order-2 order-sm-3 ms-auto mb-3 mb-lg-4">
                            <mat-button-toggle-group [value]="viewMode()" (change)="viewMode.set($event.value)">
                                <mat-button-toggle value="list"><mat-icon class="material-icons-outlined">list</mat-icon> <span class="ps-1">List</span></mat-button-toggle>
                                <mat-button-toggle value="thumb"><mat-icon class="material-icons-outlined">grid_view</mat-icon> <span class="ps-1">Thumb</span></mat-button-toggle>
                            </mat-button-toggle-group>
                        </div>
                    </div>

                    <!-- product thumb view  -->
                    @if (viewMode() === 'thumb') {
                    <div class="row gx-3 gx-lg-4">
                        @if (filteredProducts().length === 0) {
                        <div class="text-center mb-4">
                            <img src="assets/img/noproduct.png" alt="" class="width-300 mt-4 mt-lg-5" />
                            <h3 class="mb-1">No product found</h3>
                            <p class="text-secondary">Select different categories to checkout product</p>
                        </div>
                        } @else { @for (product of filteredProducts(); track product.id) {
                        <div class="col-12 col-sm-6 col-xl-6 col-xxl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div class="position-absolute top-0 end-0 m-3 z-index-1">
                                    <button matMiniFab class="text-theme theme-red">
                                        <span class="material-symbols-outlined align-middle"> favorite </span>
                                        <!-- <mat-icon>favorite</mat-icon> -->
                                    </button>
                                </div>
                                <div mat-card-image class="height-180 w-100 rounded coverimg mb-3" routerLink="../product">
                                    <img [src]="product.image" [alt]="product.name" />
                                </div>

                                <mat-card-content>
                                    <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>

                                    <h4 class="mb-2" routerLink="../product">{{ product.name }}</h4>
                                    <h3 class="fw-bold mb-3 ">$ {{ product.price.toFixed(2) }} <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                    <p>
                                        @for(i of [1, 2, 3, 4, 5]; track i) {
                                        <mat-icon [class.theme-yellow]="i <= product.rating" [class.opacity-25]="i > product.rating" class="text-sm text-theme">star</mat-icon>
                                        }
                                        <span class="ms-1">({{ product.rating.toFixed(1) }})</span>
                                    </p>
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
                        }
                        <div class="col-12 col-sm-6 col-xl-6 col-xxl-3">
                            <mat-card class="bg-light-theme text-center mb-3 mb-lg-4 theme-orange">
                                <mat-card-content>
                                    <img src="assets/img/product10.png" class="height-160 mb-3" alt="" />
                                    <p class="mb-4"><span class="badge theme-magenta">25% Offer</span></p>
                                    <p class="text-theme theme-red mb-1">SmartPhone Perks</p>
                                    <h2 class="mb-1">Upto 25% Off</h2>
                                    <p class="text-secondary small mb-4">Offer valid till 30th Dec</p>
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        }
                    </div>
                    } @else {

                    <!-- product list view  -->
                    <div class="row gx-3 gx-lg-4">
                        @if (filteredProducts().length === 0) {
                        <div class="text-center mb-4">
                            <img src="assets/img/noproduct.png" alt="" class="width-300 mt-4 mt-lg-5" />
                            <h3 class="mb-1">No product found</h3>
                            <p class="text-secondary">Select different categories to checkout product</p>
                        </div>
                        } @else { @for (product of filteredProducts(); track product.id) {
                        <div class="col-12">
                            <mat-card class="mb-3">
                                <mat-card-content>
                                    <div class="row gx-3">
                                        <div class="col-4 col-lg-3 col-xl-3 col-xxl-2 position-relative">
                                            <div class="position-absolute top-0 end-0 m-3 z-index-1">
                                                <button matMiniFab class="text-theme theme-red">
                                                    <span class="material-symbols-outlined align-middle"> favorite </span>
                                                    <!-- <mat-icon>favorite</mat-icon> -->
                                                </button>
                                            </div>
                                            <div class="height-140 w-100 rounded coverimg mb-3 mb-lg-0">
                                                <img [src]="product.image" [alt]="product.name" />
                                            </div>
                                        </div>
                                        <div class="col col-lg col-xl">
                                            <p><span class="badge badge-light theme-green align-middle">Flat $10.00 OFF</span></p>
                                            <h4 class="mb-2">{{ product.name }}</h4>
                                            <h3 class="fw-bold mb-3 ">$ {{ product.price.toFixed(2) }} <s class="text-secondary fw-normal">$ 180.00</s></h3>
                                            <p>
                                                @for(i of [1, 2, 3, 4, 5]; track i) {
                                                <mat-icon [class.theme-yellow]="i <= product.rating" [class.opacity-25]="i > product.rating" class="text-sm text-theme">star</mat-icon>
                                                }
                                                <span class="ms-1">({{ product.rating.toFixed(1) }})</span>
                                            </p>
                                        </div>
                                        <div class="col-12 col-sm-auto col-lg-4 col-xl-auto">
                                            <div class="row gx-3">
                                                <div class="col mb-0 mb-lg-3">
                                                    <app-incrementor></app-incrementor>
                                                </div>
                                                <div class="col-auto ms-auto">
                                                    <button matIconButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        }
                        <div class="col-12 col-sm-6 col-xl-6 col-xxl-3">
                            <mat-card class="bg-light-theme text-center mb-3 mb-lg-4 theme-orange">
                                <mat-card-content>
                                    <img src="assets/img/product10.png" class="height-160 mb-3" alt="" />
                                    <p class="mb-4"><span class="badge theme-magenta">25% Offer</span></p>
                                    <p class="text-theme theme-red mb-1">SmartPhone Perks</p>
                                    <h2 class="mb-1">Upto 25% Off</h2>
                                    <p class="text-secondary small mb-4">Offer valid till 30th Dec</p>
                                    <button matButton="filled"><mat-icon class="material-icons-outlined">shopping_bag</mat-icon> Buy Now</button>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        }
                    </div>

                    }
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductsComponent implements OnInit {
    //list and thumb view
    viewMode = signal<ViewMode>("thumb");

    constructor(private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}
    ngOnInit() {
        // this.renderer.addClass(this.document.body, "innermenu-close");
    }
    // inner sidebar toggle
    innersidebar(): void {
        const body = this.document.body;
        const className = "innermenu-close";
        if (body.classList.contains(className)) {
            this.renderer.removeClass(body, className);
        } else {
            this.renderer.addClass(body, className);
        }
    }

    // shopping products
    products: Product[] = [
        { id: 1, name: "Wireless Headphones", category: "Electronics", subCategory: "Audio", price: 150, rating: 4.5, image: "assets/img/product1.jpg" },
        { id: 2, name: "Classic Leather Bag", category: "Fashion", subCategory: "Bags", price: 250, rating: 4.8, image: "assets/img/product2.jpg" },
        { id: 3, name: "Smart Watch Series 5", category: "Electronics", subCategory: "Wearables", price: 400, rating: 4.2, image: "assets/img/product3.jpg" },
        { id: 4, name: "Vintage Camera", category: "Photography", subCategory: "Cameras", price: 800, rating: 4.9, image: "assets/img/product4.jpg" },
        { id: 5, name: "Mountain Bike", category: "Sports", subCategory: "Bikes", price: 950, rating: 4.7, image: "assets/img/product5.jpg" },
        { id: 6, name: "Espresso Machine", category: "Appliances", subCategory: "Kitchen", price: 350, rating: 4.6, image: "assets/img/product6.jpg" },
        { id: 7, name: "Designer T-Shirt", category: "Fashion", subCategory: "Apparel", price: 50, rating: 4.1, image: "assets/img/product7.jpg" },
        { id: 8, name: "Portable Speaker", category: "Electronics", subCategory: "Audio", price: 120, rating: 4.4, image: "assets/img/product1.jpg" },
        { id: 9, name: "Running Shoes", category: "Sports", subCategory: "Shoes", price: 110, rating: 4.3, image: "assets/img/product2.jpg" },
        { id: 10, name: "Blender", category: "Appliances", subCategory: "Kitchen", price: 80, rating: 4.0, image: "assets/img/product3.jpg" },
        { id: 11, name: "Backpack", category: "Fashion", subCategory: "Bags", price: 90, rating: 4.2, image: "assets/img/product4.jpg" },
        { id: 12, name: "Drone", category: "Photography", subCategory: "Drones", price: 550, rating: 4.9, image: "assets/img/product5.jpg" },
        { id: 13, name: "Digital Camera", category: "Photography", subCategory: "Cameras", price: 650, rating: 4.7, image: "assets/img/product6.jpg" },
        { id: 14, name: "Jogging Pants", category: "Sports", subCategory: "Apparel", price: 60, rating: 4.5, image: "assets/img/product7.jpg" },
        { id: 15, name: "Smart TV", category: "Electronics", subCategory: "Televisions", price: 750, rating: 4.8, image: "assets/img/product1.jpg" },
    ];

    filters = signal({
        categories: [] as string[],
        subCategories: [] as string[],
        priceRange: 1000,
        ratings: [] as number[],
    });

    categories = computed(() => {
        const allCategories = this.products.map((p) => p.category);
        return Array.from(new Set(allCategories)).sort();
    });

    subCategories = computed(() => {
        const allSubCategories = this.products.map((p) => p.subCategory);
        return Array.from(new Set(allSubCategories)).sort();
    });

    // Custom method to get the count of products for each category
    getCategoryCount(category: string) {
        return this.products.filter((p) => p.category === category).length;
    }

    // Filtered products based on the current state of filters
    filteredProducts = computed(() => {
        const currentFilters = this.filters();
        return this.products.filter((product) => {
            // Category filter
            const categoryMatch = currentFilters.categories.length === 0 || currentFilters.categories.includes(product.category);

            // Sub-category filter
            const subCategoryMatch = currentFilters.subCategories.length === 0 || currentFilters.subCategories.includes(product.subCategory);

            // Price range filter
            const priceMatch = product.price <= currentFilters.priceRange;

            // Rating filter
            const ratingMatch = currentFilters.ratings.length === 0 || currentFilters.ratings.some((rating) => product.rating >= rating);

            return categoryMatch && subCategoryMatch && priceMatch && ratingMatch;
        });
    });

    toggleCategory(category: string) {
        this.filters.update((f) => {
            const updatedCategories = f.categories.includes(category) ? f.categories.filter((c) => c !== category) : [...f.categories, category];
            return { ...f, categories: updatedCategories };
        });
    }

    toggleSubCategory(subCategory: string) {
        this.filters.update((f) => {
            const updatedSubCategories = f.subCategories.includes(subCategory) ? f.subCategories.filter((sc) => sc !== subCategory) : [...f.subCategories, subCategory];
            return { ...f, subCategories: updatedSubCategories };
        });
    }

    setPriceRange(value: any) {
        this.filters.update((f) => ({ ...f, priceRange: value as number }));
    }

    toggleRating(rating: number) {
        this.filters.update((f) => {
            const updatedRatings = f.ratings.includes(rating) ? f.ratings.filter((r) => r !== rating) : [...f.ratings, rating];
            return { ...f, ratings: updatedRatings };
        });
    }

    clearFilters() {
        this.filters.set({
            categories: [],
            subCategories: [],
            priceRange: 1000,
            ratings: [],
        });
    }
}
