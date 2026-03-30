import { Component, ElementRef, Renderer2, signal, viewChild, ViewChild, WritableSignal, OnDestroy, OnInit, AfterViewInit, Inject, HostListener } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { AppConfig } from "../../app.config";
import { RouterOutlet } from "@angular/router";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { AppHeaderComponent } from "../../components/app-header/app-header.component";
import { AppSidebarComponent } from "../../components/app-sidebar/app-sidebar.component";
import { AppFooterComponent } from "../../components/app-footer/app-footer.component";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { Observable } from "rxjs";
import { map, shareReplay } from "rxjs/operators";
import { AsyncPipe, CommonModule } from "@angular/common";
import { ThemeComponent } from "../../components/theme/theme.component";
import { NotificationSidenavComponent } from "../../components/notification-sidenav/app-notification-sidenav.component";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

type SidenavView = "theme" | "settings" | null;

// default theme classes
const themes = [
    { name: "Red", class: "theme-red" },
    { name: "Green", class: "theme-green" },
    { name: "Blue", class: "theme-blue" },
    { name: "Yellow", class: "theme-yellow" },
    { name: "Cyan", class: "theme-cyan" },
    { name: "Magenta", class: "theme-magenta" },
    { name: "Orange", class: "theme-orange" },
    { name: "Chartreuse", class: "theme-chartreuse" },
    { name: "Teal", class: "theme-spring-green" },
    { name: "Azure", class: "theme-azure" },
    { name: "Violet", class: "theme-violet" },
    { name: "Rose", class: "theme-rose" },
    { name: "Custom", class: "theme-custom" },
];

@Component({
    selector: "app-app-layout",
    standalone: true,
    imports: [RouterOutlet, CommonModule, MatSidenavModule, MatToolbarModule, MatIconModule, MatButtonModule, AppHeaderComponent, AppSidebarComponent, AppFooterComponent, AsyncPipe, ThemeComponent, NotificationSidenavComponent],
    template: `
        <div class="app-layout" [class.is-mobile]="isMobile">
            <mat-sidenav-container class="sidenav-container" [ngClass]="iconicSidebar() && !isMobile ? (drawers.opened ? 'icon-sidebar-opened' : 'icon-sidebar-closed') : ''">
                <!-- main sidebar -->
                <mat-sidenav #drawers class="sidenav" fixedInViewport [attr.role]="(isHandset$ | async) ? 'dialog' : 'navigation'" [mode]="(isHandset$ | async) ? 'over' : 'side'" [opened]="false">
                    <app-app-sidebar [drawers]="drawers"></app-app-sidebar>
                </mat-sidenav>

                <mat-sidenav-content class="main-sidenav-content">
                    <!-- header -->
                    <app-app-header [drawers]="drawers" (openSettingsMenu)="openSidenav('settings')" id="appheader" #appheader></app-app-header>

                    <!-- content -->
                    <main class="main-content" id="appmain" #appmain>
                        <router-outlet></router-outlet>
                    </main>

                    <!-- footer  -->
                    <app-app-footer id="appfooter" #appfooter></app-app-footer>

                    <!-- theme -->
                    <div class="position-fixed bottom-0 end-0 mx-2 my-3 z-index-9 theme-button">
                        <button matMiniFab class="theme-magenta" aria-label="theme" (click)="openSidenav('theme')">
                            <mat-icon>palette</mat-icon>
                        </button>
                    </div>
                </mat-sidenav-content>

                <mat-sidenav #sidenav position="end" fixedInViewport mode="over" class=" bg-light-gradient">
                    <mat-toolbar class="bg-none">
                        <h2 class="fw-bold">{{ currentView() === "theme" ? "Theme Selection" : "Notifications" }}</h2>
                        <span class="spacer"></span>
                        <button matIconButton aria-label="theme close" (click)="sidenav.close()">
                            <mat-icon>close</mat-icon>
                        </button>
                    </mat-toolbar>

                    @if (currentView() === "theme") {
                        <!-- theme -->
                        <app-theme></app-theme>
                    } @else if (currentView() === "settings") {
                        <!-- settings -->
                        <app-notification-sidenav></app-notification-sidenav>
                    }
                </mat-sidenav>
            </mat-sidenav-container>
        </div>
    `,
    styles: [``],
})
export class AppLayoutComponent implements OnInit, OnDestroy {
    isMobile = false;
    readonly iconicSidebar = AppConfig.iconicSidebar;

