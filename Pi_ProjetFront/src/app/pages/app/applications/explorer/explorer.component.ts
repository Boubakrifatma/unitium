import { Component, Renderer2, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, inject, Inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DOCUMENT } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from "@angular/material/button";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatListModule, MatNavList } from "@angular/material/list";
import { MatSelectModule } from "@angular/material/select";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";

import { CircleProgressBlueBlankComponent } from "../../../../components/charts/circle-progress-blue-blank.component";
import { CircleProgressBlueComponent } from "../../../../components/charts/circle-progress-blue.component";
import { ExplorerBannerChartComponent } from "../../../../components/charts/explorer-banner-chart.component";
import { EditFileDialogComponent } from "./editfile.component";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { CircleProgressYellowBlankComponent } from "../../../../components/charts/circle-progress-yellow-blank.component";
import { CircleProgressRedBlankComponent } from "../../../../components/charts/circle-progress-red-blank.component";
import { CircleProgressWhiteBlankComponent } from "../../../../components/charts/circle-progress-white-blank.component";

// Navigation inner
interface NavItem {
    name: string;
    route?: string;
    icon: string;
    children?: NavItem[];
}

// Filedata input
export interface RawFile {
    "File Image": string;
    "File Name": string;
    "Upload by": string;
    "Date Created": string;
    Time: string;
    "Date Modified": string;
    "Modified by": string;
    "Share Status": string;
    "File size": string;
    Action: string;
    "Is Active": boolean;
}

// Filedata Camelcase
export interface FileData {
    fileImage: string;
    fileName: string;
    uploadBy: string;
    dateCreated: string;
    time: string;
    dateModified: string;
    modifiedBy: string;
    shareStatus: string;
    fileSize: string;
    action: string;
    isActive: boolean;
}

