import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, inject, WritableSignal, computed, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { EmployeeSelectComponent } from "../../../components/employee-select/employee-select.component";
import { PageRightComponent } from "../../../components/page-right/pageright.component";
import { CircleProgressBlueComponent } from "../../../components/charts/circle-progress-blue.component";
import { ProjectsGridComponent } from "./projects-grid.component";
import { ProjectsCardsComponent } from "./projects-cards.component";
import { CreateEditProjectModal } from "./createeditproject.component";
import { RouterLink } from "@angular/router";

declare const jsVectorMap: any;

type ViewMode = "day" | "week" | "month";

interface Employee {
    id: number;
    name: string;
    avatarUrl: string; // Placeholder URL
    title: string;
}
@Component({
    selector: "app-projects",
    standalone: true,
    imports: [RouterLink, CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, EmployeeSelectComponent, PageRightComponent, CircleProgressBlueComponent, ProjectsGridComponent, ProjectsCardsComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Projects</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Projects
                        </p>
                    </div>
                    @if(filterOn) {
                    <div class="col-12 col-sm-6 col-lg-auto mb-3 mb-xl-0 order-3 order-lg-2">
                        <mat-button-toggle-group [value]="viewMode()" (change)="viewMode.set($event.value)">
                            <mat-button-toggle value="day">Day</mat-button-toggle>
                            <mat-button-toggle value="week">Week</mat-button-toggle>
                            <mat-button-toggle value="month">Month</mat-button-toggle>
                        </mat-button-toggle-group>
                    </div>

                    <div class="col-12 col-sm-6 col-lg-3 c col-xxl-2 mb-3 mb-xl-0 order-4 order-lg-3">
                        <app-employee-select></app-employee-select>
                    </div>
                    <div class="col-12 col-sm-6 col-lg-4 col-xl-3 col-xxl-auto mb-3 mb-xl-0 order-5 order-lg-4">
                        <app-page-right></app-page-right>
                    </div>
                    }
                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matIconButton (click)="toggleFilter()">
                            @if(filterOn) {
                            <mat-icon class="material-icons-outlined">filter_alt_off</mat-icon>
                            } @else{
                            <mat-icon class="material-icons-outlined">filter_alt</mat-icon>}
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            <!-- project summary -->
            <div class="row gx-3 gx-lg-4">
                <!-- create new project -->
                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="bg-theme text-white mb-3 mb-lg-4">
                        <mat-card-content>
                            <h1 class="mb-3">
                                Let's create workspace<br />
                                for a your project
                            </h1>
                            <p class="opacity-75 mb-md-4 pb-lg-2">You can start with your very new project or you can create task within your current project</p>

                            <button matButton="elevated" (click)="openDialog()"><mat-icon class="material-icons-outlined">add_circle</mat-icon> Project</button>
                            <button matButton="filled" class="ms-1"><mat-icon class="material-icons-outlined">add</mat-icon> New Task</button>
                        </mat-card-content>
                    </mat-card>
                </div>
                <!-- Recent 5 files -->
                <div class="col-12 col-lg-6 col-xl-4">
                    <swiper-container slides-per-view="1" space-between="20px" autoplay="false" navigation="true" class="swiper small-nav-v50">
                        <swiper-slide>
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3">
                                            <div class="avatar avatar-80 rounded coverimg" routerLink="/app/project-details">
                                                <img src="assets/img/product3.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col mb-3">
                                            <h3 class="text-theme mb-1" routerLink="/app/project-details">Lindsey Group</h3>
                                            <p class="mb-2">AI Automation</p>
                                            <p class="text-secondary small">Deadline 10/11/2027</p>
                                        </div>
                                    </div>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col mb-3">
                                            <h3 class="fw-medium mb-1 text-theme">495<span class="text-secondary">/690</span></h3>
                                            <p class="small text-secondary">Task Completed</p>
                                        </div>
                                        <div class="col-auto mb-3">
                                            <app-circle-progress-blue class="avatar avatar-50 rounded-circle"></app-circle-progress-blue>
                                        </div>
                                    </div>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto avatar-group mb-3">
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-1.jpg" alt="" />
                                            </div>
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-3.jpg" alt="" />
                                            </div>
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-4.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col mb-3">
                                            <p class="mb-1">+ 7</p>
                                            <p class="text-secondary small">Team Members</p>
                                        </div>
                                        <div class="col-auto mb-3">
                                            <button matIconButton><mat-icon class="material-icons-outlined">person_add</mat-icon></button>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        <swiper-slide>
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3">
                                            <div class="avatar avatar-80 rounded coverimg" routerLink="/app/project-details">
                                                <img src="assets/img/product1.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col mb-3">
                                            <h3 class="text-theme mb-1" routerLink="/app/project-details">Manhowar Lineup</h3>
                                            <p class="mb-2">Industrial Safety Project</p>
                                            <p class="text-secondary small">Deadline 30/07/2028</p>
                                        </div>
                                    </div>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col mb-3">
                                            <h3 class="fw-medium mb-1 text-theme">541<span class="text-secondary">/750</span></h3>
                                            <p class="small text-secondary">Task Completed</p>
                                        </div>
                                        <div class="col-auto mb-3">
                                            <app-circle-progress-blue class="avatar avatar-50 rounded-circle"></app-circle-progress-blue>
                                        </div>
                                    </div>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto avatar-group mb-3">
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-1.jpg" alt="" />
                                            </div>
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-3.jpg" alt="" />
                                            </div>
                                            <div class="avatar avatar-40 rounded-circle coverimg">
                                                <img src="assets/img/user-4.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col mb-3">
                                            <p class="mb-1">+ 16</p>
                                            <p class="text-secondary small">Team Members</p>
                                        </div>
                                        <div class="col-auto mb-3">
                                            <button matIconButton><mat-icon class="material-icons-outlined">person_add</mat-icon></button>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                    </swiper-container>
                </div>
                <!-- recent document updates -->
                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="mb-3">
                                <h3 class="mb-1">Document Updates</h3>
                                <p class="text-secondary small">Stat tuned with recent changes</p>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-0 position-relative">
                            <swiper-container slides-per-view="1" space-between="0px" autoplay="false" pagination='{"el":".pagination-v"}' pagination-clickable="true" direction="vertical" class="swiper height-160">
                                <swiper-slide class="">
                                    <swiper-container slides-per-view="3.8" space-between="20px" autoplay="true" class="swiper">
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document1.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document2.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document3.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document4.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                    </swiper-container>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded coverimg">
                                                <img src="assets/img/product3.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class=" mb-1">Lindsey Group</p>
                                            <p class="text-secondary small">AI Automation</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="">
                                    <swiper-container slides-per-view="3.8" space-between="20px" autoplay="true" class="swiper">
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document3.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document4.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document1.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document2.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                    </swiper-container>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded coverimg">
                                                <img src="assets/img/product2.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class=" mb-1">Manhowar Lineup</p>
                                            <p class="text-secondary small">Industrial Safety Project</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                <swiper-slide class="">
                                    <swiper-container slides-per-view="3.8" space-between="20px" autoplay="true" class="swiper">
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document4.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document3.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document2.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                        <swiper-slide class="">
                                            <mat-card class="overflow-hidden mb-3">
                                                <mat-card-content class="coverimg height-50">
                                                    <img src="assets/img/document1.jpg" alt="" />
                                                </mat-card-content>
                                            </mat-card>
                                        </swiper-slide>
                                    </swiper-container>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded coverimg">
                                                <img src="assets/img/product3.jpg" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class=" mb-1">BookShow Your</p>
                                            <p class="text-secondary small">Event Booking Platform</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                            </swiper-container>
                            <div class="pagination-v position-absolute end-0 bottom-0 m-3"></div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <app-projects-cards></app-projects-cards>
            <app-projects-grid></app-projects-grid>
        </div>
    `,
    styles: [
        `
            :host ::ng-deep swiper-container.small-nav-v50::part(button-next),
            :host ::ng-deep swiper-container.small-nav-v50::part(button-prev) {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                top: 0;
                margin-top: 1.4rem;
                left: auto;
                right: 1rem;
            }
            :host ::ng-deep swiper-container.small-nav-v50::part(button-prev) {
                right: 2.5rem;
            }
        `,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectsComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

    // filter on off
    filterOn = true;
    currentWidth = signal(0);

    // view mode day
    viewMode = signal<ViewMode>("day");

    // width check
    @HostListener("window:resize", ["$event"])
    onResize(event: Event) {
        this.checkWidthAndSetFilter();
    }

    ngOnInit() {}
    ngAfterViewInit() {
        // width check
        this.checkWidthAndSetFilter();
    }

    toggleFilter(): void {
        this.filterOn = !this.filterOn;
    }

    checkWidthAndSetFilter() {
        const width = window.innerWidth;
        this.currentWidth.set(width);

        const shouldBeOff = width < 992;

        if (this.filterOn === shouldBeOff) {
            this.filterOn = !this.filterOn;
        }
    }

    openDialog() {
        this.dialog.open(CreateEditProjectModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: {},
        });
    }
}