    private destroy$ = new Subject<void>();
    private resizeObserver: ResizeObserver | null = null;
    private footerMobileObserver: ResizeObserver | null = null;

    @ViewChild("appheader", { read: ElementRef }) appHeader!: ElementRef<HTMLElement>;
    @ViewChild("appfooter", { read: ElementRef }) appFooter!: ElementRef<HTMLElement>;
    @ViewChild("appmain", { read: ElementRef }) appMain!: ElementRef<HTMLElement>;

    sidenav = viewChild<MatSidenav>("sidenav");

    currentView: WritableSignal<SidenavView> = signal(null);

    isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
        map((result) => result.matches),
        shareReplay(),
    );

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        private breakpointObserver: BreakpointObserver,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        // mobile view detect to add is-mobile class on body
        this.breakpointObserver
            .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape])
            .pipe(takeUntil(this.destroy$))
            .subscribe((result) => {
                // 'result.matches' is true if the current screen size matches one of the observed breakpoints
                this.isMobile = result.matches;
            });
    }

    ngAfterViewInit(): void {
        // min height set resize using ResizeObserver
        this.calculateMainHeight();
        this.setupResizeObserver();
        this.setupFooterMobileObserver();
    }

    private setupResizeObserver(): void {
        // Use ResizeObserver for header and footer size changes
        const headerElement = this.appHeader?.nativeElement;
        const footerElement = this.appFooter?.nativeElement;

        if (headerElement || footerElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.calculateMainHeight();
            });
            if (headerElement) this.resizeObserver.observe(headerElement);
            if (footerElement) this.resizeObserver.observe(footerElement);
        }
    }

    private setupFooterMobileObserver(): void {
        // Use ResizeObserver for footer mobile element changes
        const footerMobileElement = this.el.nativeElement.querySelector(".mobile-footer");

        if (footerMobileElement) {
            this.footerMobileObserver = new ResizeObserver(() => {
                this.adjustPadding();
            });
            this.footerMobileObserver.observe(footerMobileElement);
        }
    }
    // min height for main cotnent
    calculateMainHeight(): void {
        const headerH = this.appHeader?.nativeElement?.offsetHeight || 0;
        const footerH = this.appFooter?.nativeElement?.offsetHeight || 0;
        const mainEl = this.appMain?.nativeElement;
        if (mainEl) {
            const style = `--min-height: calc(100vh - (1rem + ${headerH + footerH}px)); margin-top: calc( ${headerH}px)`;
            this.renderer.setAttribute(mainEl, "style", style);
        }
    }
    // open sidebar
    openSidenav(view: SidenavView) {
        this.currentView.set(view);
        const sidenav = this.sidenav();
        if (sidenav) {
            sidenav.open();
        }
    }

    // footer mobile bottom space
    adjustPadding() {
        const footerMobileElement = this.el.nativeElement.querySelector(".mobile-footer");
        const themeButton = this.el.nativeElement.querySelector(".theme-button");

        if (footerMobileElement) {
            const footerMobileHeight = footerMobileElement.offsetHeight;
            this.renderer.setStyle(this.document.body, "padding-bottom", `calc(${footerMobileHeight}px + env(safe-area-inset-bottom) + 1rem )`);
            this.renderer.setStyle(themeButton, "padding-bottom", `calc(${footerMobileHeight}px + env(safe-area-inset-bottom) + 1rem )`);
        } else {
            this.renderer.setStyle(this.document.body, "padding-bottom", "0");
            this.renderer.setStyle(themeButton, "padding-bottom", "0");
        }
    }

    // responsive is mobile
    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.footerMobileObserver) {
            this.footerMobileObserver.disconnect();
            this.footerMobileObserver = null;
        }
        this.destroy$.next();
        this.destroy$.complete();
    }
}
