import { Component, ElementRef, Renderer2, OnDestroy, AfterViewInit, ViewChild, Inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { AuthHeaderComponent } from "../../components/auth-header/auth-header.component";
import { AuthFooterComponent } from "../../components/auth-footer/auth-footer.component";

@Component({
    selector: "app-auth-layout",
    standalone: true,
    imports: [RouterOutlet, AuthHeaderComponent, AuthFooterComponent],
    template: `
        <div class="auth-layout position-relative">
            <div class="container-fluid px-0" id="authmain" #authmain>
                <div class="row gx-0 h-100">
                    <div class="col-12 col-lg-7 col-xl-6">
                        <app-auth-header id="authheader" #authheader></app-auth-header>
                        <main class="auth-main px-3">
                            <router-outlet></router-outlet>
                        </main>
                        <app-auth-footer id="authfooter" #authfooter></app-auth-footer>
                    </div>
                    <div class="col-12 col-lg-5 col-xl-6 position-relative d-none d-lg-block">
                        <div class=" coverimg opacity-100 h-100 w-100 position-absolute">
                            <img src="assets/img/background1.jpg" alt="" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [``],
})
export class AuthLayoutComponent implements AfterViewInit, OnDestroy {
    private resizeObserver: ResizeObserver | null = null;
    @ViewChild("authheader", { read: ElementRef }) authHeader!: ElementRef<HTMLElement>;
    @ViewChild("authfooter", { read: ElementRef }) authFooter!: ElementRef<HTMLElement>;
    @ViewChild("authmain", { read: ElementRef }) authMain!: ElementRef<HTMLElement>;

    constructor(private el: ElementRef, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) {}

    ngAfterViewInit(): void {
        this.calculateMainHeight();
        this.setupResizeObserver();

        this.renderer.setStyle(this.document.body, "padding-bottom", "0");
    }

    private setupResizeObserver(): void {
        // Use ResizeObserver and observe ViewChild elements
        const headerElement = this.authHeader?.nativeElement;
        const footerElement = this.authFooter?.nativeElement;

        if (headerElement || footerElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.calculateMainHeight();
            });
            if (headerElement) this.resizeObserver.observe(headerElement);
            if (footerElement) this.resizeObserver.observe(footerElement);
        }
    }

    calculateMainHeight(): void {
        const headerH = this.authHeader?.nativeElement?.offsetHeight || 0;
        const footerH = this.authFooter?.nativeElement?.offsetHeight || 0;
        const mainEl = this.authMain?.nativeElement;
        if (mainEl) {
            const style = `--min-height: calc(100vh - (${headerH + footerH}px))`;
            this.renderer.setAttribute(mainEl, "style", style);
        }
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
