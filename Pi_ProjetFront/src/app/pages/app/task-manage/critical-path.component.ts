import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape, { Core } from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';

import { TaskItem } from './all-task.component';
import { TaskDependencyResponseDto } from '../../../services/TaskService/taskDepdendencyService';

cytoscape.use(dagre);

interface CPMNode {
  id: number;
  title: string;
  duration: number;
  status: string;
  priority: string;
  ES: number; // Earliest Start
  EF: number; // Earliest Finish
  LS: number; // Latest Start
  LF: number; // Latest Finish
  slack: number;
  onCriticalPath: boolean;
}

@Component({
  selector: 'app-critical-path',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cp-wrapper">
      <!-- Legend -->
      <div class="cp-legend">
        <span class="legend-item critical"><span class="dot"></span>Chemin critique</span>
        <span class="legend-item normal"><span class="dot"></span>Tâche normale</span>
        <span class="legend-item done"><span class="dot"></span>Terminée</span>
        <span class="legend-item no-dep">* Tâches sans dépendances affichées séparément</span>
      </div>

      <!-- Stats bar -->
      <div class="cp-stats" *ngIf="criticalNodes.length > 0">
        <div class="stat">
          <span class="stat-label">Durée totale critique</span>
          <span class="stat-val">{{ totalCriticalDuration }}h</span>
        </div>
        <div class="stat">
          <span class="stat-label">Tâches critiques</span>
          <span class="stat-val critical-color">{{ criticalNodes.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Tâches normales</span>
          <span class="stat-val">{{ normalNodes.length }}</span>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="isEmpty" class="cp-empty">
        <div class="empty-icon">�</div>
        <p>Aucune tâche disponible.</p>
        <p class="hint">Créez des tâches avec des durées estimées pour voir le chemin critique.</p>
      </div>

      <!-- Cytoscape container -->
      <div #cytoscapeContainer class="cy-container" [class.hidden]="isEmpty"></div>

      <!-- Node tooltip -->
      <div class="cp-tooltip" [class.visible]="tooltip.visible"
           [style.left.px]="tooltip.x" [style.top.px]="tooltip.y">
        <div class="tooltip-title">{{ tooltip.title }}</div>
        <div class="tooltip-row"><span>Durée estimée</span><strong>{{ tooltip.duration }}h</strong></div>
        <div class="tooltip-row"><span>Début au plus tôt</span><strong>{{ tooltip.ES }}h</strong></div>
        <div class="tooltip-row"><span>Fin au plus tôt</span><strong>{{ tooltip.EF }}h</strong></div>
        <div class="tooltip-row"><span>Début au plus tard</span><strong>{{ tooltip.LS }}h</strong></div>
        <div class="tooltip-row"><span>Fin au plus tard</span><strong>{{ tooltip.LF }}h</strong></div>
        <div class="tooltip-row slack" [class.zero]="tooltip.slack === 0">
          <span>Marge totale</span><strong>{{ tooltip.slack }}h</strong>
        </div>
        <div class="tooltip-badge" [class.critical]="tooltip.slack === 0">
          {{ tooltip.slack === 0 ? '🔴 Chemin critique' : '🟢 Tâche normale' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cp-wrapper {
      position: relative;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      min-height: 520px;
    }

    .cp-legend {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      padding: 12px 16px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-item.critical .dot { background: #ef4444; }
    .legend-item.normal .dot { background: #3b82f6; }
    .legend-item.done .dot { background: #10b981; }
    .legend-item.no-dep { font-style: italic; font-size: 0.72rem; color: #64748b; }

    .cp-stats {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .stat {
      flex: 1;
      text-align: center;
      padding: 10px 16px;
      border-right: 1px solid rgba(255,255,255,0.08);
    }

    .stat:last-child { border-right: none; }

    .stat-label {
      display: block;
      font-size: 0.72rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-val {
      display: block;
      font-size: 1.3rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 2px;
    }

    .stat-val.critical-color { color: #ef4444; }

    .cy-container {
      width: 100%;
      height: 460px;
      background: #0f172a;
    }

    .cy-container.hidden { display: none; }

    .cp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      color: #64748b;
      text-align: center;
      gap: 8px;
    }

    .empty-icon { font-size: 3rem; }

    .cp-empty p { margin: 0; font-size: 0.95rem; }

    .cp-empty .hint { font-size: 0.8rem; color: #475569; max-width: 380px; }

    /* Tooltip */
    .cp-tooltip {
      position: absolute;
      pointer-events: none;
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 12px 14px;
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.15s, transform 0.15s;
      z-index: 100;
    }

    .cp-tooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .tooltip-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 6px;
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 3px 0;
    }

    .tooltip-row strong { color: #f1f5f9; }

    .tooltip-row.slack.zero strong { color: #ef4444; }

    .tooltip-badge {
      margin-top: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      background: rgba(59,130,246,0.15);
      color: #60a5fa;
    }

    .tooltip-badge.critical {
      background: rgba(239,68,68,0.15);
      color: #f87171;
    }
  `],
})
export class CriticalPathComponent implements OnChanges, AfterViewInit {
  @Input() tasks: TaskItem[] = [];
  @Input() dependencies: TaskDependencyResponseDto[] = [];

  @ViewChild('cytoscapeContainer') containerRef!: ElementRef<HTMLDivElement>;

  private cy: Core | null = null;
  private viewInitialized = false;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  criticalNodes: CPMNode[] = [];
  normalNodes: CPMNode[] = [];
  totalCriticalDuration = 0;
  isEmpty = false;

  tooltip = {
    visible: false,
    x: 0,
    y: 0,
    title: '',
    duration: 0,
    ES: 0,
    EF: 0,
    LS: 0,
    LF: 0,
    slack: 0,
  };

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    // Delay to ensure the container is visible before Cytoscape measures it
    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => this.render());
      this.cdr.detectChanges();
    }, 50);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewInitialized) {
      setTimeout(() => {
        this.ngZone.runOutsideAngular(() => this.render());
        this.cdr.detectChanges();
      }, 50);
    }
  }

  // ── CPM computation ────────────────────────────────────────────

  private computeCPM(): Map<number, CPMNode> {
    // Include ALL tasks, not just those with dependencies
    const taskIds = new Set(this.tasks.map(t => t.taskId));
    const relevantDeps = this.dependencies.filter(
      d => taskIds.has(d.taskId) && taskIds.has(d.dependsOnTaskId)
    );

    const nodeMap = new Map<number, CPMNode>();
    const tasksInGraph = new Set<number>();

    // Add ALL tasks to the graph
    this.tasks.forEach(t => {
      tasksInGraph.add(t.taskId);
      nodeMap.set(t.taskId, {
        id: t.taskId,
        title: t.title,
        duration: t.assignHours > 0 ? t.assignHours : 1,
        status: t.status,
        priority: t.priority,
        ES: 0, EF: 0, LS: 0, LF: 0,
        slack: 0,
        onCriticalPath: false,
      });
    });

    // Build successor/predecessor adjacency
    const successors = new Map<number, number[]>();
    const predecessors = new Map<number, number[]>();

    nodeMap.forEach((_, id) => {
      successors.set(id, []);
      predecessors.set(id, []);
    });

    relevantDeps.forEach(d => {
      // d.dependsOnTask must finish before d.task starts
      successors.get(d.dependsOnTaskId)?.push(d.taskId);
      predecessors.get(d.taskId)?.push(d.dependsOnTaskId);
    });

    // Topological sort (Kahn's algorithm)
    const inDegree = new Map<number, number>();
    nodeMap.forEach((_, id) => inDegree.set(id, predecessors.get(id)?.length ?? 0));

    const queue: number[] = [];
    inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

    const topoOrder: number[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      topoOrder.push(curr);
      successors.get(curr)?.forEach(succ => {
        const newDeg = (inDegree.get(succ) ?? 0) - 1;
        inDegree.set(succ, newDeg);
        if (newDeg === 0) queue.push(succ);
      });
    }

    // Forward pass — ES, EF
    topoOrder.forEach(id => {
      const node = nodeMap.get(id)!;
      const preds = predecessors.get(id) ?? [];
      node.ES = preds.length === 0
        ? 0
        : Math.max(...preds.map(p => nodeMap.get(p)!.EF));
      node.EF = node.ES + node.duration;
    });

    // Project finish = max EF
    const projectFinish = Math.max(...Array.from(nodeMap.values()).map(n => n.EF));

    // Backward pass — LF, LS
    [...topoOrder].reverse().forEach(id => {
      const node = nodeMap.get(id)!;
      const succs = successors.get(id) ?? [];
      node.LF = succs.length === 0
        ? projectFinish
        : Math.min(...succs.map(s => nodeMap.get(s)!.LS));
      node.LS = node.LF - node.duration;
    });

    // Slack & critical path flag
    nodeMap.forEach(node => {
      node.slack = node.LS - node.ES;
      node.onCriticalPath = node.slack === 0;
    });

    return nodeMap;
  }

  // ── Rendering ──────────────────────────────────────────────────

  private render(): void {
    if (!this.containerRef) return;

    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }

    const nodeMap = this.computeCPM();

    if (nodeMap.size === 0) {
      this.isEmpty = true;
      this.criticalNodes = [];
      this.normalNodes = [];
      this.totalCriticalDuration = 0;
      return;
    }

    this.isEmpty = false;
    this.criticalNodes = Array.from(nodeMap.values()).filter(n => n.onCriticalPath);
    this.normalNodes = Array.from(nodeMap.values()).filter(n => !n.onCriticalPath);
    this.totalCriticalDuration = this.criticalNodes.reduce((s, n) => s + n.duration, 0);

    const taskIds = new Set(this.tasks.map(t => t.taskId));
    const relevantDeps = this.dependencies.filter(
      d => taskIds.has(d.taskId) && taskIds.has(d.dependsOnTaskId)
    );

    // Build cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [];

    nodeMap.forEach(node => {
      elements.push({
        data: {
          id: `n${node.id}`,
          label: node.title.length > 22 ? node.title.substring(0, 20) + '…' : node.title,
          duration: node.duration,
          slack: node.slack,
          critical: node.onCriticalPath,
          done: node.status === 'done',
          nodeData: node,
        },
      });
    });

    relevantDeps.forEach(dep => {
      const source = `n${dep.dependsOnTaskId}`;
      const target = `n${dep.taskId}`;
      const srcNode = nodeMap.get(dep.dependsOnTaskId);
      const tgtNode = nodeMap.get(dep.taskId);
      const isCriticalEdge = srcNode?.onCriticalPath && tgtNode?.onCriticalPath;

      elements.push({
        data: {
          id: `e${dep.id}`,
          source,
          target,
          critical: isCriticalEdge,
          depType: dep.dependencyType,
        },
      });
    });

    this.cy = cytoscape({
      container: this.containerRef.nativeElement,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#3b82f6',
            'border-width': 2,
            'border-color': '#1d4ed8',
            label: 'data(label)',
            color: '#ffffff',
            'font-size': '11px',
            'font-weight': 'normal',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '90px',
            width: 100,
            height: 40,
            shape: 'roundrectangle',
            'text-outline-width': 0,
            'padding': '8px',
          },
        },
        {
          selector: 'node[?critical]',
          style: {
            'background-color': '#dc2626',
            'border-color': '#991b1b',
            'border-width': 3,
          },
        },
        {
          selector: 'node[?done]',
          style: {
            'background-color': '#059669',
            'border-color': '#065f46',
          },
        },
        {
          selector: 'node[?critical][?done]',
          style: {
            'background-color': '#d97706',
            'border-color': '#92400e',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#fbbf24',
            'border-width': 4,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            opacity: 0.7,
          },
        },
        {
          selector: 'edge[?critical]',
          style: {
            width: 3,
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            opacity: 1,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 100,
        padding: 30,
        animate: false,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    // Tooltip on hover — run inside Angular zone so CD fires
    this.cy.on('mouseover', 'node', (evt) => {
      const nodeData: CPMNode = evt.target.data('nodeData');
      const pos = evt.renderedPosition;
      this.ngZone.run(() => {
        this.tooltip = {
          visible: true,
          x: pos.x + 16,
          y: pos.y - 10,
          title: nodeData.title,
          duration: nodeData.duration,
          ES: nodeData.ES,
          EF: nodeData.EF,
          LS: nodeData.LS,
          LF: nodeData.LF,
          slack: nodeData.slack,
        };
      });
    });

    this.cy.on('mouseout', 'node', () => {
      this.ngZone.run(() => {
        this.tooltip = { ...this.tooltip, visible: false };
      });
    });

    this.cy.on('tap', 'node', (evt) => {
      const nodeData: CPMNode = evt.target.data('nodeData');
      const pos = evt.renderedPosition;
      this.ngZone.run(() => {
        this.tooltip = {
          visible: true,
          x: pos.x + 16,
          y: pos.y - 10,
          title: nodeData.title,
          duration: nodeData.duration,
          ES: nodeData.ES,
          EF: nodeData.EF,
          LS: nodeData.LS,
          LF: nodeData.LF,
          slack: nodeData.slack,
        };
      });
    });
  }
}
