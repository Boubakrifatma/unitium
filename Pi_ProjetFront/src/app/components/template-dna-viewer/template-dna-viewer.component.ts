import { CommonModule } from "@angular/common";
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
    signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import * as d3 from "d3";
import { M2TemplateLineageNode } from "../../pages/app/m2-templates/m2-template.service";

interface DivergenceInfo {
    node: M2TemplateLineageNode;
    parent: M2TemplateLineageNode;
    delta: number;
}

@Component({
    selector: "app-template-dna-viewer",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    styles: [
        `
            .dna-shell {
                border: 1px solid #e1e4e8;
                border-radius: 6px;
                background: #ffffff;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .dna-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border-bottom: 1px solid #e1e4e8;
                background: #f6f8fa;
            }

            .dna-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: 1px solid #e1e4e8;
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 12px;
                color: #586069;
                background: #f6f8fa;
                white-space: nowrap;
                font-weight: 500;
            }

            .dna-chip strong {
                color: #24292e;
            }

            .dna-mode {
                margin-left: auto;
                display: inline-flex;
                gap: 4px;
                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 10px;
                padding: 2px;
                background: #fff;
            }

            .dna-mode button {
                border: none;
                background: transparent;
                color: #64748b;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 8px;
                cursor: pointer;
            }

            .dna-mode button.active {
                background: rgba(99, 102, 241, 0.16);
                color: #4338ca;
                font-weight: 600;
            }

            .dna-layout {
                display: grid;
                grid-template-columns: minmax(0, 2.2fr) minmax(250px, 1fr);
                min-height: 360px;
            }

            .dna-canvas {
                min-height: 360px;
                background: #ffffff;
                border-radius: 6px;
            }

            .dna-panel {
                border-left: 1px solid #e1e4e8;
                padding: 16px;
                background: #ffffff;
            }

            .dna-panel h6 {
                margin: 0 0 8px;
                color: #24292e;
                font-size: 16px;
                line-height: 1.2;
                font-weight: 600;
            }

            .dna-meta {
                margin: 0 0 12px;
                font-size: 12px;
                color: #586069;
            }

            .dna-kv {
                margin: 0;
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 8px;
                font-size: 13px;
                color: #24292e;
                padding: 8px 0;
                border-bottom: 1px solid #e1e4e8;
            }

            .dna-kv:last-of-type {
                border-bottom: none;
            }

            .dna-stars {
                color: #f6ab3f;
                letter-spacing: 1px;
                font-size: 14px;
            }

            .dna-status {
                display: inline-flex;
                align-items: center;
                border-radius: 6px;
                padding: 2px 8px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid transparent;
                text-transform: lowercase;
            }

            .dna-status.approved {
                color: #155724;
                border-color: #c3e6cb;
                background: #d4edda;
            }

            .dna-status.pending_approval {
                color: #856404;
                border-color: #ffeaa7;
                background: #fff3cd;
            }

            .dna-status.draft {
                color: #383d41;
                border-color: #d6d8db;
                background: #e2e3e5;
            }

            .dna-status.rejected {
                color: #721c24;
                border-color: #f5c6cb;
                background: #f8d7da;
            }

            .dna-empty,
            .dna-message {
                padding: 24px;
                text-align: center;
                color: #64748b;
                font-size: 13px;
            }

            .dna-message.error {
                color: #b91c1c;
            }

            @media (max-width: 991px) {
                .dna-layout {
                    grid-template-columns: 1fr;
                }

                .dna-panel {
                    border-left: none;
                    border-top: 1px solid rgba(15, 23, 42, 0.08);
                }

                .dna-mode {
                    margin-left: 0;
                }
            }
        `,
    ],
    template: `
        <div class="dna-shell">
            @if (loading) {
                <div class="dna-message">
                    <mat-icon class="material-icons-outlined" style="font-size:22px;width:22px;height:22px;vertical-align:middle;animation:spin 1s linear infinite;">cached</mat-icon>
                    Loading lineage...
                </div>
            } @else if (error) {
                <div class="dna-message error">{{ error }}</div>
            } @else if (!lineage) {
                <div class="dna-empty">No lineage data available.</div>
            } @else {
                <div class="dna-toolbar">
                    <span class="dna-chip">
                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">hub</mat-icon>
                        Most Forked: <strong>{{ mostForkedName() }}</strong>
                    </span>
                    <span class="dna-chip">
                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">insights</mat-icon>
                        Most Divergent: <strong>{{ mostDivergentName() }}</strong>
                    </span>
                    <span class="dna-chip">
                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">trending_up</mat-icon>
                        Most Influential: <strong>{{ mostInfluentialName() }}</strong>
                    </span>

                    <div class="dna-mode">
                        <button type="button" class="active">Network</button>
                    </div>
                </div>

                <div class="dna-layout">
                    <div class="dna-canvas" #host></div>

                    <div class="dna-panel">
                        @if (selectedNode(); as node) {
                            <h6>{{ node.name }}</h6>
                            <p class="dna-meta">Template ID: {{ node.id }}</p>

                            <p class="dna-kv">
                                <span>Status</span>
                                <span class="dna-status" [class]="'dna-status ' + node.status.toLowerCase()">{{ statusLabel(node.status) }}</span>
                            </p>
                            <p class="dna-kv">
                                <span>Creator</span>
                                <strong>#{{ node.createdBy }}</strong>
                            </p>
                            <p class="dna-kv">
                                <span>Rating</span>
                                <span>
                                    <span class="dna-stars">{{ stars(node.rating || 0) }}</span>
                                    ({{ node.rating | number:'1.1-1' }})
                                </span>
                            </p>
                            <p class="dna-kv">
                                <span>Usage Count</span>
                                <strong>{{ node.usageCount || 0 }}</strong>
                            </p>
                            <p class="dna-kv">
                                <span>Direct Forks</span>
                                <strong>{{ node.children.length || 0 }}</strong>
                            </p>

                            <div class="mt-3 d-flex gap-2">
                                <button matButton="filled" class="text-theme" (click)="openNode(node.id)">
                                    <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                    Open Template
                                </button>
                            </div>
                        } @else {
                            <p class="dna-meta mb-0">Click a node to inspect template details.</p>
                        }
                    </div>
                </div>
            }
        </div>
    `,
})
export class TemplateDnaViewerComponent implements AfterViewInit, OnChanges {
    @Input() lineage: M2TemplateLineageNode | null = null;
    @Input() loading = false;
    @Input() error = "";
    @Input() activeTemplateId = "";

