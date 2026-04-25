import { CommonModule, isPlatformBrowser } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    ViewChild,
    computed,
    inject,
    signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router } from "@angular/router";
import { catchError, finalize, interval, map, merge, of, switchMap, tap } from "rxjs";
import {
    DashboardFocusResponse,
    DashboardGlobalHealth,
    DashboardMetrics,
    DashboardPortfolioResponse,
    DashboardProjectCard,
    DashboardWorkspaceCard,
} from "./master-dashboard.models";
import { MasterDashboardService } from "./master-dashboard.service";

@Component({
    selector: "app-master-dashboard",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
    templateUrl: "./master-dashboard.component.html",
    styleUrl: "./master-dashboard.component.css",
})
export class MasterDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly dashboardService = inject(MasterDashboardService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    private readonly refreshEveryMs = 30_000;

    @ViewChild("treemapHost") private treemapHost?: ElementRef<HTMLDivElement>;
    @ViewChild("networkHost") private networkHost?: ElementRef<HTMLDivElement>;
    @ViewChild("radarCanvas") private radarCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild("constellationHost") private constellationHost?: ElementRef<HTMLDivElement>;

    private viewReady = false;

    private libsLoaded?: Promise<void>;
    private d3Module?: any;
    private chartModule?: any;
    private threeModule?: any;

    private riskRadarChart?: any;
    private networkSimulation?: any;

    private threeRenderer?: any;
    private threeScene?: any;
    private threeCamera?: any;
    private threeCanvasElement: HTMLCanvasElement | null = null;
    private threeTooltipElement: HTMLDivElement | null = null;
    private threeAnimationFrameId: number | null = null;
    private threeResizeHandler: (() => void) | null = null;
    private threePointerMoveHandler: ((event: PointerEvent) => void) | null = null;
    private threePointerLeaveHandler: ((event: PointerEvent) => void) | null = null;
    private threeClickHandler: ((event: MouseEvent) => void) | null = null;
    private threeDoubleClickHandler: ((event: MouseEvent) => void) | null = null;

    readonly loading = signal(true);
    readonly refreshing = signal(false);
    readonly focusLoading = signal(false);
    readonly error = signal<string | null>(null);

    readonly portfolio = signal<DashboardPortfolioResponse | null>(null);
    readonly focus = signal<DashboardFocusResponse | null>(null);
    readonly selectedProjectId = signal<string | null>(null);
    readonly selectedWorkspaceGraphId = signal<string | null>(null);

    readonly metrics = computed<DashboardMetrics>(() =>
        this.portfolio()?.metrics ?? { workspaces: 0, projects: 0, tasks: 0, members: 0 },
    );

    readonly globalHealth = computed<DashboardGlobalHealth>(() =>
        this.portfolio()?.globalHealth ?? { score: 0, state: "AT_RISK", urgentProjects: 0, label: "No portfolio health data." },
    );

    readonly workspaceCards = computed<DashboardWorkspaceCard[]>(() => this.portfolio()?.workspaces ?? []);
    readonly projectCards = computed<DashboardProjectCard[]>(() => this.portfolio()?.projects ?? []);

    readonly milestones = computed(() => this.portfolio()?.milestonesCountdown ?? []);
    readonly activityItems = computed(() => this.portfolio()?.activity ?? []);
    readonly templates = computed(() => this.portfolio()?.templatesTrending ?? []);
    readonly warnings = computed(() => this.portfolio()?.warnings ?? []);

    readonly constellationNodeCount = computed(() => Math.min(this.projectCards().length, 180));

    readonly selectedProject = computed<DashboardProjectCard | null>(() => {
        const currentId = this.selectedProjectId();
        if (!currentId) {
            return null;
        }
        return this.projectCards().find((project) => project.id === currentId) ?? null;
    });

    ngOnInit(): void {
        merge(of(0), interval(this.refreshEveryMs).pipe(map(() => 1)))
            .pipe(
                switchMap((tick) => this.fetchPortfolio(tick === 1)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    ngAfterViewInit(): void {
        this.viewReady = true;
        void this.renderDataVisuals();
    }

    ngOnDestroy(): void {
        this.destroyVisualizationArtifacts();
    }

    manualRefresh(): void {
        this.fetchPortfolio(false)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    selectProject(projectId: string): void {
        if (!projectId || this.selectedProjectId() === projectId) {
            return;
        }

        this.selectedProjectId.set(projectId);
        this.fetchProjectFocus(projectId, false);
    }

    trackById(_: number, item: { id: string | number }): string | number {
        return item.id;
    }

    trackByName(_: number, item: { name: string }): string {
        return item.name;
    }

    statusLabel(value?: string | null): string {
        if (!value) {
            return "Unknown";
        }
        return value
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    relativeDays(days: number | null | undefined): string {
        if (days == null) {
            return "No due date";
        }
        if (days === 0) {
            return "Due today";
        }
        if (days > 0) {
            return `${days} day${days > 1 ? "s" : ""} left`;
        }
        const absolute = Math.abs(days);
        return `${absolute} day${absolute > 1 ? "s" : ""} late`;
    }

    healthClass(score: number): string {
        if (score >= 80) return "health-strong";
        if (score >= 60) return "health-watch";
        return "health-risk";
    }

    riskClass(risk: string): string {
        const normalized = (risk || "").toUpperCase();
        if (normalized === "HIGH" || normalized === "CRITICAL") {
            return "risk-high";
        }
        if (normalized === "MEDIUM") {
            return "risk-medium";
        }
        return "risk-low";
    }

    statusClass(status: string): string {
        const normalized = (status || "").toUpperCase();
        if (normalized === "ACTIVE") return "status-active";
        if (normalized === "COMPLETED") return "status-completed";
        if (normalized === "ON_HOLD") return "status-hold";
        return "status-other";
    }

    progressWidth(progress: number | null | undefined): string {
        const safe = Math.max(0, Math.min(100, Number(progress ?? 0)));
        return `${safe}%`;
    }

    isSelectedProject(projectId: string): boolean {
        return this.selectedProjectId() === projectId;
    }

    memberInitial(fullName?: string): string {
        if (!fullName) {
            return "?";
        }
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
            return "?";
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 1).toUpperCase();
        }
        return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
    }

    formatDate(value?: string | null): string {
        if (!value) {
            return "Unknown";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Unknown";
        }
        return date.toLocaleDateString();
    }

    formatDateTime(value?: string | null): string {
        if (!value) {
            return "Unknown";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Unknown";
        }
        return date.toLocaleString();
    }

    private async ensureVisualizationLibs(): Promise<void> {
        if (this.libsLoaded) {
            return this.libsLoaded;
        }

        this.libsLoaded = Promise.all([
            import("d3"),
            import("chart.js/auto"),
            import("three"),
        ]).then(([d3Module, chartModule, threeModule]) => {
            this.d3Module = d3Module;
            this.chartModule = chartModule;
            this.threeModule = threeModule;
        });

        return this.libsLoaded;
    }

    private async renderDataVisuals(): Promise<void> {
        if (!this.isBrowser || !this.viewReady) {
            return;
        }

        const payload = this.portfolio();
        if (!payload) {
            this.destroyVisualizationArtifacts();
            return;
        }

        await this.ensureVisualizationLibs();
        this.renderRiskRadar(payload);
        this.renderTerritoryTreemap(payload);
        this.renderSystemsGraph(payload);
        this.renderConstellation(payload);
    }

    private renderRiskRadar(payload: DashboardPortfolioResponse): void {
        const ChartCtor = this.chartModule?.Chart;
        const canvas = this.radarCanvas?.nativeElement;
        if (!ChartCtor || !canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const projects = payload.projects;
        const totalTasks = projects.reduce((sum, project) => sum + project.taskSummary.total, 0);
        const doneTasks = projects.reduce((sum, project) => sum + project.taskSummary.done, 0);
        const overdueTasks = projects.reduce((sum, project) => sum + project.taskSummary.overdue, 0);
        const criticalOrBlocked = projects.reduce((sum, project) => sum + project.urgent.criticalOrBlockedTasks, 0);
        const overdueMilestones = projects.reduce((sum, project) => sum + project.urgent.overdueMilestones, 0);
        const totalMilestones = projects.reduce((sum, project) => sum + project.milestoneCount, 0);
        const memberTotal = projects.reduce((sum, project) => sum + project.members.count, 0);

        const healthScore = this.clamp(payload.globalHealth.score, 0, 100);
        const deliveryConfidence = totalTasks > 0 ? this.clamp((doneTasks / totalTasks) * 100, 0, 100) : 0;
        const loadBalance = totalTasks > 0
            ? this.clamp(100 - (((overdueTasks + criticalOrBlocked) / totalTasks) * 100), 0, 100)
            : 100;
        const collaboration = projects.length > 0
            ? this.clamp((memberTotal / (projects.length * 6)) * 100, 0, 100)
            : 0;
        const milestoneReliability = totalMilestones > 0
            ? this.clamp(100 - ((overdueMilestones / totalMilestones) * 100), 0, 100)
            : 100;
        const momentum = this.clamp((payload.activity.length * 7) + (payload.templatesTrending.length * 12), 0, 100);

        if (this.riskRadarChart) {
            this.riskRadarChart.destroy();
            this.riskRadarChart = undefined;
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
        gradient.addColorStop(1, "rgba(14, 165, 233, 0.10)");

        this.riskRadarChart = new ChartCtor(ctx, {
            type: "radar",
            data: {
                labels: [
                    "Health",
                    "Delivery",
                    "Load Balance",
                    "Collaboration",
                    "Milestone Reliability",
                    "Momentum",
                ],
                datasets: [
                    {
                        label: "Portfolio signal profile",
                        data: [
                            healthScore,
                            deliveryConfidence,
                            loadBalance,
                            collaboration,
                            milestoneReliability,
                            momentum,
                        ],
                        borderWidth: 2,
                        borderColor: "#6366f1",
                        backgroundColor: gradient,
                        pointBackgroundColor: "#0ea5e9",
                        pointBorderColor: "#ffffff",
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 900,
                    easing: "easeOutQuart",
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { display: false, stepSize: 20 },
                        grid: { color: "rgba(99, 102, 241, 0.12)" },
                        angleLines: { color: "rgba(99, 102, 241, 0.12)" },
                        pointLabels: {
                            color: "#4338ca",
                            font: { size: 11, family: "Inter" },
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                },
            },
        });
    }

    private renderTerritoryTreemap(payload: DashboardPortfolioResponse): void {
        const d3 = this.d3Module;
        const host = this.treemapHost?.nativeElement;
        if (!d3 || !host) {
            return;
        }

        const workspaceChildren = payload.workspaces
            .map((workspace) => {
                const projects = payload.projects
                    .filter((project) => project.workspaceId === workspace.id)
                    .map((project) => ({
                        name: project.name,
                        value: Math.max(project.taskSummary.total, 1),
                        health: project.healthScore,
                        overdue: project.taskSummary.overdue,
                        workspaceName: workspace.name,
                    }));

                return {
                    name: workspace.name,
                    children: projects,
                };
            })
            .filter((workspace) => workspace.children.length > 0);

        host.innerHTML = "";

        if (workspaceChildren.length === 0) {
            this.renderVizEmpty(host, "No project task mass available for the treemap map.");
            return;
        }

        const width = Math.max(host.clientWidth, 320);
        const height = 330;

        const hierarchyRoot = d3.hierarchy({ name: "portfolio", children: workspaceChildren } as any)
            .sum((node: any) => node.value ?? 0)
            .sort((left: any, right: any) => (right.value ?? 0) - (left.value ?? 0));

        d3.treemap()
            .tile(d3.treemapResquarify)
            .size([width, height])
            .paddingOuter(5)
            .paddingTop(18)
            .paddingInner(3)(hierarchyRoot as any);

        const svg = d3
            .select(host)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        const healthScale = d3
            .scaleLinear()
            .domain([35, 65, 100])
            .range(["#ef4444", "#f59e0b", "#10b981"]);

        const leaves = hierarchyRoot.leaves();
        const cells = svg
            .selectAll("g")
            .data(leaves)
            .enter()
            .append("g")
            .attr("transform", (leaf: any) => `translate(${leaf.x0}, ${leaf.y0})`);

        cells
            .append("rect")
            .attr("class", "treemap-cell")
            .attr("width", (leaf: any) => Math.max(0, leaf.x1 - leaf.x0))
            .attr("height", (leaf: any) => Math.max(0, leaf.y1 - leaf.y0))
            .attr("rx", 8)
            .attr("fill", (leaf: any) => {
                const tone = healthScale(this.clamp(Number(leaf.data.health ?? 0), 0, 100));
                return Number(leaf.data.overdue ?? 0) > 0 ? d3.interpolateRgb(tone, "#3b0764")(0.22) : tone;
            })
            .attr("opacity", 0.9);

        cells
            .append("title")
            .text((leaf: any) =>
                `${leaf.data.workspaceName}\n${leaf.data.name}\nTask mass: ${leaf.data.value}\nHealth: ${Math.round(leaf.data.health ?? 0)}`
            );

        cells
            .append("text")
            .attr("x", 8)
            .attr("y", 16)
            .attr("fill", "#082a35")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .each((leaf: any, index: number, nodes: any[]) => {
                const text = d3.select(nodes[index]);
                text.append("tspan").text(String(leaf.data.name).slice(0, 22));
                text
                    .append("tspan")
                    .attr("x", 8)
                    .attr("dy", 13)
                    .style("font-size", "9px")
                    .style("font-weight", "500")
                    .text(`${Math.round(leaf.data.health ?? 0)} health · ${leaf.data.value} tasks`);

                const width = leaf.x1 - leaf.x0;
                const height = leaf.y1 - leaf.y0;
                if (width < 110 || height < 40) {
                    text.remove();
                }
            });

        svg
            .selectAll(".workspace-label")
            .data(hierarchyRoot.children ?? [])
            .enter()
            .append("text")
            .attr("class", "workspace-label")
            .attr("x", (workspace: any) => workspace.x0 + 6)
            .attr("y", (workspace: any) => workspace.y0 + 13)
            .style("font-size", "10px")
            .style("font-weight", "700")
            .style("fill", "#312e81")
            .text((workspace: any) => workspace.data.name);
    }

    private renderSystemsGraph(payload: DashboardPortfolioResponse): void {
        const d3 = this.d3Module;
        const host = this.networkHost?.nativeElement;
        if (!d3 || !host) {
            return;
        }

        if (this.networkSimulation) {
            this.networkSimulation.stop();
            this.networkSimulation = undefined;
        }

        host.innerHTML = "";

        const cappedProjects = payload.projects.slice(0, 150);
        if (cappedProjects.length === 0) {
            this.renderVizEmpty(host, "No project nodes available for the systems graph.");
            return;
        }

        const width = Math.max(host.clientWidth, 320);
        const height = 330;
        const reducedMotion = this.prefersReducedMotion();

        type Node = {
            id: string;
            entityId: string;
            workspaceId: string;
            kind: "workspace" | "project";
            label: string;
            health?: number;
            fx?: number;
            fy?: number;
            x?: number;
            y?: number;
        };

        type Link = {
            source: string | Node;
            target: string | Node;
            workspaceId: string;
            projectId: string;
        };

        const workspaceLookup = new Map(payload.workspaces.map((workspace) => [workspace.id, workspace]));
        const activeWorkspaceIds = new Set(cappedProjects.map((project) => project.workspaceId));
        const projectById = new Map(cappedProjects.map((project) => [project.id, project]));

        const workspaceNodes: Node[] = Array.from(activeWorkspaceIds).map((workspaceId) => {
            const workspace = workspaceLookup.get(workspaceId);
            return {
                id: `workspace:${workspaceId}`,
                entityId: workspaceId,
                workspaceId,
                kind: "workspace",
                label: workspace?.name ?? `Workspace ${workspaceId.slice(0, 6)}`,
                health: workspace?.healthScore ?? 55,
            };
        });

        const projectNodes: Node[] = cappedProjects.map((project) => ({
            id: `project:${project.id}`,
            entityId: project.id,
            workspaceId: project.workspaceId,
            kind: "project",
            label: project.name,
            health: project.healthScore,
        }));

        const nodes: Node[] = [...workspaceNodes, ...projectNodes];

        const links: Link[] = cappedProjects.map((project) => ({
            source: `workspace:${project.workspaceId}`,
            target: `project:${project.id}`,
            workspaceId: project.workspaceId,
            projectId: project.id,
        }));

        const connectedByNodeId = new Map<string, Set<string>>();
        nodes.forEach((node) => connectedByNodeId.set(node.id, new Set<string>()));
        links.forEach((link) => {
            const sourceId = String(link.source);
            const targetId = String(link.target);
            connectedByNodeId.get(sourceId)?.add(targetId);
            connectedByNodeId.get(targetId)?.add(sourceId);
        });

        const svg = d3
            .select(host)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        const defs = svg.append("defs");
        const backgroundId = `systems-bg-${Math.floor(Math.random() * 1_000_000)}`;
        const glowId = `systems-node-glow-${Math.floor(Math.random() * 1_000_000)}`;

        const gradient = defs
            .append("radialGradient")
            .attr("id", backgroundId)
            .attr("cx", "50%")
            .attr("cy", "46%")
            .attr("r", "72%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(26, 148, 165, 0.22)");
        gradient.append("stop").attr("offset", "70%").attr("stop-color", "rgba(9, 33, 48, 0.08)");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(4, 14, 24, 0.24)");

        const glow = defs.append("filter").attr("id", glowId);
        glow.append("feGaussianBlur").attr("stdDeviation", 2.2).attr("result", "blur");
        glow.append("feMerge")
            .selectAll("feMergeNode")
            .data(["blur", "SourceGraphic"])
            .enter()
            .append("feMergeNode")
            .attr("in", (value: string) => value);

        svg
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", `url(#${backgroundId})`);

        const linkGroup = svg.append("g").attr("stroke", "rgba(99, 102, 241, 0.28)").attr("stroke-width", 1.35);
        const nodeGroup = svg.append("g");

        const linkSelection = linkGroup
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke-linecap", "round");

        const nodeSelection = nodeGroup
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", (node: Node) => (node.kind === "workspace" ? 13 : 5.2))
            .attr("fill", (node: Node) => node.kind === "workspace" ? "#6366f1" : this.healthColor(node.health ?? 0))
            .attr("stroke", "rgba(255, 255, 255, 0.9)")
            .attr("stroke-width", (node: Node) => (node.kind === "workspace" ? 1.6 : 0.95))
            .style("cursor", "pointer");

        nodeSelection
            .append("title")
            .text((node: Node) => node.kind === "workspace"
                ? `${node.label} workspace hub`
                : `${node.label} · ${Math.round(node.health ?? 0)} health`);

        const tooltip = this.createHoverTooltip(host, "graph-hover-tooltip");

        const preselectedProjectId = this.selectedProjectId();
        let hoveredNodeId: string | null = null;
        let selectedNodeId: string | null = preselectedProjectId ? `project:${preselectedProjectId}` : null;
        if (!selectedNodeId && this.selectedWorkspaceGraphId()) {
            selectedNodeId = `workspace:${this.selectedWorkspaceGraphId()}`;
        }

        const hideTooltip = () => {
            this.setHoverTooltipVisible(tooltip, false);
        };

        const showTooltip = (event: any, node: Node) => {
            const source = event?.sourceEvent ?? event;
            if (typeof source?.clientX !== "number" || typeof source?.clientY !== "number") {
                return;
            }

            const description = node.kind === "workspace"
                ? `Workspace hub · ${Math.round(node.health ?? 0)} health`
                : `Project signal · ${Math.round(node.health ?? 0)} health`;
            tooltip.textContent = `${node.label}\n${description}`;
            this.setHoverTooltipVisible(tooltip, true);
            this.positionHoverTooltip(tooltip, host, source.clientX, source.clientY);
        };

        const resolveNodeId = (reference: string | Node): string => typeof reference === "string" ? reference : reference.id;

        const linkTouches = (link: Link, nodeId: string): boolean => {
            const sourceId = resolveNodeId(link.source);
            const targetId = resolveNodeId(link.target);
            return sourceId === nodeId || targetId === nodeId;
        };

        const updateVisualState = () => {
            const activeNodeId = hoveredNodeId ?? selectedNodeId;
            const connected = activeNodeId ? connectedByNodeId.get(activeNodeId) ?? new Set<string>() : null;

            linkSelection
                .attr("stroke", (link: Link) => {
                    if (!activeNodeId) {
                        return "rgba(76, 125, 148, 0.32)";
                    }
                    return linkTouches(link, activeNodeId)
                        ? "rgba(165, 167, 255, 0.9)"
                        : "rgba(99, 102, 241, 0.1)";
                })
                .attr("stroke-width", (link: Link) => {
                    if (!activeNodeId) {
                        return 1.35;
                    }
                    return linkTouches(link, activeNodeId) ? 2.4 : 0.9;
                })
                .attr("opacity", (link: Link) => {
                    if (!activeNodeId) {
                        return 0.92;
                    }
                    return linkTouches(link, activeNodeId) ? 1 : 0.35;
                });

            nodeSelection
                .attr("opacity", (node: Node) => {
                    if (!activeNodeId) {
                        return 0.97;
                    }
                    if (node.id === activeNodeId) {
                        return 1;
                    }
                    if (connected?.has(node.id)) {
                        return 0.95;
                    }
                    return 0.26;
                })
                .attr("r", (node: Node) => {
                    const base = node.kind === "workspace" ? 13 : 5.2;
                    if (node.id === hoveredNodeId) {
                        return base + (node.kind === "workspace" ? 3.1 : 2.1);
                    }
                    if (node.id === selectedNodeId) {
                        return base + (node.kind === "workspace" ? 2 : 1.3);
                    }
                    return base;
                })
                .attr("stroke-width", (node: Node) => {
                    if (node.id === hoveredNodeId) {
                        return node.kind === "workspace" ? 2.4 : 1.7;
                    }
                    return node.kind === "workspace" ? 1.6 : 0.95;
                })
                .attr("filter", (node: Node) => node.id === hoveredNodeId || node.id === selectedNodeId ? `url(#${glowId})` : null);
        };

        this.networkSimulation = d3
            .forceSimulation(nodes)
            .alphaDecay(reducedMotion ? 0.095 : 0.045)
            .velocityDecay(reducedMotion ? 0.62 : 0.46)
            .force("link", d3.forceLink(links).id((node: any) => node.id).distance(74).strength(0.9))
            .force("charge", d3.forceManyBody().strength(-125))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((node: Node) => node.kind === "workspace" ? 19 : 8))
            .on("tick", () => {
                linkSelection
                    .attr("x1", (link: any) => link.source.x)
                    .attr("y1", (link: any) => link.source.y)
                    .attr("x2", (link: any) => link.target.x)
                    .attr("y2", (link: any) => link.target.y);

                nodeSelection
                    .attr("cx", (node: any) => node.x)
                    .attr("cy", (node: any) => node.y);
            });

        let draggingNode = false;
        const simulation = this.networkSimulation;
        const drag = d3
            .drag()
            .on("start", (event: any, node: any) => {
                draggingNode = true;
                hoveredNodeId = null;
                hideTooltip();
                updateVisualState();

                if (!event.active) {
                    simulation.alphaTarget(0.25).restart();
                }
                node.fx = node.x;
                node.fy = node.y;
            })
            .on("drag", (event: any, node: any) => {
                node.fx = event.x;
                node.fy = event.y;
            })
            .on("end", (event: any, node: any) => {
                draggingNode = false;
                if (!event.active) {
                    simulation.alphaTarget(0);
                }
                node.fx = null;
                node.fy = null;
            });

        nodeSelection
            .on("mouseenter", (event: any, node: Node) => {
                if (draggingNode) {
                    return;
                }
                hoveredNodeId = node.id;
                showTooltip(event, node);
                updateVisualState();
            })
            .on("mousemove", (event: any, node: Node) => {
                if (draggingNode || hoveredNodeId !== node.id) {
                    return;
                }
                showTooltip(event, node);
            })
            .on("mouseleave", () => {
                hoveredNodeId = null;
                hideTooltip();
                updateVisualState();
            })
            .on("click", (event: any, node: Node) => {
                if (event.defaultPrevented) {
                    return;
                }

                selectedNodeId = node.id;
                if (node.kind === "project") {
                    this.selectProject(node.entityId);
                    this.selectedWorkspaceGraphId.set(node.workspaceId);
                } else {
                    this.selectedWorkspaceGraphId.set(node.entityId);
                }
                updateVisualState();
            })
            .on("dblclick", (event: any, node: Node) => {
                if (event.defaultPrevented) {
                    return;
                }
                event.stopPropagation();

                if (node.kind === "project") {
                    const project = projectById.get(node.entityId);
                    if (project) {
                        this.navigateToProjectDetails(project.id, project.workspaceId);
                    }
                    return;
                }

                this.navigateToWorkspaceDetails(node.entityId);
            });

        nodeSelection.call(drag as any);

        svg.on("mouseleave", () => {
            hoveredNodeId = null;
            hideTooltip();
            updateVisualState();
        });

        updateVisualState();
    }

    private renderConstellation(payload: DashboardPortfolioResponse): void {
        const THREE = this.threeModule;
        const host = this.constellationHost?.nativeElement;
        if (!THREE || !host) {
            return;
        }

        this.destroyThreeScene();

        const projects = payload.projects.slice(0, 180);
        if (projects.length === 0) {
            host.innerHTML = "";
            this.renderVizEmpty(host, "No project points available for the 3D constellation.");
            return;
        }

        const workspaceLookup = new Map(payload.workspaces.map((workspace) => [workspace.id, workspace]));
        const projectsByWorkspace = new Map<string, DashboardProjectCard[]>();
        projects.forEach((project) => {
            const bucket = projectsByWorkspace.get(project.workspaceId) ?? [];
            bucket.push(project);
            projectsByWorkspace.set(project.workspaceId, bucket);
        });

        const workspaceEntries = Array.from(projectsByWorkspace.entries())
            .map(([workspaceId, workspaceProjects]) => {
                const workspace = workspaceLookup.get(workspaceId);
                return {
                    workspaceId,
                    workspace: {
                        id: workspaceId,
                        name: workspace?.name ?? `Workspace ${workspaceId.slice(0, 6)}`,
                        healthScore: workspace?.healthScore ?? 55,
                    },
                    projects: workspaceProjects,
                };
            })
            .sort((left, right) => right.projects.length - left.projects.length);

        const width = Math.max(host.clientWidth, 320);
        const height = 340;
        const reducedMotion = this.prefersReducedMotion();

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x06111b, 0.0125);

        const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 900);
        camera.position.set(0, 12, 52);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x050d16, 0.18);

        host.innerHTML = "";
        host.appendChild(renderer.domElement);
        renderer.domElement.classList.add("constellation-canvas");

        const tooltip = this.createHoverTooltip(host, "constellation-hover-tooltip");
        this.threeTooltipElement = tooltip;

        const ambient = new THREE.AmbientLight(0xa6cbe8, 0.52);
        const hemi = new THREE.HemisphereLight(0x99dcff, 0x05131d, 0.66);
        const key = new THREE.PointLight(0x7ef6ff, 2.2, 360, 1.65);
        key.position.set(35, 32, 42);
        const warm = new THREE.PointLight(0xffbe72, 1.15, 250, 1.45);
        warm.position.set(-30, -14, 20);
        scene.add(ambient, hemi, key, warm);

        const createStarField = (count: number, size: number, opacity: number, spread: number, color: number) => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let index = 0; index < count; index++) {
                positions[index * 3] = (Math.random() - 0.5) * spread;
                positions[index * 3 + 1] = (Math.random() - 0.5) * spread;
                positions[index * 3 + 2] = (Math.random() - 0.5) * spread;
            }
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            return new THREE.Points(
                geometry,
                new THREE.PointsMaterial({ color, size, transparent: true, opacity })
            );
        };

        const farStars = createStarField(920, 0.32, 0.36, 240, 0xa6e8dc);
        const nearStars = createStarField(520, 0.56, 0.28, 170, 0xffd4a0);
        scene.add(farStars, nearStars);

        const planetTexture = this.createPlanetTexture(THREE);
        const planet = new THREE.Mesh(
            new THREE.SphereGeometry(6.2, 64, 64),
            new THREE.MeshStandardMaterial({
                color: 0x2f8ef4,
                map: planetTexture ?? undefined,
                emissive: 0x0d2642,
                emissiveIntensity: 0.45,
                roughness: 0.86,
                metalness: 0.05,
            })
        );
        scene.add(planet);

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(6.95, 48, 48),
            new THREE.MeshBasicMaterial({
                color: 0x74deff,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide,
            })
        );
        scene.add(atmosphere);

        const ionRing = new THREE.Mesh(
            new THREE.TorusGeometry(8.9, 0.14, 18, 180),
            new THREE.MeshBasicMaterial({ color: 0x7fd7ff, transparent: true, opacity: 0.28 })
        );
        ionRing.rotation.x = Math.PI * 0.41;
        scene.add(ionRing);

        const orbitalGroup = new THREE.Group();
        scene.add(orbitalGroup);

        const globalOrbitRings: Array<{ line: any; material: any; ringIndex: number }> = [];
        const createdRingIndices = new Set<number>();

        type InteractiveNode = {
            kind: "workspace" | "project";
            mesh: any;
            workspaceId: string;
            projectId?: string;
            name: string;
            health: number;
        };

        type WorkspaceVisual = {
            pivot: any;
            carrier: any;
            satellitesPivot: any;
            orbitMaterial: any;
            haloMaterial: any;
            baseY: number;
            phase: number;
            startAngle: number;
            orbitSpeed: number;
            satelliteSpeed: number;
        };

        const interactiveNodes: InteractiveNode[] = [];
        const workspaceVisuals = new Map<string, WorkspaceVisual>();
        const projectAnimators: Array<{ mesh: any; baseY: number; amplitude: number; speed: number; phase: number }> = [];

        const slotsPerRing = 10;

        workspaceEntries.forEach((entry, index) => {
            const ringIndex = Math.floor(index / slotsPerRing);
            const slotIndex = index % slotsPerRing;
            const ringCount = Math.min(slotsPerRing, workspaceEntries.length - (ringIndex * slotsPerRing));
            const orbitRadius = 14 + (ringIndex * 5.3);
            const baseY = (ringIndex - 0.7) * 1.9;
            const startAngle = ((slotIndex / Math.max(ringCount, 1)) * Math.PI * 2) + (ringIndex * 0.34);

            if (!createdRingIndices.has(ringIndex)) {
                createdRingIndices.add(ringIndex);
                const orbitPoints: any[] = [];
                for (let pointIndex = 0; pointIndex <= 160; pointIndex++) {
                    const angle = (pointIndex / 160) * Math.PI * 2;
                    orbitPoints.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, baseY, Math.sin(angle) * orbitRadius));
                }

                const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
                const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x2d6d8f, transparent: true, opacity: 0.28 });
                const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
                orbitalGroup.add(orbitLine);
                globalOrbitRings.push({ line: orbitLine, material: orbitMaterial, ringIndex });
            }

            const orbitPivot = new THREE.Group();
            orbitPivot.rotation.y = startAngle;
            orbitalGroup.add(orbitPivot);

            const carrier = new THREE.Group();
            carrier.position.set(orbitRadius, baseY, 0);
            orbitPivot.add(carrier);

            const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(orbitRadius, baseY, 0),
            ]);
            const connector = new THREE.Line(
                connectorGeometry,
                new THREE.LineBasicMaterial({ color: 0x295f87, transparent: true, opacity: 0.24 })
            );
            orbitPivot.add(connector);

            const workspaceColor = this.healthColorToHex(entry.workspace.healthScore);
            const hubRadius = this.clamp(0.86 + (entry.projects.length / 55), 0.86, 1.5);

            const hubMesh = new THREE.Mesh(
                new THREE.SphereGeometry(hubRadius, 24, 24),
                new THREE.MeshStandardMaterial({
                    color: workspaceColor,
                    emissive: workspaceColor,
                    emissiveIntensity: 0.38,
                    roughness: 0.3,
                    metalness: 0.24,
                })
            );
            carrier.add(hubMesh);

            const haloMaterial = new THREE.MeshBasicMaterial({
                color: workspaceColor,
                transparent: true,
                opacity: 0.16,
            });
            const haloMesh = new THREE.Mesh(
                new THREE.SphereGeometry(hubRadius * 1.7, 22, 22),
                haloMaterial
            );
            carrier.add(haloMesh);

            const satellitesPivot = new THREE.Group();
            carrier.add(satellitesPivot);

            const localOrbitRadius = this.clamp(2.5 + (entry.projects.length / 11), 2.5, 5.8);
            const localOrbitPoints: any[] = [];
            for (let orbitIndex = 0; orbitIndex <= 90; orbitIndex++) {
                const angle = (orbitIndex / 90) * Math.PI * 2;
                localOrbitPoints.push(new THREE.Vector3(Math.cos(angle) * localOrbitRadius, 0, Math.sin(angle) * localOrbitRadius));
            }
            const localOrbitMaterial = new THREE.LineBasicMaterial({ color: 0x5dd6da, transparent: true, opacity: 0.25 });
            const localOrbitLine = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(localOrbitPoints),
                localOrbitMaterial
            );
            carrier.add(localOrbitLine);

            entry.projects.forEach((project, projectIndex) => {
                const layer = Math.floor(projectIndex / 9);
                const layerCount = Math.min(9, entry.projects.length - (layer * 9));
                const layerSlot = projectIndex % 9;
                const orbit = 2.3 + (layer * 1.32);
                const angle = ((layerSlot / Math.max(layerCount, 1)) * Math.PI * 2) + (layer * 0.27);
                const meshRadius = this.clamp(0.26 + (project.taskSummary.total / 240), 0.26, 0.8);
                const projectColor = this.riskColorHex(project.riskLevel, project.healthScore);

                const projectMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(meshRadius, 20, 20),
                    new THREE.MeshStandardMaterial({
                        color: projectColor,
                        emissive: projectColor,
                        emissiveIntensity: 0.28,
                        roughness: 0.34,
                        metalness: 0.2,
                    })
                );

                projectMesh.position.set(
                    Math.cos(angle) * orbit,
                    (Math.random() - 0.5) * 0.9,
                    Math.sin(angle) * orbit
                );

                satellitesPivot.add(projectMesh);

                const tetherGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    projectMesh.position.clone(),
                ]);
                const tether = new THREE.Line(
                    tetherGeometry,
                    new THREE.LineBasicMaterial({
                        color: workspaceColor,
                        transparent: true,
                        opacity: 0.23,
                    })
                );
                satellitesPivot.add(tether);

                interactiveNodes.push({
                    kind: "project",
                    mesh: projectMesh,
                    workspaceId: project.workspaceId,
                    projectId: project.id,
                    name: project.name,
                    health: project.healthScore,
                });

                projectAnimators.push({
                    mesh: projectMesh,
                    baseY: projectMesh.position.y,
                    amplitude: 0.12 + (layer * 0.04),
                    speed: 0.95 + (projectIndex % 7) * 0.16,
                    phase: projectIndex * 0.42,
                });
            });

            interactiveNodes.push({
                kind: "workspace",
                mesh: hubMesh,
                workspaceId: entry.workspaceId,
                name: entry.workspace.name,
                health: entry.workspace.healthScore,
            });

            workspaceVisuals.set(entry.workspaceId, {
                pivot: orbitPivot,
                carrier,
                satellitesPivot,
                orbitMaterial: localOrbitMaterial,
                haloMaterial,
                baseY,
                phase: index * 0.45,
                startAngle,
                orbitSpeed: 0.043 + (ringIndex * 0.008) + ((index % 4) * 0.004),
                satelliteSpeed: 0.11 + ((index % 6) * 0.015),
            });
        });

        const interactiveMeshes = interactiveNodes.map((node) => node.mesh);
        const meshNodeMap = new Map<any, InteractiveNode>();
        interactiveNodes.forEach((node) => meshNodeMap.set(node.mesh, node));

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        let hoveredNode: InteractiveNode | null = null;
        let selectedNode: InteractiveNode | null = null;

        const preselectedProjectId = this.selectedProjectId();
        if (preselectedProjectId) {
            selectedNode = interactiveNodes.find((node) => node.kind === "project" && node.projectId === preselectedProjectId) ?? null;
            if (selectedNode) {
                this.selectedWorkspaceGraphId.set(selectedNode.workspaceId);
            }
        }

        const hideTooltip = () => {
            this.setHoverTooltipVisible(tooltip, false);
        };

        const pickNode = (event: MouseEvent | PointerEvent): InteractiveNode | null => {
            const rect = renderer.domElement.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return null;
            }

            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);

            const intersections = raycaster.intersectObjects(interactiveMeshes, false);
            const mesh = intersections[0]?.object;
            if (!mesh) {
                return null;
            }

            return meshNodeMap.get(mesh) ?? null;
        };

        const showTooltip = (node: InteractiveNode, event: MouseEvent | PointerEvent) => {
            const role = node.kind === "workspace" ? "Workspace hub" : "Project satellite";
            tooltip.textContent = `${node.name}\n${role} · ${Math.round(node.health)} health`;
            this.setHoverTooltipVisible(tooltip, true);
            this.positionHoverTooltip(tooltip, host, event.clientX, event.clientY);
        };

        const resolveActiveWorkspaceId = (): string | null => {
            if (hoveredNode?.workspaceId) {
                return hoveredNode.workspaceId;
            }
            if (selectedNode?.workspaceId) {
                return selectedNode.workspaceId;
            }
            return this.selectedWorkspaceGraphId();
        };

        const applyVisualState = () => {
            const activeWorkspaceId = resolveActiveWorkspaceId();
            const hasFocusedNode = Boolean(hoveredNode || selectedNode);

            interactiveNodes.forEach((node) => {
                const material = node.mesh.material;
                const hovered = hoveredNode?.mesh === node.mesh;
                const selected = selectedNode?.mesh === node.mesh;
                const workspaceRelated = Boolean(activeWorkspaceId && node.workspaceId === activeWorkspaceId);
                const faded = hasFocusedNode && !hovered && !selected && !workspaceRelated;

                node.mesh.scale.setScalar(hovered ? 1.26 : selected ? 1.16 : workspaceRelated ? 1.06 : 1);

                if (material) {
                    const baseEmissive = node.kind === "workspace" ? 0.38 : 0.28;
                    const boost = hovered ? 0.52 : selected ? 0.34 : workspaceRelated ? 0.1 : 0;
                    material.emissiveIntensity = baseEmissive + boost;
                    material.opacity = faded ? 0.34 : 1;
                    material.transparent = faded;
                }
            });

            workspaceVisuals.forEach((visual, workspaceId) => {
                const active = Boolean(activeWorkspaceId && workspaceId === activeWorkspaceId);
                visual.orbitMaterial.opacity = active ? 0.78 : 0.25;
                visual.haloMaterial.opacity = active ? 0.36 : 0.16;
            });

            globalOrbitRings.forEach((ring) => {
                ring.material.opacity = activeWorkspaceId ? 0.14 : 0.28;
            });
        };

        const onPointerMove = (event: PointerEvent) => {
            const hit = pickNode(event);
            hoveredNode = hit;
            if (hit) {
                showTooltip(hit, event);
            } else {
                hideTooltip();
            }
            applyVisualState();
        };

        const onPointerLeave = () => {
            hoveredNode = null;
            hideTooltip();
            applyVisualState();
        };

        const onClick = (event: MouseEvent) => {
            const hit = pickNode(event);
            if (!hit) {
                return;
            }

            selectedNode = hit;
            this.selectedWorkspaceGraphId.set(hit.workspaceId);
            if (hit.kind === "project" && hit.projectId) {
                this.selectProject(hit.projectId);
            }
            applyVisualState();
        };

        const onDoubleClick = (event: MouseEvent) => {
            const hit = pickNode(event);
            if (!hit) {
                return;
            }

            event.preventDefault();
            if (hit.kind === "project" && hit.projectId) {
                this.navigateToProjectDetails(hit.projectId, hit.workspaceId);
                return;
            }

            this.navigateToWorkspaceDetails(hit.workspaceId);
        };

        renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
        renderer.domElement.addEventListener("pointerleave", onPointerLeave, { passive: true });
        renderer.domElement.addEventListener("click", onClick);
        renderer.domElement.addEventListener("dblclick", onDoubleClick);

        this.threeCanvasElement = renderer.domElement;
        this.threePointerMoveHandler = onPointerMove;
        this.threePointerLeaveHandler = onPointerLeave;
        this.threeClickHandler = onClick;
        this.threeDoubleClickHandler = onDoubleClick;

        applyVisualState();

        const start = performance.now();
        const motionScale = reducedMotion ? 0.58 : 1;
        const animate = () => {
            this.threeAnimationFrameId = requestAnimationFrame(animate);

            const elapsed = (performance.now() - start) / 1000;
            planet.rotation.y = elapsed * 0.065 * motionScale;
            planet.rotation.z = Math.sin(elapsed * 0.11 * motionScale) * 0.03;
            atmosphere.rotation.y = -elapsed * 0.03 * motionScale;
            ionRing.rotation.z = elapsed * 0.048 * motionScale;
            farStars.rotation.y = elapsed * 0.0045 * motionScale;
            nearStars.rotation.y = -elapsed * 0.008 * motionScale;

            workspaceVisuals.forEach((visual) => {
                visual.pivot.rotation.y = visual.startAngle + (elapsed * visual.orbitSpeed * motionScale);
                visual.satellitesPivot.rotation.y = elapsed * visual.satelliteSpeed * motionScale;
                visual.carrier.position.y = visual.baseY + Math.sin(elapsed * 0.72 * motionScale + visual.phase) * 0.34;
            });

            projectAnimators.forEach((animator) => {
                animator.mesh.position.y = animator.baseY + Math.sin(elapsed * animator.speed * motionScale + animator.phase) * animator.amplitude;
            });

            camera.position.x = Math.sin(elapsed * 0.17 * motionScale) * (reducedMotion ? 3.1 : 6.6);
            camera.position.z = 49 + Math.cos(elapsed * 0.12 * motionScale) * (reducedMotion ? 1.2 : 2.9);
            camera.position.y = 11 + Math.sin(elapsed * 0.15 * motionScale) * (reducedMotion ? 0.6 : 1.8);
            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        };
        animate();

        this.threeResizeHandler = () => {
            const nextWidth = Math.max(host.clientWidth, 320);
            const nextHeight = Math.max(host.clientHeight, 300);
            renderer.setSize(nextWidth, nextHeight, false);
            camera.aspect = nextWidth / nextHeight;
            camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", this.threeResizeHandler, { passive: true });

        this.threeRenderer = renderer;
        this.threeScene = scene;
        this.threeCamera = camera;
    }

    private destroyVisualizationArtifacts(): void {
        if (this.riskRadarChart) {
            this.riskRadarChart.destroy();
            this.riskRadarChart = undefined;
        }

        if (this.networkSimulation) {
            this.networkSimulation.stop();
            this.networkSimulation = undefined;
        }

        this.destroyThreeScene();
    }

    private destroyThreeScene(): void {
        if (this.threeAnimationFrameId != null) {
            cancelAnimationFrame(this.threeAnimationFrameId);
            this.threeAnimationFrameId = null;
        }

        if (this.threeResizeHandler) {
            window.removeEventListener("resize", this.threeResizeHandler);
            this.threeResizeHandler = null;
        }

        if (this.threeCanvasElement) {
            if (this.threePointerMoveHandler) {
                this.threeCanvasElement.removeEventListener("pointermove", this.threePointerMoveHandler);
            }
            if (this.threePointerLeaveHandler) {
                this.threeCanvasElement.removeEventListener("pointerleave", this.threePointerLeaveHandler);
            }
            if (this.threeClickHandler) {
                this.threeCanvasElement.removeEventListener("click", this.threeClickHandler);
            }
            if (this.threeDoubleClickHandler) {
                this.threeCanvasElement.removeEventListener("dblclick", this.threeDoubleClickHandler);
            }
        }

        this.threeCanvasElement = null;
        this.threePointerMoveHandler = null;
        this.threePointerLeaveHandler = null;
        this.threeClickHandler = null;
        this.threeDoubleClickHandler = null;

        if (this.threeTooltipElement) {
            this.threeTooltipElement.remove();
            this.threeTooltipElement = null;
        }

        if (this.threeScene) {
            this.threeScene.traverse((object: any) => {
                if (object.geometry?.dispose) {
                    object.geometry.dispose();
                }

                if (Array.isArray(object.material)) {
                    object.material.forEach((material: any) => this.disposeThreeMaterial(material));
                } else {
                    this.disposeThreeMaterial(object.material);
                }
            });
        }

        if (this.threeRenderer) {
            this.threeRenderer.dispose();
            this.threeRenderer.forceContextLoss?.();
            this.threeRenderer.domElement?.remove();
        }

        this.threeRenderer = undefined;
        this.threeScene = undefined;
        this.threeCamera = undefined;
    }

    private disposeThreeMaterial(material: any): void {
        if (!material) {
            return;
        }

        if (material.map?.dispose) material.map.dispose();
        if (material.alphaMap?.dispose) material.alphaMap.dispose();
        if (material.emissiveMap?.dispose) material.emissiveMap.dispose();
        if (material.normalMap?.dispose) material.normalMap.dispose();
        material.dispose?.();
    }

    private renderVizEmpty(host: HTMLElement, message: string): void {
        host.innerHTML = `<div class="viz-empty">${message}</div>`;
    }

    private healthColor(score: number): string {
        if (score >= 80) return "#10b981";
        if (score >= 60) return "#f59e0b";
        return "#ef4444";
    }

    private healthColorToHex(score: number): number {
        const color = this.healthColor(score);
        const parsed = Number.parseInt(color.replace("#", ""), 16);
        return Number.isFinite(parsed) ? parsed : 0x6366f1;
    }

    private navigateToProjectDetails(projectId: string, workspaceId: string): void {
        if (!projectId || !workspaceId) {
            return;
        }

        void this.router.navigate(["/app/real-projects", workspaceId, projectId]);
    }

    private navigateToWorkspaceDetails(workspaceId: string): void {
        if (!workspaceId) {
            return;
        }

        void this.router.navigate(["/app/workspaces", workspaceId]);
    }

    private createHoverTooltip(host: HTMLElement, className: string): HTMLDivElement {
        const tooltip = document.createElement("div");
        tooltip.className = className;
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.style.position = "absolute";
        tooltip.style.top = "0";
        tooltip.style.left = "0";
        tooltip.style.transform = "translate(-999px, -999px)";
        tooltip.style.pointerEvents = "none";
        tooltip.style.zIndex = "6";
        tooltip.style.maxWidth = "240px";
        tooltip.style.padding = "0.44rem 0.56rem";
        tooltip.style.borderRadius = "10px";
        tooltip.style.border = "1px solid rgba(110, 242, 232, 0.55)";
        tooltip.style.background = "linear-gradient(150deg, rgba(8, 33, 45, 0.96), rgba(14, 52, 71, 0.95))";
        tooltip.style.color = "#e8f9ff";
        tooltip.style.boxShadow = "0 14px 34px rgba(2, 12, 21, 0.38)";
        tooltip.style.fontSize = "0.72rem";
        tooltip.style.lineHeight = "1.35";
        tooltip.style.fontWeight = "600";
        tooltip.style.letterSpacing = "0.01em";
        tooltip.style.whiteSpace = "pre-line";
        tooltip.style.opacity = "0";
        tooltip.style.visibility = "hidden";
        tooltip.style.transition = "opacity 130ms ease";
        host.appendChild(tooltip);
        return tooltip;
    }

    private setHoverTooltipVisible(tooltip: HTMLElement, visible: boolean): void {
        tooltip.style.opacity = visible ? "1" : "0";
        tooltip.style.visibility = visible ? "visible" : "hidden";
    }

    private positionHoverTooltip(
        tooltip: HTMLElement,
        host: HTMLElement,
        clientX: number,
        clientY: number,
    ): void {
        const rect = host.getBoundingClientRect();
        const tooltipWidth = tooltip.offsetWidth || 170;
        const tooltipHeight = tooltip.offsetHeight || 52;

        const maxLeft = Math.max(8, rect.width - tooltipWidth - 8);
        const maxTop = Math.max(8, rect.height - tooltipHeight - 8);

        const left = this.clamp(clientX - rect.left + 14, 8, maxLeft);
        const top = this.clamp(clientY - rect.top - tooltipHeight - 12, 8, maxTop);

        tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    }

    private prefersReducedMotion(): boolean {
        if (!this.isBrowser || typeof window.matchMedia !== "function") {
            return false;
        }

        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    private createPlanetTexture(THREE: any): any | null {
        if (!this.isBrowser) {
            return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;

        const context = canvas.getContext("2d");
        if (!context) {
            return null;
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const baseGradient = context.createRadialGradient(centerX * 0.72, centerY * 0.7, 20, centerX, centerY, centerX);
        baseGradient.addColorStop(0, "#66f0ff");
        baseGradient.addColorStop(0.38, "#2f8ef4");
        baseGradient.addColorStop(0.72, "#215a8f");
        baseGradient.addColorStop(1, "#0d2e47");
        context.fillStyle = baseGradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        for (let index = 0; index < 4200; index++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const alpha = 0.03 + (Math.random() * 0.08);
            context.fillStyle = `rgba(255,255,255,${alpha})`;
            context.fillRect(x, y, 1.4, 1.4);
        }

        context.globalAlpha = 0.22;
        context.strokeStyle = "#b8f4ff";
        context.lineWidth = 3.6;
        for (let index = 0; index < 7; index++) {
            context.beginPath();
            context.ellipse(
                centerX + ((Math.random() - 0.5) * 120),
                centerY + ((Math.random() - 0.5) * 90),
                160 + (Math.random() * 80),
                30 + (Math.random() * 26),
                (Math.random() - 0.5) * 0.8,
                0,
                Math.PI * 2,
            );
            context.stroke();
        }

        context.globalAlpha = 0.26;
        context.fillStyle = "#1accc5";
        for (let index = 0; index < 10; index++) {
            context.beginPath();
            context.ellipse(
                centerX + ((Math.random() - 0.5) * 210),
                centerY + ((Math.random() - 0.5) * 160),
                24 + (Math.random() * 60),
                12 + (Math.random() * 30),
                Math.random() * Math.PI,
                0,
                Math.PI * 2,
            );
            context.fill();
        }
        context.globalAlpha = 1;

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 8;
        if ("SRGBColorSpace" in THREE) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.needsUpdate = true;
        return texture;
    }

    private riskColorHex(riskLevel: string, healthScore: number): number {
        const risk = (riskLevel || "").toUpperCase();
        if (risk === "HIGH" || risk === "CRITICAL") {
            return 0xff595e;
        }
        if (risk === "MEDIUM") {
            return 0xffc145;
        }
        if (healthScore >= 80) {
            return 0x35d39f;
        }
        return 0x54d6ff;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }

    private fetchPortfolio(isPolling: boolean) {
        if (isPolling) {
            this.refreshing.set(true);
        } else {
            this.loading.set(true);
        }

        return this.dashboardService.getPortfolio(20, 12, 3).pipe(
            tap((payload) => {
                this.portfolio.set(payload);
                this.error.set(null);
                void this.renderDataVisuals();

                const projectId = this.ensureProjectSelection(payload.projects);
                if (projectId) {
                    this.fetchProjectFocus(projectId, true);
                }
            }),
            map(() => void 0),
            catchError((error: HttpErrorResponse) => {
                this.error.set(this.toErrorMessage(error));
                return of(void 0);
            }),
            finalize(() => {
                this.loading.set(false);
                this.refreshing.set(false);
            }),
        );
    }

    private ensureProjectSelection(projects: DashboardProjectCard[]): string | null {
        const currentId = this.selectedProjectId();
        if (currentId && projects.some((project) => project.id === currentId)) {
            return currentId;
        }

        const fallbackId = projects[0]?.id ?? null;
        this.selectedProjectId.set(fallbackId);

        if (!fallbackId) {
            this.focus.set(null);
        }

        return fallbackId;
    }

    private fetchProjectFocus(projectId: string, silent: boolean): void {
        const project = this.projectCards().find((item) => item.id === projectId);
        const workspaceId = project?.workspaceId;

        if (!silent) {
            this.focusLoading.set(true);
        }

        this.dashboardService
            .getProjectFocus(projectId, workspaceId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                catchError((error: HttpErrorResponse) => {
                    if (!silent) {
                        this.error.set(this.toErrorMessage(error));
                        this.focus.set(null);
                    }
                    return of(null);
                }),
                finalize(() => {
                    this.focusLoading.set(false);
                }),
            )
            .subscribe((payload) => {
                if (payload) {
                    this.focus.set(payload);
                }
            });
    }

    private toErrorMessage(error: HttpErrorResponse): string {
        if (typeof error.error === "string" && error.error.trim().length > 0) {
            return error.error;
        }
        if (error.error && typeof error.error === "object" && "message" in error.error) {
            const message = String((error.error as { message?: string }).message ?? "").trim();
            if (message.length > 0) {
                return message;
            }
        }
        if (error.status === 0) {
            return "Cannot reach dashboard API. Check backend availability.";
        }
        return `Dashboard request failed (${error.status || "unknown"}).`;
    }
}
