import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface WbsNode {
  id: number;
  title: string;
  type: string;
  status: string;
  priority: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  progress: number;
  estimatedHours: number;
  children: WbsNode[];
  level: number;
}

@Component({
  selector: 'app-wbs-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './wbs-view.component.html',
  styleUrls: ['./wbs-view.component.scss']
})
export class WbsViewComponent {
  @Input() tasks: any[] = [];
  @Input() milestoneName = 'Milestone';
  @Input() milestoneStartDate = '';
  @Input() milestoneEndDate   = '';

  expandedNodes = signal<Set<number>>(new Set());

  // Build the hierarchical WBS tree — includes ALL tasks (no date filter)
  wbsTree = computed((): WbsNode[] => {
    const parentTasks = this.tasks.filter(t => !t.parentTaskId);
    const childTasks  = this.tasks.filter(t =>  t.parentTaskId);

    return parentTasks.map(parent => {
      const children = childTasks
        .filter(c => c.parentTaskId === parent.taskId)
        .map(c => this.makeNode(c, 2));
      return this.makeNode(parent, 1, children);
    });
  });

  stats = computed(() => {
    const all = this.tasks;
    const total       = all.length;
    const completed   = all.filter(t => t.status === 'done').length;
    const inProgress  = all.filter(t => ['in_progress', 'in-progress'].includes(t.status)).length;
    const todo        = all.filter(t => t.status === 'todo').length;
    const totalHours  = all.reduce((s: number, t: any) => s + (t.assignHours || t.estimatedHours || 0), 0);
    const nodes       = this.flattenNodes(this.wbsTree());
    const avgProgress = nodes.length
      ? Math.round(nodes.reduce((s, n) => s + n.progress, 0) / nodes.length)
      : 0;
    return { total, completed, inProgress, todo, avgProgress, totalHours };
  });

  private makeNode(task: any, level: number, children: WbsNode[] = []): WbsNode {
    const est = task.assignHours || task.estimatedHours || 0;
    const act = task.loggedHours  || task.actualHours   || 0;
    const progress = task.status === 'done' ? 100
      : est > 0 ? Math.min(100, Math.round((act / est) * 100))
      : 0;
    return {
      id: task.taskId,
      title: task.title,
      type: task.type || 'task',
      status: task.status || 'todo',
      priority: (task.priority || 'medium').toLowerCase(),
      assignedTo: task.assignedTo || 'Non assigné',
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      estimatedHours: est,
      progress,
      children,
      level,
    };
  }

  private flattenNodes(nodes: WbsNode[]): WbsNode[] {
    return nodes.reduce<WbsNode[]>((acc, n) => [...acc, n, ...this.flattenNodes(n.children)], []);
  }

  isExpanded(id: number) { return this.expandedNodes().has(id); }

  toggleNode(id: number) {
    const s = new Set(this.expandedNodes());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedNodes.set(s);
  }

  expandAll() {
    const ids = new Set<number>();
    const collect = (nodes: WbsNode[]) => nodes.forEach(n => {
      if (n.children.length) { ids.add(n.id); collect(n.children); }
    });
    collect(this.wbsTree());
    this.expandedNodes.set(ids);
  }

  collapseAll() { this.expandedNodes.set(new Set()); }

  // ── Display helpers ──────────────────────────────────────────────

  statusLabel(s: string) {
    return ({ todo: 'À faire', in_progress: 'En cours', 'in-progress': 'En cours',
              done: 'Terminé', blocked: 'Bloqué', review: 'Révision' } as any)[s] ?? s;
  }

  statusColor(s: string) {
    return ({ todo: '#94a3b8', in_progress: '#3b82f6', 'in-progress': '#3b82f6',
              done: '#22c55e', blocked: '#ef4444', review: '#f59e0b' } as any)[s] ?? '#94a3b8';
  }

  priorityLabel(p: string) {
    return ({ low: 'Faible', medium: 'Moyenne', high: 'Haute', critical: 'Critique' } as any)[p] ?? p;
  }

  typeIcon(t: string) {
    return ({ epic: '🚀', story: '📖', task: '✅', bug: '🐛', subtask: '↳' } as any)[t] ?? '✅';
  }

  progressColor(p: number) {
    if (p >= 100) return '#22c55e';
    if (p >= 60)  return '#3b82f6';
    if (p >= 30)  return '#f59e0b';
    return '#ef4444';
  }

  formatDate(d: string) {
    if (!d || d === '-') return '';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return d; }
  }

  exportCsv() {
    const nodes = this.flattenNodes(this.wbsTree());
    if (!nodes.length) { alert('Aucune tâche à exporter'); return; }
    const headers = ['Niveau', 'WBS', 'Titre', 'Type', 'Statut', 'Priorité', 'Assigné', 'Date début', 'Date fin', 'Progression (%)'];
    let wbsIdx = 0;
    const rows = this.wbsTree().flatMap((p, pi) => [
      [1, `${pi + 1}.0`, p.title, p.type, this.statusLabel(p.status),
       this.priorityLabel(p.priority), p.assignedTo,
       this.formatDate(p.startDate), this.formatDate(p.dueDate), p.progress],
      ...p.children.map((c, ci) =>
        [2, `${pi + 1}.${ci + 1}`, '  ' + c.title, c.type, this.statusLabel(c.status),
         this.priorityLabel(c.priority), c.assignedTo,
         this.formatDate(c.startDate), this.formatDate(c.dueDate), c.progress])
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
      download: `WBS_${this.milestoneName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }
}
