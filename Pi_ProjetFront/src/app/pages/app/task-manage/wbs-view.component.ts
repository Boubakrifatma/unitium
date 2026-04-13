import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

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
  children: WbsNode[];
  expanded: boolean;
  level: number;
}

@Component({
  selector: 'app-wbs-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatChipsModule],
  templateUrl: './wbs-view.component.html',
  styleUrls: ['./wbs-view.component.scss']
})
export class WbsViewComponent {
  @Input() tasks: any[] = [];
  @Input() milestoneName = 'Milestone';
  @Input() milestoneStartDate: string = '';
  @Input() milestoneEndDate: string = '';

  expandedNodes = signal<Set<number>>(new Set());

  // Construire la structure WBS hiérarchique
  wbsTree = computed((): WbsNode[] => {
    const validTasks = this.tasks.filter(t =>
      t.startDate && t.dueDate &&
      t.startDate !== '-' && t.dueDate !== '-'
    );

    // Grouper par tâche parente
    const parentTasks = validTasks.filter(t => !t.parentTaskId);
    const childTasks = validTasks.filter(t => t.parentTaskId);

    return parentTasks.map(parent => {
      const children = childTasks
        .filter(child => child.parentTaskId === parent.taskId)
        .map(child => this.createNode(child, 2));

      return this.createNode(parent, 1, children);
    });
  });

  // Calculer les statistiques
  stats = computed(() => {
    const allNodes = this.flattenNodes(this.wbsTree());
    const total = allNodes.length;
    const completed = allNodes.filter(n => n.status === 'done').length;
    const inProgress = allNodes.filter(n => n.status === 'in_progress').length;
    const todo = allNodes.filter(n => n.status === 'todo').length;
    const avgProgress = total > 0
      ? Math.round(allNodes.reduce((sum, n) => sum + n.progress, 0) / total)
      : 0;

    return { total, completed, inProgress, todo, avgProgress };
  });

  private createNode(task: any, level: number, children: WbsNode[] = []): WbsNode {
    const est = task.assignHours || task.estimatedHours || 0;
    const act = task.loggedHours || task.actualHours || 0;
    const progress = task.status === 'done' ? 100
      : est > 0 ? Math.min(100, Math.round((act / est) * 100))
      : 0;

    return {
      id: task.taskId,
      title: task.title,
      type: task.type || 'task',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo || 'Non assigné',
      startDate: task.startDate,
      dueDate: task.dueDate,
      progress,
      children,
      expanded: this.expandedNodes().has(task.taskId),
      level
    };
  }

  private flattenNodes(nodes: WbsNode[]): WbsNode[] {
    const result: WbsNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        result.push(...this.flattenNodes(node.children));
      }
    }
    return result;
  }

  toggleNode(node: WbsNode) {
    const current = new Set(this.expandedNodes());
    if (current.has(node.id)) {
      current.delete(node.id);
    } else {
      current.add(node.id);
    }
    this.expandedNodes.set(current);
    node.expanded = !node.expanded;
  }

  expandAll() {
    const allIds = new Set<number>();
    const collectIds = (nodes: WbsNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(this.wbsTree());
    this.expandedNodes.set(allIds);
  }

  collapseAll() {
    this.expandedNodes.set(new Set());
  }

  // Helpers d'affichage
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      todo: 'À faire',
      in_progress: 'En cours',
      done: 'Terminé',
      blocked: 'Bloqué',
      review: 'Révision'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      todo: '#94a3b8',
      in_progress: '#3b82f6',
      done: '#22c55e',
      blocked: '#ef4444',
      review: '#f59e0b'
    };
    return colors[status] || '#94a3b8';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Haute',
      critical: 'Critique'
    };
    return labels[priority.toLowerCase()] || priority;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      epic: '🚀',
      story: '📖',
      task: '✅',
      bug: '🐛',
      subtask: '↳'
    };
    return icons[type] || '✅';
  }

  formatDate(dateStr: string): string {
    if (!dateStr || dateStr === '-') return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  exportExcel() {
    const allNodes = this.flattenNodes(this.wbsTree());
    if (allNodes.length === 0) {
      alert('Aucune tâche à exporter');
      return;
    }

    // Créer les données CSV
    const headers = ['Niveau', 'ID', 'Titre', 'Type', 'Statut', 'Priorité', 'Assigné à', 'Date début', 'Date fin', 'Progression (%)'];
    const rows = allNodes.map(node => [
      node.level,
      node.id,
      '  '.repeat(node.level - 1) + node.title,
      this.getTypeIcon(node.type),
      this.getStatusLabel(node.status),
      this.getPriorityLabel(node.priority),
      node.assignedTo,
      this.formatDate(node.startDate),
      this.formatDate(node.dueDate),
      node.progress
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `WBS_${this.milestoneName.replace(/\s+/g, '_')}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
