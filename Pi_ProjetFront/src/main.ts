import { Component, OnInit, OnDestroy, ElementRef, Renderer2, enableProdMode, Injectable, signal, importProvidersFrom, APP_INITIALIZER, HostListener, Inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { routes } from "./app/app.routes"; // Assuming your routes are defined here
import { environment } from "./environments/environment";
import { filter } from "rxjs/operators";
import { RouterOutlet } from "@angular/router";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { authInterceptor } from "./app/auth/auth.interceptor";
import "@angular/compiler";

if (environment.production) {
    enableProdMode();
}
@Injectable({ providedIn: "root" })
export class LoadingService {
    private loading = signal(false);
    public readonly isLoading = this.loading.asReadonly();

    show() {
        this.loading.set(true);
    }

    hide() {
        this.loading.set(false);
    }
}

@Component({
    selector: "app-root",
    standalone: true,
    imports: [RouterOutlet, MatProgressBarModule],
    template: `@if (loadingService.isLoading()) {
            <mat-progress-bar mode="indeterminate" class="router-progress-bar w-100 z-index-9 position-fixed top-0 start-0"></mat-progress-bar>
        }
        <router-outlet></router-outlet>`,
    styles: [],
})
export class App implements OnInit, OnDestroy {
    lastScrollTop: number = 0;
    pagelength: number = 0;
    private resizeObserver: ResizeObserver | null = null;
    private mutationObserver: MutationObserver | null = null;
    private processedImages = new WeakSet<HTMLElement>();

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        public loadingService: LoadingService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit() {
        // Use MutationObserver to detect when child components render with cover images
        this.setupMutationObserver();
    }

    ngAfterViewInit(): void {
        // Process cover images once on initial view initialization
        this.processCoverImages();
    }

    private setupMutationObserver(): void {
        // Watch for DOM changes to catch dynamically rendered child components
        this.mutationObserver = new MutationObserver(() => {
            this.processCoverImages();
        });

        const config: MutationObserverInit = {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
        };

        this.mutationObserver.observe(this.el.nativeElement, config);
    }

    // coverimg
    private processCoverImages() {
        const coverImages = this.el.nativeElement.querySelectorAll(".coverimg");

        coverImages.forEach((coverImage: HTMLElement) => {
            // Skip if already processed
            if (this.processedImages.has(coverImage)) {
                return;
            }

            const imgElement = coverImage.querySelector("img");
            if (imgElement) {
                const imgSrc = imgElement.getAttribute("src");
                if (imgSrc) {
                    this.renderer.setStyle(coverImage, "background-image", `url('${imgSrc}')`);
                    this.renderer.removeChild(coverImage, imgElement); // Remove the img element
                    // Mark as processed
                    this.processedImages.add(coverImage);
                }
            }
        });
    }

    // on scroll direction check
    @HostListener("window:scroll")
    onWindowScroll() {
        const st = this.document.documentElement.scrollTop;
        this.pagelength = this.document.documentElement.scrollHeight - 50;

        if (st + this.document.documentElement.clientHeight <= this.pagelength && st >= 50) {
            if (st > this.lastScrollTop) {
                this.renderer.addClass(this.document.body, "scrolldown");
                this.renderer.removeClass(this.document.body, "scrollup");
            } else if (st <= this.lastScrollTop) {
                this.renderer.addClass(this.document.body, "scrollup");
                this.renderer.removeClass(this.document.body, "scrolldown");
            }
            this.lastScrollTop = st;
        } else {
            this.renderer.addClass(this.document.body, "scrollup");
            this.renderer.removeClass(this.document.body, "scrolldown");
        }
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }
}

bootstrapApplication(App, {
    providers: [
        provideAnimationsAsync(),
        importProvidersFrom(MatProgressBarModule),
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        LoadingService,
        {
            provide: APP_INITIALIZER,
            useFactory: (router: Router, loadingService: LoadingService, document: Document) => () => {
                // Apply persisted theme and direction before the app starts rendering
                try {
                    const dir = localStorage.getItem("app-dir") || "ltr";
                    document.documentElement.setAttribute("dir", dir);

                    const themes = ["theme-red", "theme-green", "theme-blue", "theme-yellow", "theme-cyan", "theme-magenta", "theme-orange", "theme-chartreuse", "theme-spring-green", "theme-azure", "theme-violet", "theme-rose", "theme-custom", "theme-sky"];
                    const theme = localStorage.getItem("app-theme") || "theme-sky";
                    themes.forEach((c) => document.body.classList.remove(c));
                    if (theme) document.body.classList.add(theme);

                    const mode = localStorage.getItem("app-mode");
                    if (mode === "true") {
                        document.body.classList.remove("light-mode");
                        document.body.classList.add("dark-mode");
                    } else {
                        document.body.classList.add("light-mode");
                        document.body.classList.remove("dark-mode");
                    }
                } catch (e) {
                    // ignore when document is not available
                }

                router.events.pipe(filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError)).subscribe((event) => {
                    if (event instanceof NavigationStart) {
                        loadingService.show();
                    } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
                        loadingService.hide();
                    }
                });
            },
            deps: [Router, LoadingService, DOCUMENT],
            multi: true,
        },
    ],
}).catch((err) => console.error(err));