    @Output() openTemplate = new EventEmitter<string>();

    @ViewChild("host") private hostRef?: ElementRef<HTMLDivElement>;

    readonly selectedNode = signal<M2TemplateLineageNode | null>(null);

    ngAfterViewInit(): void {
        this.render();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["lineage"]) {
            this.selectedNode.set(this.findNode(this.lineage, this.activeTemplateId) ?? this.lineage);
        }
        this.render();
    }

    openNode(id: string): void {
        this.openTemplate.emit(id);
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

    stars(rating: number): string {
        const full = Math.max(0, Math.min(5, Math.round(rating)));
        return "*".repeat(full) + "-".repeat(5 - full);
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

    private render(): void {
        queueMicrotask(() => {
            const host = this.hostRef?.nativeElement;
            if (!host || !this.lineage || this.loading || this.error) return;

            host.innerHTML = "";

            const width = Math.max(host.clientWidth || 820, 400);
            const height = Math.max(420, this.countNodes(this.lineage) * 80);

            const svg = d3
                .select(host)
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", `0 0 ${width} ${height}`)
                .style("max-width", "100%")
                .style("height", "100%");

            const zoomLayer = svg.append("g");
            svg.call(
                d3
                    .zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.45, 2.7])
                    .on("zoom", (event) => zoomLayer.attr("transform", event.transform.toString())),
            );

            const ratingColor = d3
                .scaleLinear<string>()
                .domain([0, 2.5, 5])
                .range(["#dc2626", "#f59e0b", "#16a34a"])
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
        const layout = d3.tree<M2TemplateLineageNode>().nodeSize([60, 180]); // [vertical spacing, horizontal spacing]
        layout(root);

        const pointNodes = root.descendants() as Array<d3.HierarchyPointNode<M2TemplateLineageNode>>;
        const pointLinks = root.links() as Array<d3.HierarchyPointLink<M2TemplateLineageNode>>;

        // Calculate bounds and center the graph
        const nodes = pointNodes;
        const minX = d3.min(nodes, d => d.x) ?? 0;
        const maxX = d3.max(nodes, d => d.x) ?? 0;
        const minY = d3.min(nodes, d => d.y) ?? 0;
        const maxY = d3.max(nodes, d => d.y) ?? 0;

        const chartWidth = maxY - minY + 200;
        const chartHeight = maxX - minX + 120;

        // Center the graph
        const offsetX = (width - chartWidth) / 2 + 100;
        const offsetY = (height - chartHeight) / 2 - minX + 60;

        const g = rootData.append("g").attr("transform", `translate(${offsetX},${offsetY})`);

        // Create curved links like GitHub
        const linkGenerator = d3.linkHorizontal<d3.HierarchyPointLink<M2TemplateLineageNode>, d3.HierarchyPointNode<M2TemplateLineageNode>>()
            .x(d => d.y)
            .y(d => d.x);

        g.selectAll("path.link")
            .data(pointLinks)
            .join("path")
            .attr("fill", "none")
            .attr("stroke", "#d1d5db")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.8)
            .attr("d", d => {
                const source = { x: d.source.x, y: d.source.y };
                const target = { x: d.target.x, y: d.target.y };
                // Create a slight curve for better visual appeal
                const midY = (source.y + target.y) / 2;
                return `M${source.y},${source.x} C${midY},${source.x} ${midY},${target.x} ${target.y},${target.x}`;
            });

        // Create nodes
        const node = g
            .selectAll("g.node")
            .data(nodes)
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .style("cursor", "pointer")
            .on("click", (_, d) => this.onNodeClick(d.data));

        // Node circles with size based on usage/rating
        node.append("circle")
            .attr("r", d => {
                const baseSize = 6;
                const usageBonus = Math.min(4, (d.data.usageCount || 0) / 10);
                const ratingBonus = (d.data.rating || 0) / 5 * 2;
                return baseSize + usageBonus + ratingBonus;
            })
            .attr("fill", d => {
                if (d.data.id === this.activeTemplateId) return "#0366d6"; // GitHub blue for active
                return ratingColor(d.data.rating ?? 0);
            })
            .attr("stroke", d => {
                if (d.data.id === this.activeTemplateId) return "#ffffff";
                return "#e1e4e8";
            })
            .attr("stroke-width", d => (d.data.id === this.activeTemplateId ? 3 : 1));

        // Template name labels
        node.append("text")
            .attr("dy", "0.35em")
            .attr("x", 15)
            .attr("text-anchor", "start")
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("fill", "#24292e")
            .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif")
            .text(d => this.shorten(d.data.name, 50));

        // Add subtle shadow/highlight for depth
        node.append("circle")
            .attr("r", d => {
                const baseSize = 6;
                const usageBonus = Math.min(4, (d.data.usageCount || 0) / 10);
                const ratingBonus = (d.data.rating || 0) / 5 * 2;
                return baseSize + usageBonus + ratingBonus + 1;
            })
            .attr("fill", "none")
            .attr("stroke", d => d.data.id === this.activeTemplateId ? "rgba(3, 102, 214, 0.3)" : "rgba(0,0,0,0.05)")
            .attr("stroke-width", 1)
            .lower();
    }



    private onNodeClick(node: M2TemplateLineageNode): void {
        this.selectedNode.set(node);
    }

    private edgeWidth(usageCount: number): number {
        return Math.max(1.2, Math.min(6, 1.2 + usageCount / 20));
    }

    private shorten(value: string, maxLen: number): string {
        if (!value) return "";
        if (value.length <= maxLen) return value;
        return `${value.slice(0, maxLen - 1)}...`;
    }

    private countNodes(node: M2TemplateLineageNode | null): number {
        if (!node) return 0;
        let count = 1;
        for (const child of node.children || []) {
            count += this.countNodes(child);
        }
        return count;
    }

    private flatten(node: M2TemplateLineageNode | null, parent: M2TemplateLineageNode | null, out: Array<{ node: M2TemplateLineageNode; parent: M2TemplateLineageNode | null }>): void {
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

    private influence(node: M2TemplateLineageNode): number {
        const forkCount = node.children?.length || 0;
        return (forkCount + 1) * Math.log((node.usageCount || 0) + 1);
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
}
