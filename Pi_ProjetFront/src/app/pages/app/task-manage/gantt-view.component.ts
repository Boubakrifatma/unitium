import {
  Component, Input, signal, computed,
  ViewChild, ElementRef, OnChanges, SimpleChanges, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as XLSX from 'xlsx';

// ── Interfaces ─────────────────────────────────────────────────────────────

interface GanttRow {
  taskId: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  assignedTo: string;
  startDate: Date;
  dueDate: Date;
  leftPx: number;
  widthPx: number;
  progress: number;
  isLate: boolean;
  durationDays: number;
}

interface TimeCol {
  label: string;
  subLabel?: string;
  leftPx: number;
  widthPx: number;
  isWeekend: boolean;
  isToday: boolean;
}

interface MonthGroup {
  label: string;
  leftPx: number;
  widthPx: number;
}

interface GanttTooltip {
  visible: boolean;
  x: number;
  y: number;
  row: GanttRow | null;
}

// ── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-gantt-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './gantt-view.component.html',
  styleUrls: ['./gantt-view.component.scss'],
})
export class GanttViewComponent implements OnChanges {
  @Input() tasks: any[] = [];
  @Input() milestoneName = 'Milestone';

  @ViewChild('rightScroll') rightScrollRef!: ElementRef<HTMLDivElement>;
  @ViewChild('leftScroll') leftScrollRef!: ElementRef<HTMLDivElement>;

  scale   = signal<'day' | 'week' | 'month'>('week');
  filter  = signal<string>('all');

  readonly ROW_HEIGHT    = 52;
  readonly HEADER_TOP_H  = 28;  // month-group row height
  readonly HEADER_BOT_H  = 36;  // day/week/month row height
  readonly LEFT_WIDTH    = 300;

  // ── px-per-day for each scale ──────────────────────────────────────────
  private get ppd(): number {
    return this.scale() === 'day' ? 44 : this.scale() === 'week' ? 20 : 8;
  }

  // ── Source tasks that have valid dates ─────────────────────────────────
  private get validSrc(): any[] {
    return this.tasks.filter(t =>
      t.startDate && t.dueDate &&
      t.startDate !== '-' && t.dueDate !== '-' &&
      t.startDate.trim() && t.dueDate.trim()
    );
  }

