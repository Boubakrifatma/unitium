import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { marked } from "marked";
import { M2ProjectService } from "./m2-project.service";

@Component({
    selector: "app-project-readme-preview",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
    ],
    template: `
        <div class="container-fluid fade-in readme-preview-page mb-3 mb-lg-4">
            <mat-card class="shadow-none readme-header-card">
                <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div>
                        <p class="crumb-line mb-1">
                            <span routerLink="/app/dashboard" class="style-none">Home</span>
                            <mat-icon class="crumb-icon">chevron_right</mat-icon>
                            <span [routerLink]="['/app/real-projects']" [queryParams]="backListQueryParams()" class="style-none">Real Projects</span>
                            <mat-icon class="crumb-icon">chevron_right</mat-icon>
                            <span [routerLink]="['/app/real-projects', workspaceId(), projectId()]" [queryParams]="backProjectQueryParams()" class="style-none">Project Details</span>
                            <mat-icon class="crumb-icon">chevron_right</mat-icon>
                            README Preview
                        </p>
                        <h3 class="mb-1">{{ projectName() }} README Studio</h3>
                        <p class="text-secondary small mb-0">Live markdown editor + preview, inspired by markdownlivepreview.com</p>
                    </div>

                    <div class="d-flex flex-wrap gap-1">
                        <button matButton (click)="backToProjectDetails()">
                            <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                            Back
                        </button>
                        <button matButton [class.mode-active]="mode() === 'fast'" (click)="setMode('fast')" [disabled]="loading()">
                            <mat-icon class="material-icons-outlined">bolt</mat-icon>
                            Fast
                        </button>
                        <button matButton [class.mode-active]="mode() === 'enhanced'" (click)="setMode('enhanced')" [disabled]="loading()">
                            <mat-icon class="material-icons-outlined">auto_awesome</mat-icon>
                            Enhanced
                        </button>
                        <button matButton (click)="reloadFromServer()" [disabled]="loading()">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                            Reload
                        </button>
                        <button matButton="filled" (click)="downloadReadme()" [disabled]="loading()">
                            <mat-icon class="material-icons-outlined">download</mat-icon>
                            Download
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container-fluid fade-in readme-preview-page">
            @if (error()) {
            <mat-card class="mb-3 border theme-red">
                <mat-card-content>
                    <div class="d-flex align-items-start">
                        <mat-icon class="material-icons-outlined me-2 theme-red">error</mat-icon>
                        <div>
                            <p class="fw-semibold mb-1">README preview failed</p>
                            <p class="small mb-0">{{ error() }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            @if (loading()) {
            <mat-card class="mb-3">
                <mat-card-content class="py-4 d-flex align-items-center gap-2">
                    <mat-spinner diameter="24"></mat-spinner>
                    <span>Loading README from server...</span>
                </mat-card-content>
            </mat-card>
            } @else {
            <div class="row g-3">
                <div class="col-12 col-xl-6">
                    <mat-card class="preview-panel-card">
                        <mat-card-content>
                            <div class="panel-head">
                                <h4 class="mb-0">Markdown</h4>
                                <span class="small text-secondary">{{ editorMarkdown.length }} chars</span>
                            </div>
                            <textarea
                                class="markdown-editor"
                                [ngModel]="editorMarkdown"
                                (ngModelChange)="onMarkdownChange($event)"
                                spellcheck="false"
                                placeholder="# Your README markdown\n\nWrite or edit the generated README here...">
                            </textarea>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-xl-6">
                    <mat-card class="preview-panel-card">
                        <mat-card-content>
                            <div class="panel-head">
                                <h4 class="mb-0">Live Preview</h4>
                                <span class="small text-secondary">Mode: {{ mode() }}</span>
                            </div>

                            <div #previewShell class="preview-shell" (click)="onPreviewClick($event)">
                                @if (rendering()) {
                                <div class="preview-loading">
                                    <mat-spinner diameter="22"></mat-spinner>
                                    <span>Rendering preview...</span>
                                </div>
                                }

                                @if (editorMarkdown.trim().length === 0) {
                                <div class="empty-preview">
                                    <mat-icon class="material-icons-outlined">description</mat-icon>
                                    <p class="mb-0">No markdown content loaded.</p>
                                </div>
                                } @else {
                                <article class="markdown-preview" [innerHTML]="renderedHtml()"></article>
                                }
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            }
        </div>
    `,
    styles: [
        `
        .readme-preview-page {
            --readme-teal: #0f766e;
            --readme-ink: #111827;
        }

        .readme-header-card {
            padding: 14px 16px;
            border: 1px solid rgba(15, 23, 42, 0.1);
            background:
                radial-gradient(circle at 90% 10%, rgba(14, 116, 144, 0.2), transparent 40%),
                radial-gradient(circle at 8% 90%, rgba(20, 184, 166, 0.18), transparent 45%),
                linear-gradient(130deg, #f8fafc 0%, #eff6ff 40%, #ecfeff 100%);
        }

        .crumb-line {
            font-size: 12px;
            color: #475569;
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
        }

        .crumb-line .style-none {
            color: #0f766e;
            text-decoration: none;
            cursor: pointer;
        }

        .crumb-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
            color: #64748b;
        }

        .mode-active {
            background: rgba(15, 118, 110, 0.14);
            color: var(--readme-teal);
            border: 1px solid rgba(15, 118, 110, 0.3);
        }

        .preview-panel-card {
            border: 1px solid rgba(15, 23, 42, 0.1);
            overflow: hidden;
        }

        .panel-head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .panel-head h4 {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
        }

        .markdown-editor {
            width: 100%;
            min-height: 68vh;
            resize: vertical;
            border: 1px solid rgba(15, 23, 42, 0.14);
            border-radius: 12px;
            padding: 14px;
            line-height: 1.5;
            color: var(--readme-ink);
            background: #ffffff;
            font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
            font-size: 13px;
        }

        .markdown-editor:focus {
            outline: none;
            border-color: rgba(15, 118, 110, 0.65);
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
        }

        .preview-shell {
            min-height: 68vh;
            max-height: 68vh;
            overflow: auto;
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 12px;
            padding: 14px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .preview-loading {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: #475569;
            margin-bottom: 10px;
        }

        .empty-preview {
            height: 100%;
            min-height: 200px;
            display: grid;
            place-content: center;
            text-align: center;
            color: #64748b;
            gap: 8px;
        }

        .empty-preview mat-icon {
            font-size: 26px;
            width: 26px;
            height: 26px;
            margin: 0 auto;
        }

        .markdown-preview {
            color: #0f172a;
            line-height: 1.65;
            font-family: "Merriweather", Georgia, "Times New Roman", serif;
        }

        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3 {
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            letter-spacing: 0.01em;
            margin-top: 1.2em;
            margin-bottom: 0.55em;
            color: #0f172a;
        }

        .markdown-preview p,
        .markdown-preview li {
            color: #1f2937;
            font-size: 14px;
        }

        .markdown-preview ul,
        .markdown-preview ol {
            padding-left: 22px;
        }

        .markdown-preview table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 14px;
            font-size: 13px;
            background: #ffffff;
        }

        .markdown-preview th,
        .markdown-preview td {
            border: 1px solid rgba(148, 163, 184, 0.4);
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }

        .markdown-preview th {
            background: #f1f5f9;
            font-weight: 700;
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
        }

        .markdown-preview code {
            font-family: "JetBrains Mono", Consolas, monospace;
            background: rgba(15, 23, 42, 0.08);
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 12px;
        }

        .markdown-preview pre {
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            overflow: auto;
        }

        .markdown-preview pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }

        .markdown-preview blockquote {
            border-left: 4px solid #0ea5e9;
            margin: 10px 0;
            padding: 8px 12px;
            background: rgba(14, 165, 233, 0.08);
            color: #0f172a;
        }

        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3,
        .markdown-preview h4,
        .markdown-preview h5,
        .markdown-preview h6 {
            scroll-margin-top: 10px;
            position: relative;
        }

        .markdown-preview .heading-anchor-link {
            margin-left: 8px;
            color: #0f766e;
            text-decoration: none;
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 1px solid rgba(15, 118, 110, 0.28);
            background: rgba(15, 118, 110, 0.08);
            vertical-align: middle;
            opacity: 0;
            transition: opacity 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
        }

        .markdown-preview .heading-anchor-link::before {
            content: "\\2197";
            font-size: 11px;
            line-height: 1;
        }

        .markdown-preview h1:hover .heading-anchor-link,
        .markdown-preview h2:hover .heading-anchor-link,
        .markdown-preview h3:hover .heading-anchor-link,
        .markdown-preview h4:hover .heading-anchor-link,
        .markdown-preview h5:hover .heading-anchor-link,
        .markdown-preview h6:hover .heading-anchor-link {
            opacity: 1;
        }

        .markdown-preview a {
            color: #0f766e;
        }

        .markdown-preview img.markdown-image {
            display: block;
            max-width: min(100%, 760px);
            margin: 16px auto;
            border-radius: 14px;
            border: 1px solid rgba(15, 23, 42, 0.1);
            box-shadow: 0 16px 28px rgba(15, 23, 42, 0.14);
            background: #ffffff;
        }

        .markdown-preview .mermaid-block {
            margin: 12px 0 16px;
            border-radius: 12px;
            border: 1px solid rgba(15, 23, 42, 0.1);
            padding: 10px;
            background:
                radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 45%),
                linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            overflow: auto;
        }

        .markdown-preview .mermaid-block svg {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
        }

        .markdown-preview .mermaid-error {
            border-color: rgba(185, 28, 28, 0.28);
            background: rgba(254, 242, 242, 0.85);
            color: #7f1d1d;
        }

        .markdown-preview .dependency-tree {
            margin: 12px 0 16px;
            border-radius: 12px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            padding: 12px;
        }

        .markdown-preview .dependency-tree-title {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #334155;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .markdown-preview .dependency-tree-row {
            position: relative;
            margin: 3px 0;
            padding: 4px 8px;
            border-radius: 8px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: #ffffff;
            font-family: "JetBrains Mono", Consolas, monospace;
            font-size: 12px;
            margin-left: calc(var(--tree-depth, 0) * 18px);
        }

        .markdown-preview .anchor-flash {
            animation: anchorFlash 0.8s ease;
        }

        @keyframes anchorFlash {
            0% { background: rgba(14, 165, 233, 0.2); }
            100% { background: transparent; }
        }

        @media (max-width: 1199.98px) {
            .markdown-editor,
            .preview-shell {
                min-height: 52vh;
                max-height: 52vh;
            }
        }
        `,
    ],
})
export class ProjectReadmePreviewComponent implements OnInit {
    @ViewChild("previewShell") private previewShell?: ElementRef<HTMLDivElement>;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectService = inject(M2ProjectService);

