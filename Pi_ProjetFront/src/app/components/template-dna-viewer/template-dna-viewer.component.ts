import { CommonModule } from "@angular/common";
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import * as d3 from "d3";
import { M2TemplateLineageNode } from "../../pages/app/m2-templates/m2-template.service";

interface DivergenceInfo {
    node: M2TemplateLineageNode;
    parent: M2TemplateLineageNode;
    delta: number;
}

interface DnaSummary {
    totalNodes: number;
    maxDepth: number;
    avgRating: number;
    approvedRate: number;
}

@Component({
    selector: "app-template-dna-viewer",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
    styles: [
        `
            :host {
                display: block;
            }

            .dna-shell {
                border: 1px solid rgba(15, 23, 42, 0.14);
                border-radius: 18px;
                background:
                    radial-gradient(circle at 94% -10%, rgba(14, 165, 233, 0.16), transparent 38%),
                    radial-gradient(circle at 2% 110%, rgba(20, 184, 166, 0.12), transparent 40%),
                    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
                overflow: hidden;
                box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
                font-family: "Poppins", "Segoe UI", sans-serif;
            }

            .dna-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 16px;
                border-bottom: 1px solid rgba(15, 23, 42, 0.08);
                background: linear-gradient(180deg, #f8fafc 0%, #eef4fb 100%);
            }

            .dna-insights {
                flex: 1 1 530px;
                min-width: 260px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
                gap: 8px;
            }

            .dna-chip {
                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 12px;
                background: #ffffff;
                padding: 8px 10px;
                min-height: 56px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 2px;
            }

            .dna-chip-label {
                font-size: 11px;
                color: #64748b;
                font-weight: 500;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }

            .dna-chip strong {
                color: #0f172a;
                font-size: 13px;
                line-height: 1.2;
            }

            .dna-controls {
                margin-left: auto;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 12px;
                background: #ffffff;
                padding: 4px;
            }

            .dna-controls button {
                min-width: 0;
                border-radius: 8px;
                color: #0f172a;
            }

            .dna-controls button mat-icon {
                font-size: 17px;
                width: 17px;
                height: 17px;
            }

            .dna-layout {
                display: grid;
                grid-template-columns: minmax(0, 2.4fr) minmax(280px, 1fr);
                min-height: 460px;
            }

            .dna-canvas-wrap {
                position: relative;
                min-height: 460px;
                background:
                    radial-gradient(circle at center, rgba(148, 163, 184, 0.06), transparent 55%),
                    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            }

            .dna-canvas {
                min-height: 460px;
                background-image:
                    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
                background-size: 24px 24px;
            }

            .dna-legend {
                position: absolute;
                left: 14px;
                bottom: 14px;
                background: rgba(255, 255, 255, 0.94);
                backdrop-filter: blur(4px);
                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 12px;
                padding: 8px 10px;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                max-width: calc(100% - 28px);
            }

            .dna-legend-title {
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                margin-right: 4px;
            }

            .dna-legend-item {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                color: #334155;
            }

            .dna-legend-dot {
                width: 9px;
                height: 9px;
                border-radius: 999px;
                display: inline-block;
                border: 1px solid rgba(15, 23, 42, 0.16);
            }

            .dna-legend-dot.low {
                background: #fca5a5;
            }

            .dna-legend-dot.high {
                background: #6ee7b7;
            }

            .dna-legend-line {
                width: 20px;
                height: 0;
                border-top: 3px solid #0f766e;
                border-radius: 999px;
            }

            .dna-panel {
                border-left: 1px solid rgba(15, 23, 42, 0.08);
                padding: 16px;
                background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                display: flex;
                flex-direction: column;
                gap: 14px;
            }

            .dna-node-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
            }

            .dna-panel h6 {
                margin: 0 0 3px;
                color: #0f172a;
                font-size: 16px;
                line-height: 1.2;
                font-weight: 700;
            }

            .dna-meta {
                margin: 0;
                font-size: 12px;
                color: #64748b;
            }

            .dna-kpi-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }

            .dna-kpi-card {
                border: 1px solid rgba(15, 23, 42, 0.1);
                border-radius: 12px;
                background: #ffffff;
                padding: 9px 10px;
                display: flex;
                flex-direction: column;
                gap: 1px;
            }

            .dna-kpi-card span {
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                font-weight: 500;
            }

            .dna-kpi-card strong {
                font-size: 15px;
                color: #0f172a;
                line-height: 1.25;
            }

            .dna-kpi-card small {
                font-size: 11px;
                color: #64748b;
            }

            .dna-section {
                border-top: 1px solid rgba(15, 23, 42, 0.08);
                padding-top: 12px;
            }

            .dna-section-title {
                margin: 0 0 8px;
                font-size: 12px;
                color: #334155;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .dna-path {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
            }

            .dna-path-pill {
                border: 1px solid rgba(15, 23, 42, 0.14);
                border-radius: 999px;
                background: #ffffff;
                color: #0f172a;
                font-size: 11px;
                line-height: 1.2;
                padding: 4px 9px;
                cursor: pointer;
                max-width: 146px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .dna-path-pill.active {
                border-color: rgba(15, 118, 110, 0.45);
                background: rgba(20, 184, 166, 0.16);
                color: #0f766e;
                font-weight: 600;
            }

            .dna-separator {
                font-size: 15px;
                width: 15px;
                height: 15px;
                color: #94a3b8;
            }

            .dna-forks {
                display: flex;
                flex-direction: column;
                gap: 7px;
                max-height: 165px;
                overflow: auto;
                padding-right: 2px;
            }

            .dna-fork-item {
                border: 1px solid rgba(15, 23, 42, 0.1);
                border-radius: 10px;
                background: #ffffff;
                padding: 8px 9px;
                cursor: pointer;
                text-align: left;
                transition: border-color 0.16s ease, box-shadow 0.16s ease;
            }

            .dna-fork-item:hover {
                border-color: rgba(15, 118, 110, 0.42);
                box-shadow: 0 8px 20px rgba(15, 118, 110, 0.12);
            }

            .dna-fork-name {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #0f172a;
                line-height: 1.3;
                margin-bottom: 2px;
            }

            .dna-fork-meta {
                display: block;
                font-size: 11px;
                color: #64748b;
            }

            .dna-open-btn {
                width: 100%;
                margin-top: auto;
                border-radius: 11px;
            }

            .dna-status {
                display: inline-flex;
                align-items: center;
                border-radius: 999px;
                padding: 3px 9px;
                font-size: 11px;
                font-weight: 600;
                border: 1px solid transparent;
                text-transform: none;
                white-space: nowrap;
            }

            .dna-status.approved {
                color: #166534;
                border-color: #86efac;
                background: #dcfce7;
            }

            .dna-status.pending_approval {
                color: #92400e;
                border-color: #fcd34d;
                background: #fef3c7;
            }

            .dna-status.draft {
                color: #1d4ed8;
                border-color: #93c5fd;
                background: #dbeafe;
            }

            .dna-status.rejected {
                color: #b91c1c;
                border-color: #fca5a5;
                background: #fee2e2;
            }

            .dna-empty-inline {
                margin: 0;
                font-size: 12px;
                color: #64748b;
            }

            .dna-empty,
            .dna-message {
                padding: 32px 24px;
                text-align: center;
                color: #475569;
                font-size: 14px;
            }

            .dna-message.error {
                color: #b91c1c;
            }

            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            @media (max-width: 991px) {
                .dna-layout {
                    grid-template-columns: 1fr;
                }

                .dna-canvas,
                .dna-canvas-wrap {
                    min-height: 390px;
                }

                .dna-panel {
                    border-left: none;
                    border-top: 1px solid rgba(15, 23, 42, 0.08);
                }

                .dna-controls {
                    margin-left: 0;
                }
            }

            @media (max-width: 640px) {
                .dna-insights {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .dna-kpi-grid {
                    grid-template-columns: 1fr;
                }

                .dna-chip {
                    min-height: 52px;
                }
            }
        `,
    ],
    template: `
        <div class="dna-shell">
            @if (loading) {
                <div class="dna-message">
                    <mat-icon class="material-icons-outlined" style="font-size:22px;width:22px;height:22px;vertical-align:middle;animation:spin 1s linear infinite;">cached</mat-icon>
                    Loading lineage map...
                </div>
            } @else if (error) {
                <div class="dna-message error">{{ error }}</div>
            } @else if (!lineage) {
                <div class="dna-empty">No lineage data available.</div>
            } @else {
                <div class="dna-toolbar">
                    <div class="dna-insights">
                        <article class="dna-chip">
                            <span class="dna-chip-label">Templates</span>
                            <strong>{{ summary().totalNodes }}</strong>
                        </article>
                        <article class="dna-chip">
                            <span class="dna-chip-label">Fork Depth</span>
                            <strong>{{ summary().maxDepth }}</strong>
                        </article>
                        <article class="dna-chip">
                            <span class="dna-chip-label">Avg Rating</span>
                            <strong>{{ summary().avgRating | number:'1.1-1' }}</strong>
                        </article>
                        <article class="dna-chip">
                            <span class="dna-chip-label">Approved</span>
                            <strong>{{ summary().approvedRate | number:'1.0-0' }}%</strong>
                        </article>
                        <article class="dna-chip">
                            <span class="dna-chip-label">Top Fork Hub</span>
                            <strong>{{ mostForkedName() }}</strong>
                        </article>
                        <article class="dna-chip">
                            <span class="dna-chip-label">Most Divergent</span>
                            <strong>{{ mostDivergentName() }}</strong>
                        </article>
                    </div>

                    <div class="dna-controls" aria-label="Graph controls">
                        <button matButton type="button" (click)="zoomOut()" matTooltip="Zoom out">
                            <mat-icon class="material-icons-outlined">zoom_out</mat-icon>
                        </button>
                        <button matButton type="button" (click)="resetView()" matTooltip="Reset view">
                            <mat-icon class="material-icons-outlined">center_focus_strong</mat-icon>
                        </button>
                        <button matButton type="button" (click)="zoomIn()" matTooltip="Zoom in">
                            <mat-icon class="material-icons-outlined">zoom_in</mat-icon>
                        </button>
                    </div>
                </div>

                <div class="dna-layout">
                    <div class="dna-canvas-wrap">
                        <div class="dna-canvas" #host></div>
                        <div class="dna-legend">
                            <span class="dna-legend-title">Encoding</span>
                            <span class="dna-legend-item"><span class="dna-legend-dot low"></span>Lower rating</span>
                            <span class="dna-legend-item"><span class="dna-legend-dot high"></span>Higher rating</span>
                            <span class="dna-legend-item"><span class="dna-legend-line"></span>Thicker link = higher usage</span>
                        </div>
                    </div>

                    <div class="dna-panel">
                        @if (selectedNode(); as node) {
                            <div class="dna-node-header">
                                <div>
                                    <h6>{{ node.name }}</h6>
                                    <p class="dna-meta">Template ID: {{ node.id }}</p>
                                </div>
                                <span class="dna-status" [class]="'dna-status ' + statusClass(node.status)">{{ statusLabel(node.status) }}</span>
                            </div>

                            <div class="dna-kpi-grid">
                                <article class="dna-kpi-card">
                                    <span>Generation</span>
                                    <strong>#{{ selectedGeneration() }}</strong>
                                    <small>{{ selectedParentLabel() }}</small>
                                </article>
                                <article class="dna-kpi-card">
                                    <span>Rating</span>
                                    <strong>{{ node.rating | number:'1.1-1' }}</strong>
                                    <small>{{ node.ratingCount || 0 }} ratings</small>
                                </article>
                                <article class="dna-kpi-card">
                                    <span>Usage</span>
                                    <strong>{{ node.usageCount || 0 }}</strong>
                                    <small>Influence {{ influence(node) | number:'1.1-1' }}</small>
                                </article>
                                <article class="dna-kpi-card">
                                    <span>Direct Forks</span>
                                    <strong>{{ node.children.length || 0 }}</strong>
                                    <small>{{ descendantCount(node) }} descendants</small>
                                </article>
                            </div>

                            <div class="dna-section">
                                <p class="dna-section-title">Path from origin</p>
                                <div class="dna-path">
                                    @for (crumb of selectedPath(); track crumb.id; let isLast = $last) {
                                        <button type="button" class="dna-path-pill" [class.active]="crumb.id === node.id" (click)="selectNode(crumb)">
                                            {{ shortLabel(crumb.name, 22) }}
                                        </button>
                                        @if (!isLast) {
                                            <mat-icon class="material-icons-outlined dna-separator">chevron_right</mat-icon>
                                        }
                                    }
                                </div>
                            </div>

                            <div class="dna-section">
                                <p class="dna-section-title">Direct forks</p>
                                @if ((node.children.length || 0) > 0) {
                                    <div class="dna-forks">
                                        @for (child of node.children; track child.id) {
                                            <button type="button" class="dna-fork-item" (click)="selectNode(child)">
                                                <span class="dna-fork-name">{{ child.name }}</span>
                                                <span class="dna-fork-meta">{{ statusLabel(child.status) }} | rating {{ child.rating | number:'1.1-1' }} | usage {{ child.usageCount || 0 }}</span>
                                            </button>
                                        }
                                    </div>
                                } @else {
                                    <p class="dna-empty-inline">This node has no direct forks.</p>
                                }
                            </div>

                            <button matButton="filled" class="text-theme dna-open-btn" (click)="openNode(node.id)">
                                <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                Open Template
                            </button>

                            <button matButton class="dna-open-btn" (click)="resetSelection()">
                                <mat-icon class="material-icons-outlined">restart_alt</mat-icon>
                                Reset to Active Template
                            </button>
                        } @else {
                            <p class="dna-meta mb-0">Click a node card in the map to inspect its details, lineage path, and direct forks.</p>
                        }
                    </div>
                </div>
            }
        </div>
    `,
})
export class TemplateDnaViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() lineage: M2TemplateLineageNode | null = null;
    @Input() loading = false;
    @Input() error = "";
    @Input() activeTemplateId = "";

    @Output() openTemplate = new EventEmitter<string>();

    @ViewChild("host") private hostRef?: ElementRef<HTMLDivElement>;

    readonly selectedNode = signal<M2TemplateLineageNode | null>(null);
    readonly summary = signal<DnaSummary>({ totalNodes: 0, maxDepth: 0, avgRating: 0, approvedRate: 0 });

    private svgSelection?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private resizeObserver?: ResizeObserver;
    private currentTransform: d3.ZoomTransform = d3.zoomIdentity;

    ngAfterViewInit(): void {
        this.bindResizeObserver();
        this.render();
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["lineage"]) {
            this.summary.set(this.computeSummary(this.lineage));
            this.currentTransform = d3.zoomIdentity;
        }

        if (changes["lineage"] || changes["activeTemplateId"]) {
            this.selectedNode.set(this.findNode(this.lineage, this.activeTemplateId) ?? this.lineage);
        }

        this.render();
    }

    openNode(id: string): void {
        this.openTemplate.emit(id);
    }

    selectNode(node: M2TemplateLineageNode): void {
        this.selectedNode.set(node);
        this.render();
    }

    resetSelection(): void {
        this.selectedNode.set(this.findNode(this.lineage, this.activeTemplateId) ?? this.lineage);
        this.render();
    }

    zoomIn(): void {
        this.applyZoom(1.18);
    }

    zoomOut(): void {
        this.applyZoom(0.84);
    }

    resetView(): void {
        if (!this.svgSelection || !this.zoomBehavior) return;
        this.currentTransform = d3.zoomIdentity;
        this.svgSelection.transition().duration(180).call(this.zoomBehavior.transform, d3.zoomIdentity);
    }

    statusLabel(status: string): string {
        switch (status) {
            case "APPROVED": return "Approved";
            case "PENDING_APPROVAL": return "Pending";
            case "DRAFT": return "Draft";
            case "REJECTED": return "Rejected";
            default: return status;
        }
    }

    statusClass(status: string): string {
        return (status || "").toLowerCase();
    }

    mostForkedName(): string {
        return this.findMostForked(this.lineage)?.name ?? "-";
    }

    mostDivergentName(): string {
        return this.findMostDivergent(this.lineage)?.node.name ?? "-";
    }

    mostInfluentialName(): string {
        return this.findMostInfluential(this.lineage)?.name ?? "-";
    }

    nodeCount(): number {
        return this.countNodes(this.lineage);
    }

    selectedPath(): M2TemplateLineageNode[] {
        const selected = this.selectedNode();
        if (!selected || !this.lineage) return [];
        return this.findPath(this.lineage, selected.id) ?? [selected];
    }

    selectedGeneration(): number {
        return Math.max(0, this.selectedPath().length - 1);
    }

    selectedParentLabel(): string {
        const path = this.selectedPath();
        if (path.length <= 1) return "Origin template";
        const parent = path[path.length - 2];
        return `Forked from ${this.shortLabel(parent.name, 16)}`;
    }

    descendantCount(node: M2TemplateLineageNode): number {
        return Math.max(0, this.countNodes(node) - 1);
    }

    shortLabel(value: string, maxLen: number): string {
        if (!value) return "";
        if (value.length <= maxLen) return value;
        return `${value.slice(0, Math.max(1, maxLen - 1))}...`;
    }

    influence(node: M2TemplateLineageNode): number {
        const forkCount = node.children?.length || 0;
        return (forkCount + 1) * Math.log((node.usageCount || 0) + 1);
    }

    private bindResizeObserver(): void {
        const host = this.hostRef?.nativeElement;
        if (!host || typeof ResizeObserver === "undefined") return;

        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.render());
        this.resizeObserver.observe(host);
    }

    private applyZoom(factor: number): void {
        if (!this.svgSelection || !this.zoomBehavior) return;
        this.svgSelection.transition().duration(140).call(this.zoomBehavior.scaleBy, factor);
    }

    private render(): void {
        queueMicrotask(() => {
            const host = this.hostRef?.nativeElement;
            if (!host || !this.lineage || this.loading || this.error) return;

            host.innerHTML = "";

            const width = Math.max(host.clientWidth || 880, 360);
            const totalNodes = this.summary().totalNodes || this.countNodes(this.lineage);
            const height = Math.max(430, Math.min(720, totalNodes * 90));

            const svg = d3
                .select(host)
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", `0 0 ${width} ${height}`)
                .style("display", "block")
                .style("max-width", "100%")
                .style("height", "100%") as d3.Selection<SVGSVGElement, unknown, null, undefined>;

            const defs = svg.append("defs");
            this.appendDefs(defs);

            const zoomLayer = svg.append("g");
            const zoom = d3
                .zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.45, 2.7])
                .on("zoom", event => {
                    this.currentTransform = event.transform;
                    zoomLayer.attr("transform", event.transform.toString());
                });

            svg.call(zoom);
            svg.call(zoom.transform, this.currentTransform);

            this.svgSelection = svg;
            this.zoomBehavior = zoom;

            const ratingColor = d3
                .scaleLinear<string>()
                .domain([0, 2.5, 5])
                .range(["#fca5a5", "#facc15", "#34d399"])
                .clamp(true);

            this.renderHorizontal(zoomLayer, this.lineage, width, height, ratingColor);
        });
    }

    private renderHorizontal(
        rootData: d3.Selection<SVGGElement, unknown, null, undefined>,
        lineage: M2TemplateLineageNode,
        width: number,
        height: number,
        ratingColor: d3.ScaleLinear<string, string, never>,
    ): void {
        const root = d3.hierarchy<M2TemplateLineageNode>(lineage, d => d.children || []);
        const layout = d3.tree<M2TemplateLineageNode>().nodeSize([96, 260]);
        layout(root);

        const pointNodes = root.descendants() as Array<d3.HierarchyPointNode<M2TemplateLineageNode>>;
        const pointLinks = root.links() as Array<d3.HierarchyPointLink<M2TemplateLineageNode>>;

        const cardWidth = 214;
        const cardHeight = 70;

        const minX = d3.min(pointNodes, d => d.x) ?? 0;
        const maxX = d3.max(pointNodes, d => d.x) ?? 0;
        const minY = d3.min(pointNodes, d => d.y) ?? 0;
        const maxY = d3.max(pointNodes, d => d.y) ?? 0;

        const chartWidth = maxY - minY + cardWidth + 180;
        const chartHeight = maxX - minX + cardHeight + 140;
        const offsetX = (width - chartWidth) / 2 - minY + 90;
        const offsetY = (height - chartHeight) / 2 - minX + 70;

        const g = rootData.append("g").attr("transform", `translate(${offsetX},${offsetY})`);

        const selectedPathIds = new Set(this.selectedPath().map(node => node.id));
        const selectedId = this.selectedNode()?.id ?? this.activeTemplateId;

        g.selectAll("path.link")
            .data(pointLinks)
            .join("path")
            .attr("fill", "none")
            .attr("stroke", d => {
                const onPath = selectedPathIds.has(d.source.data.id) && selectedPathIds.has(d.target.data.id);
                return onPath ? "#0f766e" : this.edgeColor(d.target.data.usageCount || 0);
            })
            .attr("stroke-width", d => {
                const onPath = selectedPathIds.has(d.source.data.id) && selectedPathIds.has(d.target.data.id);
                const widthByUsage = this.edgeWidth(d.target.data.usageCount || 0);
                return onPath ? widthByUsage + 1.2 : widthByUsage;
            })
            .attr("stroke-opacity", d => {
                const onPath = selectedPathIds.has(d.source.data.id) && selectedPathIds.has(d.target.data.id);
                return onPath ? 0.95 : 0.55;
            })
            .attr("d", d => {
                const source = { x: d.source.x, y: d.source.y + cardWidth / 2 };
                const target = { x: d.target.x, y: d.target.y - cardWidth / 2 };
                const bend = (source.y + target.y) / 2;
                return `M${source.y},${source.x} C${bend},${source.x} ${bend},${target.x} ${target.y},${target.x}`;
            });

        const node = g
            .selectAll("g.node")
            .data(pointNodes)
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .style("cursor", "pointer")
            .on("click", (_, d) => this.selectNode(d.data));

        node.append("rect")
            .attr("x", -cardWidth / 2)
            .attr("y", -cardHeight / 2)
            .attr("width", cardWidth)
            .attr("height", cardHeight)
            .attr("rx", 14)
            .attr("ry", 14)
            .attr("fill", d => this.nodeFill(d.data.id, selectedId))
            .attr("stroke", d => this.nodeStroke(d.data.id, selectedId))
            .attr("stroke-width", d => this.nodeStrokeWidth(d.data.id, selectedId))
            .attr("filter", "url(#dna-node-shadow)");

        node.append("rect")
            .attr("x", -cardWidth / 2 + 2)
            .attr("y", -cardHeight / 2 + 2)
            .attr("width", 5)
            .attr("height", cardHeight - 4)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", d => this.statusAccent(d.data.status));

        node.append("circle")
            .attr("cx", -cardWidth / 2 + 18)
            .attr("cy", -9)
            .attr("r", 4)
            .attr("fill", d => ratingColor(d.data.rating ?? 0));

        node.append("text")
            .attr("x", -cardWidth / 2 + 28)
            .attr("y", -6)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("font-family", "Poppins, Segoe UI, sans-serif")
            .style("fill", "#0f172a")
            .text(d => this.shortLabel(d.data.name, 26));

        node.append("text")
            .attr("x", -cardWidth / 2 + 28)
            .attr("y", 13)
            .attr("text-anchor", "start")
            .style("font-size", "11px")
            .style("font-weight", "500")
            .style("font-family", "Poppins, Segoe UI, sans-serif")
            .style("fill", "#475569")
            .text(d => `Rating ${this.safeNumber(d.data.rating)} | Usage ${d.data.usageCount || 0}`);

        node.append("text")
            .attr("x", cardWidth / 2 - 10)
            .attr("y", 13)
            .attr("text-anchor", "end")
            .style("font-size", "10px")
            .style("font-weight", "600")
            .style("font-family", "Poppins, Segoe UI, sans-serif")
            .style("fill", "#64748b")
            .text(d => `Forks ${d.data.children?.length || 0}`);

        node
            .filter(d => d.data.id === this.activeTemplateId)
            .append("rect")
            .attr("x", cardWidth / 2 - 68)
            .attr("y", -cardHeight / 2 + 7)
            .attr("width", 54)
            .attr("height", 15)
            .attr("rx", 8)
            .attr("ry", 8)
            .attr("fill", "rgba(37, 99, 235, 0.18)")
            .attr("stroke", "rgba(37, 99, 235, 0.36)");

        node
            .filter(d => d.data.id === this.activeTemplateId)
            .append("text")
            .attr("x", cardWidth / 2 - 41)
            .attr("y", -cardHeight / 2 + 18)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("font-weight", "700")
            .style("font-family", "Poppins, Segoe UI, sans-serif")
            .style("fill", "#1d4ed8")
            .text("ACTIVE");
    }

    private appendDefs(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>): void {
        const shadow = defs
            .append("filter")
            .attr("id", "dna-node-shadow")
            .attr("x", "-40%")
            .attr("y", "-40%")
            .attr("width", "180%")
            .attr("height", "180%");

        shadow
            .append("feDropShadow")
            .attr("dx", 0)
            .attr("dy", 2)
            .attr("stdDeviation", 3)
            .attr("flood-color", "#0f172a")
            .attr("flood-opacity", 0.14);
    }

    private edgeWidth(usageCount: number): number {
        return Math.max(1.4, Math.min(6.4, 1.4 + usageCount / 18));
    }

    private edgeColor(usageCount: number): string {
        if (usageCount >= 40) return "#0f766e";
        if (usageCount >= 15) return "#14b8a6";
        return "#94a3b8";
    }

    private nodeFill(nodeId: string, selectedId: string): string {
        if (nodeId === selectedId) return "#ecfeff";
        if (nodeId === this.activeTemplateId) return "#eff6ff";
        return "#ffffff";
    }

    private nodeStroke(nodeId: string, selectedId: string): string {
        if (nodeId === selectedId) return "#0f766e";
        if (nodeId === this.activeTemplateId) return "#2563eb";
        return "#cbd5e1";
    }

    private nodeStrokeWidth(nodeId: string, selectedId: string): number {
        if (nodeId === selectedId) return 2.2;
        if (nodeId === this.activeTemplateId) return 1.9;
        return 1.1;
    }

    private statusAccent(status: string): string {
        switch (status) {
            case "APPROVED": return "#22c55e";
            case "PENDING_APPROVAL": return "#f59e0b";
            case "REJECTED": return "#ef4444";
            default: return "#3b82f6";
        }
    }

    private safeNumber(value: number | null | undefined): string {
        if (value === null || value === undefined) return "0.0";
        return Number.isFinite(value) ? value.toFixed(1) : "0.0";
    }

    private computeSummary(node: M2TemplateLineageNode | null): DnaSummary {
        if (!node) {
            return { totalNodes: 0, maxDepth: 0, avgRating: 0, approvedRate: 0 };
        }

        const all: Array<{ node: M2TemplateLineageNode; depth: number }> = [];
        this.flattenWithDepth(node, 0, all);

        const totalNodes = all.length;
        const maxDepth = all.reduce((max, item) => Math.max(max, item.depth), 0);
        const avgRating = totalNodes > 0
            ? all.reduce((sum, item) => sum + (item.node.rating || 0), 0) / totalNodes
            : 0;
        const approvedCount = all.filter(item => item.node.status === "APPROVED").length;
        const approvedRate = totalNodes > 0 ? (approvedCount / totalNodes) * 100 : 0;

        return { totalNodes, maxDepth, avgRating, approvedRate };
    }

    private flattenWithDepth(
        node: M2TemplateLineageNode,
        depth: number,
        out: Array<{ node: M2TemplateLineageNode; depth: number }>,
    ): void {
        out.push({ node, depth });
        for (const child of node.children || []) {
            this.flattenWithDepth(child, depth + 1, out);
        }
    }

    private countNodes(node: M2TemplateLineageNode | null): number {
        if (!node) return 0;
        let count = 1;
        for (const child of node.children || []) {
            count += this.countNodes(child);
        }
        return count;
    }

    private flatten(
        node: M2TemplateLineageNode | null,
        parent: M2TemplateLineageNode | null,
        out: Array<{ node: M2TemplateLineageNode; parent: M2TemplateLineageNode | null }>,
    ): void {
        if (!node) return;
        out.push({ node, parent });
        for (const child of node.children || []) {
            this.flatten(child, node, out);
        }
    }

    private findMostForked(node: M2TemplateLineageNode | null): M2TemplateLineageNode | null {
        if (!node) return null;
        let best = node;
        const stack: M2TemplateLineageNode[] = [node];
        while (stack.length) {
            const current = stack.pop() as M2TemplateLineageNode;
            if ((current.children?.length || 0) > (best.children?.length || 0)) {
                best = current;
            }
            for (const child of current.children || []) stack.push(child);
        }
        return best;
    }

    private findMostInfluential(node: M2TemplateLineageNode | null): M2TemplateLineageNode | null {
        if (!node) return null;
        let best = node;
        let bestScore = this.influence(node);
        const stack: M2TemplateLineageNode[] = [node];
        while (stack.length) {
            const current = stack.pop() as M2TemplateLineageNode;
            const score = this.influence(current);
            if (score > bestScore) {
                best = current;
                bestScore = score;
            }
            for (const child of current.children || []) stack.push(child);
        }
        return best;
    }

    private findMostDivergent(node: M2TemplateLineageNode | null): DivergenceInfo | null {
        if (!node) return null;

        const all: Array<{ node: M2TemplateLineageNode; parent: M2TemplateLineageNode | null }> = [];
        this.flatten(node, null, all);

        let best: DivergenceInfo | null = null;
        for (const pair of all) {
            if (!pair.parent) continue;
            const delta = Math.abs((pair.node.rating ?? 0) - (pair.parent.rating ?? 0));
            if (!best || delta > best.delta) {
                best = { node: pair.node, parent: pair.parent, delta };
            }
        }
        return best;
    }

    private findNode(node: M2TemplateLineageNode | null, id: string): M2TemplateLineageNode | null {
        if (!node || !id) return null;
        if (node.id === id) return node;
        for (const child of node.children || []) {
            const found = this.findNode(child, id);
            if (found) return found;
        }
        return null;
    }

    private findPath(
        node: M2TemplateLineageNode,
        targetId: string,
        path: M2TemplateLineageNode[] = [],
    ): M2TemplateLineageNode[] | null {
        const nextPath = [...path, node];
        if (node.id === targetId) return nextPath;

        for (const child of node.children || []) {
            const found = this.findPath(child, targetId, nextPath);
            if (found) return found;
        }

        return null;
    }
}