@Component({
    selector: "app-explorer",
    standalone: true,
    imports: [RouterLink, MatCardModule, MatToolbarModule, MatDialogModule, MatExpansionModule, MatListModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatIconModule, MatButtonModule, MatMenuModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatSortModule, CircleProgressBlueBlankComponent, CircleProgressBlueComponent, CircleProgressYellowBlankComponent, CircleProgressRedBlankComponent, CircleProgressWhiteBlankComponent, ExplorerBannerChartComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Explorer</h3>
                        <p class="text-secondary small">Manage your files with ease</p>
                    </div>
                </div>
            </mat-card>
        </div>

        <!-- content -->
        <app-explorer-banner-chart class="height-150 d-block"></app-explorer-banner-chart>

        <div class="container">
            <div class="row gx-3 gx-lg-4">
                <!-- summary blocks -->
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto text-center order-1 order-md-1">
                                    <div class="position-relative">
                                        <div class="avatar avatar-60 card rounded-circle text-center mb-1 position-relative theme-azure ">
                                            <app-circle-progress-blue-blank class="avatar avatar-60 mx-auto"></app-circle-progress-blue-blank>
                                            <div class="avatar avatar-40 h5 position-absolute start-50 top-50 translate-middle bg-light-theme text-theme rounded-circle">
                                                <mat-icon class="material-icons-outlined">language</mat-icon>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-3 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Webspace</p>
                                    <h3>5.5GB <small>used</small></h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                        <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                    </button>
                                    <mat-menu #actionsMenu="matMenu">
                                        <button mat-menu-item><mat-icon class="material-icons-outlined">edit</mat-icon><span>Edit</span></button>
                                        <button mat-menu-item><mat-icon class="material-icons-outlined">delete</mat-icon><span>Delete</span></button>
                                    </mat-menu>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto text-center order-1 order-md-1">
                                    <div class="position-relative">
                                        <div class="avatar avatar-60 card rounded-circle text-center mb-1 position-relative">
                                            <app-circle-progress-yellow-blank class="avatar avatar-60 mx-auto"></app-circle-progress-yellow-blank>
                                            <div class="avatar avatar-40 h5 position-absolute start-50 top-50 translate-middle bg-light-theme text-theme theme-orange rounded-circle">
                                                <mat-icon class="material-icons-outlined">file_copy</mat-icon>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-3 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Server</p>
                                    <h3>2569k<small>Files</small></h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <button matIconButton [matMenuTriggerFor]="actionsMenu2" aria-label="Actions" (click)="$event.stopPropagation()">
                                        <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                    </button>
                                    <mat-menu #actionsMenu2="matMenu">
                                        <button mat-menu-item><mat-icon class="material-icons-outlined">edit</mat-icon><span>Edit</span></button>
                                        <button mat-menu-item><mat-icon class="material-icons-outlined">delete</mat-icon><span>Delete</span></button>
                                    </mat-menu>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto text-center order-1 order-md-1">
                                    <div class="position-relative">
                                        <div class="avatar avatar-60 card rounded-circle text-center mb-1 position-relative">
                                            <app-circle-progress-red-blank class="avatar avatar-60 rounded-circle"></app-circle-progress-red-blank>
                                            <div class="avatar avatar-40 h5 position-absolute start-50 top-50 translate-middle bg-light-theme text-theme theme-red rounded-circle">
                                                <mat-icon class="material-icons-outlined">storage</mat-icon>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-3 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">SSD used</p>
                                    <h3>1.15<small>TB</small></h3>
                                </div>
                                <div class="col-auto col-sm-12 col-md-auto avatar-group mt-0 mt-sm-3 mt-md-0 order-2 order-md-3 ms-auto">
                                    <figure class="avatar avatar-30 rounded-circle coverimg" data-bs-toggle="tooltip" data-bs-placement="top" title="Just Demo">
                                        <img src="assets/img/product1.jpg" alt="" />
                                    </figure>
                                    <figure class="avatar avatar-30 rounded-circle coverimg" data-bs-toggle="tooltip" data-bs-placement="top" title="Preview Purpose">
                                        <img src="assets/img/product2.jpg" alt="" />
                                    </figure>
                                    <figure class="avatar avatar-30 rounded-circle coverimg" data-bs-toggle="tooltip" data-bs-placement="top" title="to look real">
                                        <img src="assets/img/product3.jpg" alt="" />
                                    </figure>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="bg-theme text-white mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto text-center order-1 order-md-1">
                                    <div class="position-relative">
                                        <div class="avatar avatar-60 bg-theme rounded-circle text-center mb-1 position-relative">
                                            <app-circle-progress-white-blank class="avatar avatar-60 mx-auto"></app-circle-progress-white-blank>
                                            <div class="avatar avatar-40 position-absolute start-50 top-50 translate-middle bg-white-opacity text-white rounded-circle">
                                                <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-3 mt-3 mt-md-0">
                                    <p class="opacity-75 small mb-1">Bills</p>
                                    <h3>186 <small>USD</small></h3>
                                </div>
                                <div class="col-auto col-sm-12 col-md-auto avatar-group mt-0 mt-sm-3 mt-md-0 order-2 order-md-3 ms-auto">
                                    <figure class="avatar avatar-30 rounded-circle coverimg overlay-ms-15" data-bs-toggle="tooltip" data-bs-placement="top" title="Shelvey Doe">
                                        <img src="assets/img/user-2.jpg" alt="" />
                                    </figure>
                                    <figure class="avatar avatar-30 rounded-circle coverimg overlay-ms-15" data-bs-toggle="tooltip" data-bs-placement="top" title="Maria Smith">
                                        <img src="assets/img/user-3.jpg" alt="" />
                                    </figure>
                                    <figure class="avatar avatar-30 rounded-circle coverimg overlay-ms-15" data-bs-toggle="tooltip" data-bs-placement="top" title="Steve Branden">
                                        <img src="assets/img/user-4.jpg" alt="" />
                                    </figure>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            <div class="row gx-3 gx-lg-4">
                <!-- summary-->
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto order-1 order-md-1">
                                    <div class="avatar avatar-50 rounded bg-theme theme-blue text-white">
                                        <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-2 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Docs</p>
                                    <h3 class="">1254 files</h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <app-circle-progress-blue class="avatar avatar-60 mx-auto"></app-circle-progress-blue>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto order-1 order-md-1">
                                    <div class="avatar avatar-50 rounded bg-theme theme-green text-white">
                                        <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-2 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Musics</p>
                                    <h3 class="">3200 files</h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <app-circle-progress-green class="avatar avatar-60 mx-auto"></app-circle-progress-green>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto order-1 order-md-1">
                                    <div class="avatar avatar-50 rounded bg-theme theme-orange text-white">
                                        <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-2 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Videos</p>
                                    <h3 class="">165 files</h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <app-circle-progress-yellow class="avatar avatar-60 mx-auto"></app-circle-progress-yellow>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-sm-6 col-lg-6 col-xxl-3">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto order-1 order-md-1">
                                    <div class="avatar avatar-50 rounded bg-theme theme-red text-white">
                                        <mat-icon class="material-icons-outlined">receipt</mat-icon>
                                    </div>
                                </div>
                                <div class="col order-3 order-md-2 mt-3 mt-md-0">
                                    <p class="text-secondary small mb-1">Other</p>
                                    <h3 class="">2589 files</h3>
                                </div>
                                <div class="col-auto order-2 order-md-3 ms-auto">
                                    <app-circle-progress-red class="avatar avatar-60 mx-auto"></app-circle-progress-red>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="text-center py-3 mb-3 mb-lg-4">
                <h2 class="mb-2">Better you manage space, <span class="text-gradient">Awesome things</span> you will get soon</h2>
                <p class="text-secondary">Files Management and all possible are on demand in digital age transformation.</p>
            </div>
            <div class="row gx-3">
                <div class="col-auto col-md col-lg-auto order-1 order-xl-1 mb-3">
                    <button matIconButton (click)="innersidebar()" aria-label="Inner Menu">
                        <mat-icon class="material-icons-outlined">view_sidebar</mat-icon>
                    </button>
                    <span class="px-3 d-none d-lg-inline-block">Explore your Files</span>
                    <button matIconButton>
                        <mat-icon class="material-icons-outlined">create_new_folder</mat-icon>
                    </button>
                    <button matIconButton>
                        <mat-icon class="material-icons-outlined">note_add</mat-icon>
                    </button>
                    <button matIconButton disabled>
                        <mat-icon class="material-icons-outlined">delete</mat-icon>
                    </button>
                </div>
                <div class="col-12 col-md-12 col-xl-3 order-3 order-xl-2 ms-auto mb-3">
                    <mat-form-field appearance="outline" class="inline-small border-light w-100">
                        <input matInput placeholder="Search..." />
                        <mat-icon matSuffix>search</mat-icon>
                    </mat-form-field>
                </div>
                <div class="col-auto col-md-auto order-2 order-xl-3 mb-3 ms-auto ms-xl-0">
                    <button matIconButton class="d-none d-sm-inline-block">
                        <mat-icon class="material-icons-outlined">help</mat-icon>
                    </button>
                    <button matIconButton>
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                    </button>
                    <span class="text-secondary small">30/500</span>
                    <button matIconButton>
                        <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                    </button>
                </div>
            </div>

            <!-- file explorer -->
            <div class="inner-sidebar-wrap mb-3">
                <div class="inner-sidebar p-3">
                    <button matButton="elevated" class="w-100 mb-3" type="button"><mat-icon class="material-icons-outlined">cloud_upload</mat-icon> Upload File</button>
                    <!-- nav list -->
                    <nav class="sidebar-nav mb-3 mb-lg-4">
                        <mat-nav-list>
                            @for (item of navItems; track item.name) { @if (item.children) {
                            <!-- Parent menu item with children -->
                            <mat-expansion-panel class="">
                                <mat-expansion-panel-header class="nav-item-header p-0 h-auto">
                                    <mat-panel-title class="flex items-center p-3">
                                        <mat-icon matListItemIcon class="material-icons-outlined">{{ item.icon }}</mat-icon>
                                        <span class="flex-grow">{{ item.name }}</span>
                                    </mat-panel-title>
                                </mat-expansion-panel-header>
                                <mat-nav-list>
                                    @for (child of item.children; track child.name) { @if (child.children) {
                                    <!-- Second-level dropdown -->
                                    <mat-expansion-panel class="">
                                        <mat-expansion-panel-header class="nav-item-header p-0 h-auto">
                                            <mat-panel-title class="flex items-center p-3">
                                                <mat-icon matListItemIcon class="material-icons-outlined">{{ child.icon }}</mat-icon>
                                                <span class="flex-grow">{{ child.name }}</span>
                                            </mat-panel-title>
                                        </mat-expansion-panel-header>
                                        <mat-nav-list>
                                            @for (grandchild of child.children; track grandchild.name) {
                                            <a mat-list-item [routerLink]="'/app/' + grandchild.route" routerLinkActive="active" class="nav-item pl-6 py-2">
                                                <mat-icon matListItemIcon class="material-icons-outlined">{{ grandchild.icon }}</mat-icon>
                                                <span matListItemTitle>{{ grandchild.name }}</span>
                                            </a>
                                            }
                                        </mat-nav-list>
                                    </mat-expansion-panel>
                                    } @else {
                                    <!-- Simple link inside parent -->
                                    <a mat-list-item [routerLink]="'/app/' + child.route" routerLinkActive="active" class="nav-item pl-6 py-2">
                                        <mat-icon matListItemIcon class="material-icons-outlined">{{ child.icon }}</mat-icon>
                                        <span matListItemTitle>{{ child.name }}</span>
                                    </a>
                                    } }
                                </mat-nav-list>
                            </mat-expansion-panel>
                            } @else {
                            <!-- Simple top-level link -->
                            <a mat-list-item [routerLink]="'/app/' + item.route" routerLinkActive="active" class="nav-item px-3 py-3 rounded-lg">
                                <mat-icon matListItemIcon class="material-icons-outlined">{{ item.icon }}</mat-icon>
                                <span matListItemTitle>{{ item.name }}</span>
                            </a>
                            } }
                        </mat-nav-list>
                    </nav>

                    <div class="row gx-3">
                        <div class="col-auto mb-3">
                            <div class="rounded bg-theme text-white p-2 text-center">
                                <mat-icon class="material-icons-outlined">cloud</mat-icon>
                                <p class="small">Cloud</p>
                            </div>
                        </div>
                        <div class="col align-self-center mb-3">
                            <p class="mb-2">Storage</p>
                            <mat-progress-bar mode="determinate" value="40" class="mb-2"></mat-progress-bar>
                            <p class="small text-secondary">5.4GB of 6GB used</p>
                        </div>
                    </div>
                    <mat-card class="bg-light-theme theme-cyan">
                        <mat-card-content>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <p>Free Plan</p>
                                </div>
                                <div class="col-auto">
                                    <p class="small opacity-75">4 days left</p>
                                </div>
                            </div>
                            <mat-progress-bar mode="determinate" value="40" class="mb-2 theme-blue"></mat-progress-bar>
                            <a matButton routerLink="/app/subscription-plans">Upgrade <mat-icon iconPositionEnd>arrow_forward_ios</mat-icon></a>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="inner-sidebar-content">
                    <div class="row gx-3 gx-lg-4 mb-3">
                        <div class="col-12 col-sm-6 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product1.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">Construction-portal.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-sm-6 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product2.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">networking.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-sm-6 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product3.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">savemoremoney.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-sm-6 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product4.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">Kitchen_colors_defination.jpg</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <!-- folders -->
                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                        <div class="col-auto">
                            <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <h4 class="mb-0">Folders</h4>
                            <p class="small text-secondary">Recently viewed by <a href="">Alliana Smith</a></p>
                        </div>
                        <div class="col-auto">
                            <button matButton>Recent <mat-icon iconPositionEnd>sort</mat-icon></button>
                        </div>
                    </div>
                    <div class="row gx-3 gx-lg-4 mb-3">
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">William's School</p>
                                            <p class="small text-secondary">18 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Music Audition</p>
                                            <p class="small text-secondary">3 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Housing Papers</p>
                                            <p class="small text-secondary">6 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Lisa's Tuition</p>
                                            <p class="small text-secondary">4 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Bills Housing</p>
                                            <p class="small text-secondary">8 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Trip Photos</p>
                                            <div class="row gx-3">
                                                <div class="col">
                                                    <p class="small text-secondary">16 Files</p>
                                                </div>
                                                <div class="col-auto small"><i class="bi bi-share me-1 fs-12"></i> Shared</div>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-30 rounded text-theme">
                                                <mat-icon class="material-icons-outlined">folder</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 55px)">
                                            <p class="mb-0 text-truncated">Money Presentation</p>
                                            <p class="small text-secondary">10 Files</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                    <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                        <div class="col-auto">
                            <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                <mat-icon class="material-icons-outlined">file_copy</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <h4 class="mb-0">Files</h4>
                            <p class="small text-secondary">Recently added by <a href="">Yaan Lee</a></p>
                        </div>
                        <div class="col-auto">
                            <button matButton>Recent <mat-icon iconPositionEnd>sort</mat-icon></button>
                        </div>
                    </div>
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product5.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">Construction-portal.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product6.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">networking.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product7.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">savemoremoney.pdf</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-4 col-lg-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <div mat-card-image class="height-150 w-100 coverimg mb-3">
                                    <img src="assets/img/product1.jpg" class="w-100" alt="" />
                                </div>
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <a href="javascript:void(0)" class="avatar avatar-40 rounded bg-light-theme text-theme theme-red">
                                                <mat-icon class="material-icons-outlined">picture_as_pdf</mat-icon>
                                            </a>
                                        </div>
                                        <div class="col maxwidth-dynamic" style="--mw-dynamic: calc(100% - 65px)">
                                            <p class="mb-1 text-truncated">Kitchen_colors_defination.jpg</p>
                                            <p class="small text-secondary">28/02/2022</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <!-- Grid table-->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3">
                                        <div class="avatar avatar-40 bg-light-theme text-theme rounded">
                                            <mat-icon class="material-icons-outlined">view_list</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col-9 col-xl mb-3">
                                        <h4 class="mb-1">Shared with me</h4>
                                        <p class="small text-secondary">Sharpen details on trending products</p>
                                    </div>
                                    <div class="col-6 col-xl-3 mb-3">
                                        <mat-form-field appearance="outline" class="w-100 inline-small">
                                            <mat-label>Select Category</mat-label>
                                            <mat-select multiple>
                                                <mat-option value="all" selected>All Categories</mat-option>
                                                <mat-option value="shared">Shared</mat-option>
                                                <mat-option value="uploaded_by">Uploaded by</mat-option>
                                                <mat-option value="favorite">Favorite</mat-option>
                                            </mat-select>
                                        </mat-form-field>
                                    </div>
                                    <div class="col-6 col-xl-auto mb-3">
                                        <mat-form-field appearance="outline" class="w-100 inline-small">
                                            <mat-label>Search Files</mat-label>
                                            <input matInput (keyup)="applyFilter($event)" placeholder="Filter by name, status, or user" #input />
                                            <mat-icon matSuffix>search</mat-icon>
                                        </mat-form-field>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <table mat-table [dataSource]="dataSource" matSort class="bg-none responsive-table">
                                <!-- File Name Column -->
                                <ng-container matColumnDef="fileName">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.fileName }}</th>
                                    <td mat-cell *matCellDef="let element" class="py-2">
                                        <p class="mat-mobile-label">{{ keysMap.fileName }}</p>
                                        <div class="row gx-3">
                                            <div class="col-auto">
                                                <div class="avatar avatar-40 rounded">
                                                    <img [src]="element.fileImage" alt="{{ element.fileName }}" class="" />
                                                </div>
                                            </div>
                                            <div class="col maxwidth-dynamic " style="--mw-dynamic: 140px">
                                                <p class="mb-0" (click)="openEditDialog(element)">
                                                    <span class="text-truncated d-inline-block align-middle maxwidth-dynamic me-1" style="--mw-dynamic: calc(100% - 20px)">{{ element.fileName }}</span>
                                                    <mat-icon class="text-theme text-sm material-icons-outlined">edit</mat-icon>
                                                </p>
                                                <p class="text-secondary small">{{ element.uploadBy }}</p>
                                            </div>
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- Date Created Column -->
                                <ng-container matColumnDef="dateCreated">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.dateCreated }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <p class="mat-mobile-label">{{ keysMap.dateCreated }}</p>
                                        <div>
                                            <p class="mb-0">{{ element.dateCreated }} {{ element.time }}</p>
                                            <p class="text-secondary small">{{ element.uploadBy }}</p>
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- Date Modified Column -->
                                <ng-container matColumnDef="dateModified">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.dateModified }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <p class="mat-mobile-label">{{ keysMap.dateModified }}</p>
                                        <div>
                                            <p class="mb-0">{{ element.dateModified }}</p>
                                            <p class="text-secondary small">
                                                {{ element.modifiedBy }}
                                            </p>
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- Modified by Column -->
                                <ng-container matColumnDef="modifiedBy">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.modifiedBy }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <p class="mat-mobile-label">{{ keysMap.modifiedBy }}</p>
                                        <div>
                                            {{ element.modifiedBy }}
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- Share Status Column -->
                                <ng-container matColumnDef="shareStatus">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.shareStatus }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <p class="mat-mobile-label">{{ keysMap.shareStatus }}</p>
                                        <div>
                                            @switch (element.shareStatus.trim().toLowerCase()) { @case ('shared') {
                                            <span class="badge badge-light theme-green"> Shared </span>
                                            } @case ('not shared') {
                                            <span class="badge badge-light theme-red"> Not Shared </span>
                                            } @case ('restricted') {
                                            <span class="badge badge-light theme-blue"> Restricted </span>
                                            } }
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- File Size Column -->
                                <ng-container matColumnDef="fileSize">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.fileSize }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <p class="mat-mobile-label">{{ keysMap.fileSize }}</p>
                                        <div>
                                            {{ element.fileSize }}
                                        </div>
                                    </td>
                                </ng-container>

                                <!-- Action Column -->
                                <ng-container matColumnDef="action">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ keysMap.action }}</th>
                                    <td mat-cell *matCellDef="let element">
                                        <button matIconButton [matMenuTriggerFor]="menu" aria-label="Example icon-button with a menu">
                                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                        </button>
                                        <mat-menu #menu="matMenu">
                                            <button mat-menu-item (click)="openEditDialog(element)">
                                                <mat-icon class="material-icons-outlined">edit</mat-icon>
                                                <span>Edit</span>
                                            </button>
                                            <button mat-menu-item>
                                                <mat-icon class="material-icons-outlined">delete_forever</mat-icon>
                                                <span>Delete</span>
                                            </button>
                                        </mat-menu>
                                    </td>
                                </ng-container>

                                <!-- Header and row definitions -->
                                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

                                <!-- No data row -->
                                <tr class="mat-row" *matNoDataRow>
                                    <td class="mat-cell" [attr.colspan]="displayedColumns.length">No files found matching the filter "{{ input.value }}"</td>
                                </tr>
                            </table>

                            <!-- Paginator -->
                            <mat-paginator class="bg-none" [pageSizeOptions]="[5, 10, 25, 100]" showFirstLastButtons></mat-paginator>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ExplorerComponent {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // dialog
    readonly dialog = inject(MatDialog);

    // inner sidebar menu
    navItems: NavItem[] = [
        { name: "My Drive", route: "explorer", icon: "cloud_upload" },
        { name: "Local Drive", route: "", icon: "computer" },
        { name: "Recent", route: "", icon: "schedule" },
        { name: "Social", route: "", icon: "people" },
        {
            name: "Shared",
            icon: "share",
            children: [
                { name: "Recent", route: "", icon: "schedule" },
                { name: "Popular", route: "", icon: "star" },
                { name: "Freebies", route: "", icon: "loyalty" },
            ],
        },
        {
            name: "Other",
            icon: "notes",
            children: [
                {
                    name: "Trash",
                    icon: "delete",
                    children: [
                        { name: "Recover", route: "", icon: "recycling" },
                        { name: "Deleted", route: "", icon: "auto_delete" },
                    ],
                },
                { name: "Spam", route: "", icon: "error" },
                { name: "Survey", route: "", icon: "edit_note" },
            ],
        },
        { name: "Settings", route: "", icon: "settings" },
    ];

    // file list table data
    dataFiles: RawFile[] = [
        {
            "File Image": "assets/img/product1.jpg",
            "File Name": "Construction-portal.pdf",
            "Upload by": "me",
            "Date Created": "28-03-2022",
            Time: "06:00 pm",
            "Date Modified": "29-03-2022 08:00 pm",
            "Modified by": " by Kevin Doglas",
            "Share Status": "Shared",
            "File size": "25.5 MB",
            Action: "EditMoveDelete",
            "Is Active": false,
        },
        {
            "File Image": "assets/img/product2.jpg",
            "File Name": "save-more-money.pptx",
            "Upload by": "me",
            "Date Created": "11-03-2022",
            Time: "06:00 pm",
            "Date Modified": "5-04-2022 01:11 pm ",
            "Modified by": "Me",
            "Share Status": "Shared",
            "File size": "11.15 MB",
            Action: "EditMoveDelete",
            "Is Active": true,
        },
        {
            "File Image": "assets/img/product3.jpg",
            "File Name": "Kitchen_colors_defination.pdf",
            "Upload by": "me",
            "Date Created": "19-03-2022",
            Time: "05:52 pm",
            "Date Modified": "09-03-2022 03:15 pm",
            "Modified by": " by Me",
            "Share Status": "Shared",
            "File size": "25.5 MB",
            Action: "EditMoveDelete",
            "Is Active": true,
        },
        {
            "File Image": "assets/img/product4.jpg",
            "File Name": "Networking-simulation.docx ",
            "Upload by": "John Doe",
            "Date Created": "17-03-2022",
            Time: "09:00 pm",
            "Date Modified": "3-04-2022 01:15 am ",
            "Modified by": "John Doe",
            "Share Status": "Not Shared",
            "File size": "11.12 MB",
            Action: "EditMoveDelete",
            "Is Active": true,
        },
        {
            "File Image": "assets/img/product5.jpg",
            "File Name": "Business-Presentation.pptx ",
            "Upload by": "Akita Dave(PM)",
            "Date Created": "11-03-2022",
            Time: "08:50 pm",
            "Date Modified": "29-03-2022 03:00 am",
            "Modified by": " by Ankita Dave(PM)",
            "Share Status": "Restricted",
            "File size": "13.2 MB",
            Action: "EditMoveDelete",
            "Is Active": true,
        },
        {
            "File Image": "assets/img/product6.jpg",
            "File Name": "small-worker.png",
            "Upload by": "me",
            "Date Created": "15-03-2022",
            Time: "06:00 pm",
            "Date Modified": "1-04-2022 10:00 pm ",
            "Modified by": "Me",
            "Share Status": "Shared",
            "File size": "25.5 MB",
            Action: "EditMoveDelete",
            "Is Active": false,
        },
    ];
    readonly keysMap: Record<keyof FileData, string> = {
        fileImage: "File Name",
        fileName: "File Name",
        uploadBy: "Upload by",
        dateCreated: "Date Created",
        time: "Time",
        dateModified: "Date Modified",
        modifiedBy: "Modified by",
        shareStatus: "Shared",
        fileSize: "File size",
        action: "Action",
        isActive: "Is Active",
    };
    public dataSource = new MatTableDataSource<FileData>();
    public displayedColumns: (keyof FileData)[] = ["fileName", "dateCreated", "dateModified", "shareStatus", "fileSize", "action"];

    constructor(
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document // Inject the DOCUMENT token
    ) {
        this.dataSource.data = this.transformDataKeys(this.dataFiles);
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
    }

    // search filter
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }
    private transformDataKeys(data: RawFile[]): FileData[] {
        return data.map((item) => {
            return {
                fileImage: item["File Image"].trim(),
                fileName: item["File Name"].trim(),
                uploadBy: item["Upload by"].trim(),
                dateCreated: item["Date Created"].trim(),
                time: item.Time.trim(),
                dateModified: item["Date Modified"].trim(),
                modifiedBy: item["Modified by"].trim(),
                shareStatus: item["Share Status"].trim(),
                fileSize: item["File size"].trim(),
                action: item.Action.trim(),
                isActive: item["Is Active"],
            };
        });
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

    // edit file
    openEditDialog(file: RawFile): void {
        const dialogRef = this.dialog.open(EditFileDialogComponent, {
            width: "98%",
            maxWidth: "992px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: { ...file },
        });
    }
}
