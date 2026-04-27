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
  ES: number;
  EF: number;
  LS: number;
  LF: number;
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
        <div class="legend-items">
          <span class="legend-item critical"><span class="dot"></span>Critical path</span>
          <span class="legend-item normal"><span class="dot"></span>Normal task</span>
          <span class="legend-item done"><span class="dot"></span>Completed</span>
          <span class="legend-item done-critical"><span class="dot"></span>Critical & Completed</span>
        </div>
        <span class="legend-note">* Nodes without dependencies shown in isolation</span>
      </div>

      <!-- Stats -->
      <div class="cp-stats" *ngIf="!isEmpty">
        <div class="cp-stat critical-stat">
          <div class="cp-stat-icon">🔴</div>
          <div class="cp-stat-body">
            <span class="cp-stat-value">{{ totalCriticalDuration }}h</span>
            <span class="cp-stat-label">Total critical duration</span>
          </div>
        </div>
        <div class="cp-stat">
          <div class="cp-stat-icon">📊</div>
          <div class="cp-stat-body">
            <span class="cp-stat-value critical-color">{{ criticalNodes.length }}</span>
            <span class="cp-stat-label">Critical tasks</span>
          </div>
        </div>
        <div class="cp-stat">
          <div class="cp-stat-icon">🟢</div>
          <div class="cp-stat-body">
            <span class="cp-stat-value normal-color">{{ normalNodes.length }}</span>
            <span class="cp-stat-label">Non-critical tasks</span>
          </div>
        </div>
        <div class="cp-stat">
          <div class="cp-stat-icon">⏱️</div>
          <div class="cp-stat-body">
            <span class="cp-stat-value">{{ projectFinish }}h</span>
            <span class="cp-stat-label">Project duration</span>
          </div>
        </div>
        <div class="cp-stat">
          <div class="cp-stat-icon">🎯</div>
          <div class="cp-stat-body">
            <span class="cp-stat-value slack-color">{{ avgSlack }}h</span>
            <span class="cp-stat-label">Average slack</span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="isEmpty" class="cp-empty">
        <div class="empty-icon">🗂️</div>
        <h4>No tasks available</h4>
        <p>Create tasks with estimated durations to calculate the critical path.</p>
      </div>

      <!-- Cytoscape graph -->
      <div #cytoscapeContainer class="cy-container" [class.hidden]="isEmpty"></div>

      <!-- Tooltip -->
      <div class="cp-tooltip" [class.visible]="tooltip.visible"
           [style.left.px]="tooltip.x" [style.top.px]="tooltip.y">
        <div class="tooltip-title" [class.critical-title]="tooltip.slack === 0">
          <span>{{ tooltip.slack === 0 ? '🔴' : '🔵' }}</span>
          {{ tooltip.title }}
        </div>
        <div class="tooltip-grid">
          <span class="tl">Estimated duration</span>   <strong>{{ tooltip.duration }}h</strong>
          <span class="tl">Earliest start</span> <strong>{{ tooltip.ES }}h</strong>
          <span class="tl">Earliest finish</span>   <strong>{{ tooltip.EF }}h</strong>
          <span class="tl">Latest start</span><strong>{{ tooltip.LS }}h</strong>
          <span class="tl">Latest finish</span>  <strong>{{ tooltip.LF }}h</strong>
          <span class="tl">Total slack</span>
          <strong [class.zero-slack]="tooltip.slack === 0">{{ tooltip.slack }}h</strong>
        </div>
        <div class="tooltip-badge" [class.critical]="tooltip.slack === 0">
          {{ tooltip.slack === 0 ? '🔴 Critical path — Zero slack' : '🟢 Normal task' }}
        </div>
      </div>

      <!-- CPM table toggle -->
      <div class="cpm-toggle-row" *ngIf="!isEmpty">
        <button class="cpm-toggle-btn" (click)="showTable = !showTable">
          <span>{{ showTable ? '▲ Hide CPM table' : '▼ Show CPM table' }}</span>
        </button>
      </div>

      <!-- CPM Table -->
      <div class="cpm-table-wrapper" *ngIf="showTable && !isEmpty">
        <table class="cpm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Task</th>
              <th>Duration (h)</th>
              <th title="Earliest Start">ES</th>
              <th title="Earliest Finish">EF</th>
              <th title="Latest Start">LS</th>
              <th title="Latest Finish">LF</th>
              <th>Slack</th>
              <th>Critical?</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let node of allCpmNodes(); let i = index"
                [class.row-critical]="node.onCriticalPath"
                [class.row-alt]="!node.onCriticalPath && i % 2 !== 0">
              <td class="col-num">{{ i + 1 }}</td>
              <td class="col-title">{{ node.title }}</td>
              <td class="col-center">{{ node.duration }}</td>
              <td class="col-center">{{ node.ES }}</td>
              <td class="col-center">{{ node.EF }}</td>
              <td class="col-center">{{ node.LS }}</td>
              <td class="col-center">{{ node.LF }}</td>
              <td class="col-center" [class.zero-slack]="node.slack === 0">{{ node.slack }}</td>
              <td class="col-center">
                <span class="badge" [class.badge-critical]="node.onCriticalPath"
                                    [class.badge-normal]="!node.onCriticalPath">
                  {{ node.onCriticalPath ? 'Yes' : 'No' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `,
  styles: [`
    /* ── Wrapper ────────────────────────────────────────────────── */
    .cp-wrapper {
      position: relative;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    }

    /* ── Legend ─────────────────────────────────────────────────── */
    .cp-legend {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .legend-items {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      align-items: center;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #475569;
      font-weight: 500;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-item.critical      .dot { background: #dc2626; }
    .legend-item.normal        .dot { background: #3b82f6; }
    .legend-item.done          .dot { background: #16a34a; }
    .legend-item.done-critical .dot { background: #d97706; }

    .legend-note {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
    }

    /* ── Stats bar ──────────────────────────────────────────────── */
    .cp-stats {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
    }

    .cp-stat {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      padding: 14px 18px;
      border-right: 1px solid #e2e8f0;
      min-width: 150px;

      &:last-child { border-right: none; }

      &.critical-stat {
        background: #fff5f5;
        border-bottom: 3px solid #dc2626;
      }
    }

    .cp-stat-icon { font-size: 22px; flex-shrink: 0; }

    .cp-stat-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cp-stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1;
    }

    .cp-stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .critical-color { color: #dc2626 !important; }
    .normal-color   { color: #16a34a !important; }
    .slack-color    { color: #7c3aed !important; }

    /* ── Graph container ────────────────────────────────────────── */
    .cy-container {
      width: 100%;
      height: 480px;
      background: #fafbfc;
      border-bottom: 1px solid #e2e8f0;
    }

    .cy-container.hidden { display: none; }

    /* ── Empty state ────────────────────────────────────────────── */
    .cp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      background: #f8fafc;
    }

    .empty-icon { font-size: 3.5rem; margin-bottom: 16px; }

    .cp-empty h4 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 600;
      color: #475569;
    }

    .cp-empty p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
      max-width: 360px;
    }

    /* ── Tooltip ────────────────────────────────────────────────── */
    .cp-tooltip {
      position: absolute;
      pointer-events: none;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      min-width: 230px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
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
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 6px;
      align-items: flex-start;

      &.critical-title { color: #dc2626; }
    }

    .tooltip-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      font-size: 12px;
    }

    .tl { color: #64748b; }

    .tooltip-grid strong {
      color: #1e293b;
      font-weight: 700;
      text-align: right;

      &.zero-slack { color: #dc2626; }
    }

    .tooltip-badge {
      margin-top: 10px;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      background: #dbeafe;
      color: #1e40af;

      &.critical {
        background: #fee2e2;
        color: #991b1b;
      }
    }

    /* ── CPM table toggle ───────────────────────────────────────── */
    .cpm-toggle-row {
      display: flex;
      justify-content: center;
      padding: 14px 16px 8px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .cpm-toggle-btn {
      padding: 8px 24px;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #1e293b;
      }
    }

    /* ── CPM Table ──────────────────────────────────────────────── */
    .cpm-table-wrapper {
      padding: 0 16px 20px;
      overflow-x: auto;
      background: #f8fafc;
    }

    .cpm-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .cpm-table thead tr {
      background: #f1f5f9;
    }

    .cpm-table th {
      padding: 11px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }

    .cpm-table td {
      padding: 10px 14px;
      color: #374151;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .col-num { color: #94a3b8; font-size: 11px; }
    .col-center { text-align: center; }

    .col-title {
      font-weight: 600;
      color: #1e293b;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-critical td {
      background: #fff5f5 !important;
      color: #7f1d1d;
    }

    .row-critical .col-title {
      color: #dc2626;
      font-weight: 700;
    }

    .row-alt td { background: #fafafa; }

    .zero-slack {
      color: #dc2626 !important;
      font-weight: 700;
    }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }

    .badge-critical {
      background: #fee2e2;
      color: #dc2626;
    }

    .badge-normal {
      background: #dbeafe;
      color: #1e40af;
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
  normalNodes:   CPMNode[] = [];
  totalCriticalDuration = 0;
  projectFinish = 0;
  avgSlack = 0;
  isEmpty = false;
  showTable = false;

  allCpmNodes(): CPMNode[] {
    return [...this.criticalNodes, ...this.normalNodes]
      .sort((a, b) => (b.onCriticalPath ? 1 : 0) - (a.onCriticalPath ? 1 : 0) || a.ES - b.ES);
  }

  tooltip = { visible: false, x: 0, y: 0, title: '', duration: 0, ES: 0, EF: 0, LS: 0, LF: 0, slack: 0 };

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => this.render());
      this.cdr.detectChanges();
    }, 50);
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.viewInitialized) {
      setTimeout(() => {
        this.ngZone.runOutsideAngular(() => this.render());
        this.cdr.detectChanges();
      }, 50);
    }
  }

  // ── CPM algorithm ────────────────────────────────────────────────

  private computeCPM(): Map<number, CPMNode> {
    const taskIds = new Set(this.tasks.map(t => t.taskId));
    const relevantDeps = this.dependencies.filter(
      d => taskIds.has(d.taskId) && taskIds.has(d.dependsOnTaskId)
    );

    const nodeMap = new Map<number, CPMNode>();

    this.tasks.forEach(t => {
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

    const successors   = new Map<number, number[]>();
    const predecessors = new Map<number, number[]>();
    nodeMap.forEach((_, id) => { successors.set(id, []); predecessors.set(id, []); });

    relevantDeps.forEach(d => {
      successors.get(d.dependsOnTaskId)?.push(d.taskId);
      predecessors.get(d.taskId)?.push(d.dependsOnTaskId);
    });

    // Topological sort — Kahn's algorithm
    const inDeg = new Map<number, number>();
    nodeMap.forEach((_, id) => inDeg.set(id, predecessors.get(id)?.length ?? 0));
    const queue: number[] = [];
    inDeg.forEach((d, id) => { if (d === 0) queue.push(id); });
    const topo: number[] = [];
    while (queue.length) {
      const curr = queue.shift()!;
      topo.push(curr);
      successors.get(curr)?.forEach(s => {
        const nd = (inDeg.get(s) ?? 0) - 1;
        inDeg.set(s, nd);
        if (nd === 0) queue.push(s);
      });
    }

    // Forward pass
    topo.forEach(id => {
      const n = nodeMap.get(id)!;
      const preds = predecessors.get(id) ?? [];
      n.ES = preds.length ? Math.max(...preds.map(p => nodeMap.get(p)!.EF)) : 0;
      n.EF = n.ES + n.duration;
    });

    const finish = Math.max(...Array.from(nodeMap.values()).map(n => n.EF));

    // Backward pass
    [...topo].reverse().forEach(id => {
      const n = nodeMap.get(id)!;
      const succs = successors.get(id) ?? [];
      n.LF = succs.length ? Math.min(...succs.map(s => nodeMap.get(s)!.LS)) : finish;
      n.LS = n.LF - n.duration;
    });

    // Slack & critical path
    nodeMap.forEach(n => {
      n.slack = n.LS - n.ES;
      n.onCriticalPath = n.slack === 0;
    });

    return nodeMap;
  }

  // ── Rendering ─────────────────────────────────────────────────────

  private render(): void {
    if (!this.containerRef) return;
    if (this.cy) { this.cy.destroy(); this.cy = null; }

    const nodeMap = this.computeCPM();

    if (nodeMap.size === 0) {
      this.isEmpty = true;
      this.criticalNodes = [];
      this.normalNodes   = [];
      this.totalCriticalDuration = 0;
      this.projectFinish = 0;
      this.avgSlack = 0;
      return;
    }

    this.isEmpty = false;
    this.criticalNodes = Array.from(nodeMap.values()).filter(n =>  n.onCriticalPath);
    this.normalNodes   = Array.from(nodeMap.values()).filter(n => !n.onCriticalPath);
    this.totalCriticalDuration = this.criticalNodes.reduce((s, n) => s + n.duration, 0);
    this.projectFinish = Math.max(...Array.from(nodeMap.values()).map(n => n.EF));
    const allSlacks = Array.from(nodeMap.values()).map(n => n.slack);
    this.avgSlack = allSlacks.length
      ? Math.round(allSlacks.reduce((s, v) => s + v, 0) / allSlacks.length)
      : 0;

    const taskIds = new Set(this.tasks.map(t => t.taskId));
    const relevantDeps = this.dependencies.filter(
      d => taskIds.has(d.taskId) && taskIds.has(d.dependsOnTaskId)
    );

    const elements: cytoscape.ElementDefinition[] = [];

    nodeMap.forEach(node => {
      // Node label: title + ES-EF on one line
      const shortTitle = node.title.length > 20 ? node.title.substring(0, 18) + '…' : node.title;
      const label = `${shortTitle}\n[${node.ES}→${node.EF}] slack:${node.slack}`;
      elements.push({
        data: {
          id: `n${node.id}`,
          label,
          duration: node.duration,
          slack: node.slack,
          critical: node.onCriticalPath,
          done: node.status === 'done',
          nodeData: node,
        },
      });
    });

    relevantDeps.forEach(dep => {
      const src = nodeMap.get(dep.dependsOnTaskId);
      const tgt = nodeMap.get(dep.taskId);
      elements.push({
        data: {
          id: `e${dep.id}`,
          source: `n${dep.dependsOnTaskId}`,
          target: `n${dep.taskId}`,
          critical: src?.onCriticalPath && tgt?.onCriticalPath,
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
            'background-color': '#dbeafe',
            'border-width': 2,
            'border-color': '#3b82f6',
            label: 'data(label)',
            color: '#1e40af',
            'font-size': '10px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            width: 120,
            height: 50,
            shape: 'roundrectangle',
            'padding': '10px',
          },
        },
        {
          selector: 'node[?critical]',
          style: {
            'background-color': '#fee2e2',
            'border-color': '#dc2626',
            'border-width': 3,
            color: '#991b1b',
          },
        },
        {
          selector: 'node[?done]',
          style: {
            'background-color': '#dcfce7',
            'border-color': '#16a34a',
            color: '#14532d',
          },
        },
        {
          selector: 'node[?critical][?done]',
          style: {
            'background-color': '#fef3c7',
            'border-color': '#d97706',
            color: '#78350f',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#7c3aed',
            'border-width': 4,
            'background-color': '#ede9fe',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.3,
            opacity: 0.8,
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
        nodeSep: 55,
        rankSep: 110,
        padding: 36,
        animate: false,
      } as any,
      minZoom: 0.25,
      maxZoom: 3,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    const showTooltip = (nodeData: CPMNode, pos: { x: number; y: number }) => {
      this.ngZone.run(() => {
        this.tooltip = {
          visible: true,
          x: pos.x + 18,
          y: pos.y - 12,
          title: nodeData.title,
          duration: nodeData.duration,
          ES: nodeData.ES, EF: nodeData.EF,
          LS: nodeData.LS, LF: nodeData.LF,
          slack: nodeData.slack,
        };
      });
    };

    this.cy.on('mouseover', 'node', e => showTooltip(e.target.data('nodeData'), e.renderedPosition));
    this.cy.on('tap',       'node', e => showTooltip(e.target.data('nodeData'), e.renderedPosition));
    this.cy.on('mouseout',  'node', () => this.ngZone.run(() => { this.tooltip = { ...this.tooltip, visible: false }; }));
  }
}