  // ── Date bounds (padded to week boundaries) ────────────────────────────
  minDate = computed((): Date | null => {
    const src = this.validSrc;
    if (!src.length) return null;
    const d = new Date(Math.min(...src.map(t => +new Date(t.startDate))));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // align to Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });

  maxDate = computed((): Date | null => {
    const src = this.validSrc;
    if (!src.length) return null;
    const d = new Date(Math.max(...src.map(t => +new Date(t.dueDate))));
    const rem = (7 - ((d.getDay() + 6) % 7)) % 7;
    d.setDate(d.getDate() + (rem === 0 ? 7 : rem)); // align to next Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });

  totalDays  = computed(() => {
    const mn = this.minDate(), mx = this.maxDate();
    return mn && mx ? Math.ceil((+mx - +mn) / 86400000) : 0;
  });

  totalWidthPx = computed(() => this.totalDays() * this.ppd);

  // ── Gantt rows ─────────────────────────────────────────────────────────
  ganttRows = computed((): GanttRow[] => {
    const min = this.minDate();
    if (!min) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const f = this.filter();
    const ppd = this.ppd;

    return this.validSrc
      .filter(t => f === 'all' || t.status === f)
      .map(t => {
        const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
        const end   = new Date(t.dueDate);   end.setHours(0, 0, 0, 0);
        const offsetDays   = (+start - +min) / 86400000;
        const durationDays = Math.max(1, (+end - +start) / 86400000);
        const est = t.assignHours || t.estimatedHours || 0;
        const act = t.loggedHours  || t.actualHours   || 0;
        const progress = t.status === 'done' ? 100
          : est > 0 ? Math.min(100, Math.round((act / est) * 100))
          : 0;

        return {
          taskId: t.taskId,
          title: t.title,
          status: t.status || 'todo',
          priority: t.priority || 'medium',
          type: t.type || 'task',
          assignedTo: t.assignedTo || 'Non assigné',
          startDate: start,
          dueDate: end,
          leftPx:   Math.max(0, offsetDays * ppd),
          widthPx:  Math.max(ppd, durationDays * ppd),
          progress,
          isLate: end < today && t.status !== 'done',
          durationDays,
        };
      });
  });

  // ── Column header (bottom row) ─────────────────────────────────────────
  timeCols = computed((): TimeCol[] => {
    const min = this.minDate(), max = this.maxDate();
    if (!min || !max) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ppd   = this.ppd;
    const cols: TimeCol[] = [];

    if (this.scale() === 'day') {
      let d = new Date(min);
      while (+d < +max) {
        const dow = d.getDay();
        cols.push({
          label:    d.getDate().toString(),
          subLabel: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
          leftPx:   (+d - +min) / 86400000 * ppd,
          widthPx:  ppd,
          isWeekend: dow === 0 || dow === 6,
          isToday:  +d === +today,
        });
        d = new Date(+d + 86400000);
      }
    } else if (this.scale() === 'week') {
      let d = new Date(min);
      while (+d < +max) {
        const leftPx = Math.max(0, (+d - +min) / 86400000 * ppd);
        cols.push({
          label:    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          leftPx,
          widthPx:  7 * ppd,
          isWeekend: false,
          isToday:   false,
        });
        d = new Date(+d + 7 * 86400000);
      }
    } else {
      let d = new Date(min.getFullYear(), min.getMonth(), 1);
      while (+d < +max) {
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const days = (+next - +d) / 86400000;
        cols.push({
          label:   d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          leftPx:  Math.max(0, (+d - +min) / 86400000 * ppd),
          widthPx: days * ppd,
          isWeekend: false,
          isToday:   false,
        });
        d = next;
      }
    }
    return cols;
  });

  // ── Month group header (top row) ───────────────────────────────────────
  monthGroups = computed((): MonthGroup[] => {
    const min = this.minDate(), max = this.maxDate();
    if (!min || !max || this.scale() === 'month') return [];
    const ppd = this.ppd;
    const groups: MonthGroup[] = [];
    let d = new Date(min.getFullYear(), min.getMonth(), 1);
    while (+d < +max) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      groups.push({
        label:   d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        leftPx:  Math.max(0, (+d - +min) / 86400000 * ppd),
        widthPx: (+next - +d) / 86400000 * ppd,
      });
      d = next;
    }
    return groups;
  });

  // ── Today line position ────────────────────────────────────────────────
  todayPx = computed((): number => {
    const min = this.minDate();
    if (!min) return -1;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return ((+today - +min) / 86400000) * this.ppd;
  });

  // ── Weekend stripes (day scale only) ──────────────────────────────────
  weekendStripes = computed(() => {
    if (this.scale() !== 'day') return [];
    const min = this.minDate(), max = this.maxDate();
    if (!min || !max) return [];
    const ppd = this.ppd;
    const stripes: { leftPx: number; widthPx: number }[] = [];
    let d = new Date(min);
    while (+d < +max) {
      if (d.getDay() === 6) {
        stripes.push({ leftPx: (+d - +min) / 86400000 * ppd, widthPx: 2 * ppd });
      }
      d = new Date(+d + 86400000);
    }
    return stripes;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this.ganttRows();
    return {
      total:      all.length,
      done:       all.filter(r => r.status === 'done').length,
      inProgress: all.filter(r => r.status === 'in_progress').length,
      late:       all.filter(r => r.isLate).length,
      avgProgress: all.length
        ? Math.round(all.reduce((s, r) => s + r.progress, 0) / all.length)
        : 0,
    };
  });

  // ── Tooltip ────────────────────────────────────────────────────────────
  tooltip: GanttTooltip = { visible: false, x: 0, y: 0, row: null };

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnChanges(_: SimpleChanges) { /* signals recompute */ }

  // ── Actions ────────────────────────────────────────────────────────────
  setScale(s: 'day' | 'week' | 'month') { this.scale.set(s); }
  setFilter(f: string)                   { this.filter.set(f); }

  onRightScroll(e: Event) {
    const l = this.leftScrollRef?.nativeElement;
    if (l) l.scrollTop = (e.target as HTMLElement).scrollTop;
  }

  onLeftScroll(e: Event) {
    const r = this.rightScrollRef?.nativeElement;
    if (r) r.scrollTop = (e.target as HTMLElement).scrollTop;
  }

  showTooltip(e: MouseEvent, row: GanttRow) {
    this.tooltip = { visible: true, x: e.clientX + 14, y: e.clientY - 8, row };
  }
  hideTooltip() { this.tooltip.visible = false; }

  // ── Display helpers ────────────────────────────────────────────────────
  statusLabel(s: string): string {
    return ({ todo: 'À faire', in_progress: 'En cours', done: 'Terminé',
              blocked: 'Bloqué', review: 'Révision' } as any)[s] || s;
  }

  priorityLabel(p: string): string {
    return ({ low: 'Faible', medium: 'Moyenne', high: 'Haute', critical: 'Critique' } as any)[p] || p;
  }

  typeIcon(t: string): string {
    return ({ epic: '🚀', story: '📖', task: '✅', bug: '🐛', subtask: '↳' } as any)[t] || '✅';
  }

  fmtDate(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  exportPrint() { window.print(); }

  exportExcel() {
    const rows = this.ganttRows();
    if (rows.length === 0) {
      alert('Aucune tâche à exporter');
      return;
    }

    // Préparer les données pour Excel
    const data = rows.map(row => ({
      'ID': row.taskId,
      'Titre': row.title,
      'Type': this.typeLabel(row.type),
      'Statut': this.statusLabel(row.status),
      'Priorité': this.priorityLabel(row.priority),
      'Assigné à': row.assignedTo,
      'Date début': this.fmtDate(row.startDate),
      'Date fin': this.fmtDate(row.dueDate),
      'Durée (jours)': row.durationDays,
      'Progression (%)': row.progress,
      'En retard': row.isLate ? 'Oui' : 'Non'
    }));

    // Créer la feuille de calcul
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Définir les largeurs de colonnes
    const colWidths = [
      { wch: 8 },   // ID
      { wch: 40 },  // Titre
      { wch: 12 },  // Type
      { wch: 12 },  // Statut
      { wch: 12 },  // Priorité
      { wch: 25 },  // Assigné à
      { wch: 12 },  // Date début
      { wch: 12 },  // Date fin
      { wch: 15 },  // Durée
      { wch: 15 },  // Progression
      { wch: 12 }   // En retard
    ];
    ws['!cols'] = colWidths;

    // Créer le classeur
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Diagramme Gantt');

    // Générer le nom de fichier avec la date
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Gantt_${this.milestoneName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(wb, fileName);
  }

  typeLabel(t: string): string {
    return ({ epic: 'Epic', story: 'Story', task: 'Tâche', bug: 'Bug', subtask: 'Sous-tâche' } as any)[t] || t;
  }
}