    readonly workspaceId = signal("");
    readonly projectId = signal("");
    readonly mode = signal<"fast" | "enhanced">("fast");

    readonly loading = signal(false);
    readonly rendering = signal(false);
    readonly error = signal<string | null>(null);
    readonly projectName = signal("Project");
    readonly renderedHtml = signal("");

    editorMarkdown = "";
    private renderVersion = 0;
    private mermaidApi: any | null = null;

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const workspaceId = params.get("workspaceId") || "";
            const projectId = params.get("projectId") || "";

            this.workspaceId.set(workspaceId);
            this.projectId.set(projectId);
            this.mode.set(this.normalizeMode(this.route.snapshot.queryParamMap.get("mode")));

            if (!workspaceId || !projectId) {
                this.error.set("Missing workspaceId or projectId in route.");
                return;
            }

            this.loadProjectName(workspaceId, projectId);
            this.reloadFromServer();
        });
    }

    backListQueryParams(): Record<string, string> {
        const at = this.route.snapshot.queryParamMap.get("at");
        return at ? { at, workspaceId: this.workspaceId() } : { workspaceId: this.workspaceId() };
    }

    backProjectQueryParams(): Record<string, string> {
        const at = this.route.snapshot.queryParamMap.get("at");
        return at ? { at } : {};
    }

    backToProjectDetails(): void {
        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) {
            return;
        }

        this.router.navigate([
            "/app/real-projects",
            workspaceId,
            projectId,
        ], {
            queryParams: this.backProjectQueryParams(),
        });
    }

    setMode(mode: "fast" | "enhanced"): void {
        if (this.mode() === mode && this.editorMarkdown.trim().length > 0) {
            return;
        }

        this.mode.set(mode);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { mode },
            queryParamsHandling: "merge",
            replaceUrl: true,
        });
        this.reloadFromServer();
    }

    reloadFromServer(): void {
        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.projectService.viewProjectReadme(workspaceId, projectId, this.mode()).subscribe({
            next: (response) => {
                this.editorMarkdown = response.body || "";
                this.renderPreview();
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.error.set(this.errorMessage(error));
                this.snackBar.open(`Failed to load README preview: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
            },
        });
    }

    downloadReadme(): void {
        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) {
            return;
        }

        this.projectService.downloadProjectReadme(workspaceId, projectId, this.mode()).subscribe({
            next: (response) => {
                const blob = response.body ?? new Blob([""], { type: "text/markdown;charset=utf-8" });
                const filename = this.extractReadmeFilename(response.headers.get("content-disposition"))
                    || this.defaultReadmeFilename();
                this.downloadBlob(blob, filename);
            },
            error: (error: HttpErrorResponse) => {
                this.snackBar.open(`Failed to download README: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
            },
        });
    }

    onMarkdownChange(nextMarkdown: string): void {
        this.editorMarkdown = nextMarkdown || "";
        this.renderPreview();
    }

    onPreviewClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement)) {
            return;
        }

        const rawHref = (anchor.getAttribute("href") || "").trim();
        const explicitTarget = (anchor.getAttribute("data-anchor-target") || "").trim();
        const anchorTarget = explicitTarget || this.normalizeAnchorId(rawHref.startsWith("#") ? rawHref.slice(1) : "");

        if (!rawHref.startsWith("#") && !explicitTarget) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (anchorTarget) {
            this.scrollToAnchor(anchorTarget);
        }
    }

    private loadProjectName(workspaceId: string, projectId: string): void {
        this.projectService.getProjectById(workspaceId, projectId).subscribe({
            next: (project) => {
                if (project?.name) {
                    this.projectName.set(project.name);
                }
            },
            error: () => {
                // Keep default project name if this metadata call fails.
            },
        });
    }

    private renderPreview(): void {
        this.rendering.set(true);
        const html = marked.parse(this.editorMarkdown || "", {
            gfm: true,
            breaks: true,
        }) as string;

        const currentRender = ++this.renderVersion;
        this.renderedHtml.set(html);

        setTimeout(() => {
            this.enhanceRenderedMarkdown(currentRender)
                .finally(() => {
                    if (currentRender === this.renderVersion) {
                        this.rendering.set(false);
                    }
                });
        }, 0);
    }

    private async enhanceRenderedMarkdown(currentRender: number): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }

        const previewRoot = this.previewShell?.nativeElement;
        const article = previewRoot?.querySelector<HTMLElement>(".markdown-preview");
        if (!article || currentRender !== this.renderVersion) {
            return;
        }

        this.decorateHeadings(article);
        this.decorateLinks(article);
        this.decorateImages(article);
        this.decorateDependencyTreeBlocks(article);
        await this.renderMermaidBlocks(article, currentRender);
    }

    private decorateHeadings(article: HTMLElement): void {
        const seen = new Map<string, number>();
        const headings = article.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");

        headings.forEach((heading) => {
            const headingText = (heading.textContent || "").trim();
            const base = this.normalizeAnchorId(heading.id || headingText) || "section";
            const currentCount = seen.get(base) || 0;
            seen.set(base, currentCount + 1);

            const computedId = currentCount === 0 ? base : `${base}-${currentCount}`;
            if (!heading.id) {
                heading.id = computedId;
            }

            if (!heading.querySelector(".heading-anchor-link")) {
                const link = document.createElement("a");
                link.className = "heading-anchor-link";
                link.href = `#${heading.id}`;
                link.setAttribute("data-anchor-target", heading.id);
                link.setAttribute("aria-label", `Jump to ${headingText || heading.id}`);
                link.textContent = "";
                heading.appendChild(link);
            }
        });
    }

    private decorateLinks(article: HTMLElement): void {
        const links = article.querySelectorAll<HTMLAnchorElement>("a[href]");

        links.forEach((link) => {
            const href = (link.getAttribute("href") || "").trim();
            if (!href) {
                return;
            }

            if (href.startsWith("#")) {
                const targetId = this.normalizeAnchorId(href.slice(1));
                if (targetId) {
                    link.setAttribute("data-anchor-target", targetId);
                }
                return;
            }

            if (/^https?:\/\//i.test(href)) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
        });
    }

    private decorateImages(article: HTMLElement): void {
        const images = article.querySelectorAll<HTMLImageElement>("img");
        images.forEach((img, index) => {
            img.classList.add("markdown-image");
            img.loading = "lazy";
            img.decoding = "async";
            if (!img.alt || !img.alt.trim()) {
                img.alt = `README visual ${index + 1}`;
            }
        });
    }

    private decorateDependencyTreeBlocks(article: HTMLElement): void {
        const selector = [
            "pre > code[class*='language-tree']",
            "pre > code[class*='language-dependency']",
            "pre > code[class*='language-deps']",
        ].join(",");

        const blocks = article.querySelectorAll<HTMLElement>(selector);
        blocks.forEach((codeBlock) => {
            const pre = codeBlock.closest("pre");
            if (!(pre instanceof HTMLElement)) {
                return;
            }

            const raw = (codeBlock.textContent || "").replace(/\r/g, "");
            const lines = raw.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
            if (!lines.length) {
                return;
            }

            const wrapper = document.createElement("div");
            wrapper.className = "dependency-tree";

            const title = document.createElement("div");
            title.className = "dependency-tree-title";
            title.textContent = "Dependency Tree";
            wrapper.appendChild(title);

            lines.forEach((line) => {
                const depth = this.estimateTreeDepth(line);
                const label = line.replace(/^[\s|│├└─`+]+/, "").trim() || "node";
                const row = document.createElement("div");
                row.className = "dependency-tree-row";
                row.style.setProperty("--tree-depth", String(depth));
                row.textContent = label;
                wrapper.appendChild(row);
            });

            pre.replaceWith(wrapper);
        });
    }

    private async renderMermaidBlocks(article: HTMLElement, currentRender: number): Promise<void> {
        const blocks = article.querySelectorAll<HTMLElement>("pre > code[class*='language-mermaid']");
        if (!blocks.length) {
            return;
        }

        const mermaid = await this.loadMermaid();
        if (!mermaid || currentRender !== this.renderVersion) {
            return;
        }

        let index = 0;
        for (const codeBlock of Array.from(blocks)) {
            if (currentRender !== this.renderVersion) {
                return;
            }

            const pre = codeBlock.closest("pre");
            if (!(pre instanceof HTMLElement)) {
                continue;
            }

            const diagramCode = (codeBlock.textContent || "").trim();
            if (!diagramCode) {
                continue;
            }

            const wrapper = document.createElement("div");
            wrapper.className = "mermaid-block";

            try {
                const renderId = `readme-mermaid-${Date.now()}-${index++}`;
                const rendered = await mermaid.render(renderId, diagramCode);
                wrapper.innerHTML = rendered.svg;
            } catch {
                wrapper.classList.add("mermaid-error");
                wrapper.textContent = "Mermaid diagram could not be rendered. Showing raw source below.";
                wrapper.appendChild(pre.cloneNode(true));
            }

            pre.replaceWith(wrapper);
        }
    }

    private async loadMermaid(): Promise<any | null> {
        if (this.mermaidApi) {
            return this.mermaidApi;
        }

        try {
            const module = await import("mermaid");
            this.mermaidApi = module.default;
            this.mermaidApi.initialize({
                startOnLoad: false,
                securityLevel: "strict",
                theme: "neutral",
            });
            return this.mermaidApi;
        } catch {
            return null;
        }
    }

    private estimateTreeDepth(line: string): number {
        const prefix = (line.match(/^[\s|│├└─`+]+/) || [""])[0];
        const spaceGroups = (prefix.match(/ {2,4}/g) || []).length;
        const branchMarkers = (prefix.match(/[│|]/g) || []).length;
        return Math.max(0, Math.min(10, spaceGroups + branchMarkers));
    }

    private scrollToAnchor(anchorId: string): void {
        const previewRoot = this.previewShell?.nativeElement;
        const article = previewRoot?.querySelector<HTMLElement>(".markdown-preview");
        if (!article) {
            return;
        }

        const target = this.findAnchorTarget(article, anchorId);
        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("anchor-flash");
        target.classList.add("anchor-flash");
        setTimeout(() => target.classList.remove("anchor-flash"), 820);
    }

    private findAnchorTarget(root: HTMLElement, anchorId: string): HTMLElement | null {
        if (!anchorId) {
            return null;
        }

        const safeId = this.escapeCssId(anchorId);
        return root.querySelector<HTMLElement>(`#${safeId}`);
    }

    private escapeCssId(value: string): string {
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(value);
        }
        return value.replace(/["'\\#.:\[\]()]/g, "\\$&");
    }

    private normalizeAnchorId(value: string): string {
        let decoded = value || "";
        try {
            decoded = decodeURIComponent(decoded);
        } catch {
            // Keep original value when href is not URI-encoded.
        }

        let normalized = decoded.toLowerCase();
        normalized = normalized.replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
        return normalized;
    }

    private extractReadmeFilename(contentDisposition: string | null): string | null {
        if (!contentDisposition) {
            return null;
        }

        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) {
            try {
                return decodeURIComponent(utf8Match[1]).replace(/[\\/]/g, "-");
            } catch {
                return utf8Match[1].replace(/[\\/]/g, "-");
            }
        }

        const fallbackMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (fallbackMatch?.[1]) {
            return fallbackMatch[1].trim().replace(/[\\/]/g, "-");
        }

        return null;
    }

    private defaultReadmeFilename(): string {
        const projectName = this.projectName().trim() || "project";
        const safeProjectName = projectName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-+|-+$)/g, "") || "project";
        return `${safeProjectName}-readme-${this.mode()}-${new Date().toISOString().slice(0, 10)}.md`;
    }

    private downloadBlob(blob: Blob, fileName: string): void {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
    }

    private normalizeMode(raw: string | null): "fast" | "enhanced" {
        return (raw || "").toLowerCase() === "enhanced" ? "enhanced" : "fast";
    }

    private errorMessage(error: HttpErrorResponse): string {
        const message = (error?.error && (error.error.message || error.error.error)) || error.message || "Request failed";
        return `status=${error.status || 0} message=${message}`;
    }
}
