import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, interval, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  DeliverableService,
  MilestoneDeliverableGroup,
  DeliverableWithVersions,
} from '../../../services/Deliverable.service';
import { ProjectService, Project } from '../../../services/project-service';
import { ReviewService, DeliverableReviewDto } from '../../../services/review.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../auth/auth.service';
import {
  ManagerReviewDialogComponent,
  ReviewDialogData
} from './manager-review-dialog.component';
import {
  VersionCompareDialogComponent,
  VersionCompareDialogData,
} from '../intelligence/version-compare-dialog.component';

@Component({
  selector: 'app-manager-deliverables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './manager-deliverables.component.html',
  styleUrls: ['./manager-deliverables.component.scss']
})
export class ManagerDeliverablesComponent implements OnInit, OnDestroy {

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private clockSub?: Subscription;

  projects = signal<Project[]>([]);
  selectedProjectId = signal<string | null>(null);
  milestoneGroups = signal<MilestoneDeliverableGroup[]>([]);
  loading = signal(false);
  loadingProjects = signal(true);
  error = signal<string | null>(null);

  // Live clock — updated every second to power countdowns
  now = signal(new Date());

  // Track reviewed deliverables to update the UI instantly (by deliverableId → new status)
  reviewedDeliverables = signal<Map<number, string>>(new Map());

  // Track which deliverable's versions panel is open
  expandedVersions = signal<Set<number>>(new Set());

  // Reviews fetched per deliverable for the performance dashboard
  deliverableReviews = signal<Map<number, DeliverableReviewDto[]>>(new Map());

  totalDeliverables = computed(() =>
    this.milestoneGroups().reduce((sum, mg) =>
      sum + mg.tasks.reduce((s, t) => s + t.deliverables.length, 0), 0)
  );

  // ── Performance dashboard stats ────────────────────────────────────────────
  performanceStats = computed(() => {
    const reviews = this.deliverableReviews();
    const groups  = this.milestoneGroups();
    const avg = (scores: number[]) =>
      scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Collect per-deliverable info
    type DInfo = { deliverableId: number; taskId: number; taskTitle: string; employeeName: string; scores: number[] };
    const infos: DInfo[] = [];
    groups.forEach(mg => mg.tasks.forEach(t => t.deliverables.forEach(d => {
      const scores = (reviews.get(d.deliverableId) ?? []).map(r => r.score).filter(s => s != null);
      infos.push({ deliverableId: d.deliverableId, taskId: t.taskId, taskTitle: t.taskTitle, employeeName: d.employeeName, scores });
    })));

    const allScores = infos.flatMap(d => d.scores);
    if (!allScores.length) return { hasData: false, projectAvg: null, taskStats: [] as any[], employeeRanking: [] as any[] };

    // Per-task averages
    const taskMap = new Map<number, { taskTitle: string; scores: number[] }>();
    infos.forEach(d => {
      if (!taskMap.has(d.taskId)) taskMap.set(d.taskId, { taskTitle: d.taskTitle, scores: [] });
      taskMap.get(d.taskId)!.scores.push(...d.scores);
    });
    const taskStats = Array.from(taskMap.values())
      .map(t => ({ taskTitle: t.taskTitle, avgScore: avg(t.scores)!, reviewCount: t.scores.length }))
      .filter(t => t.avgScore != null)
      .sort((a, b) => b.avgScore - a.avgScore);

    // Per-employee averages
    const empMap = new Map<string, number[]>();
    infos.forEach(d => {
      if (!empMap.has(d.employeeName)) empMap.set(d.employeeName, []);
      empMap.get(d.employeeName)!.push(...d.scores);
    });
    const employeeRanking = Array.from(empMap.entries())
      .map(([name, scores]) => ({ name, avgScore: avg(scores)!, reviewCount: scores.length }))
      .filter(e => e.avgScore != null)
      .sort((a, b) => b.avgScore - a.avgScore);

    return { hasData: true, projectAvg: avg(allScores)!, taskStats, employeeRanking };
  });

  constructor(
    public deliverableService: DeliverableService,
    public reviewService: ReviewService,
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Live clock for countdown timers
    this.clockSub = interval(1000).subscribe(() => this.now.set(new Date()));

    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loadingProjects.set(false);
        if (projects.length === 1) {
          this.selectedProjectId.set(projects[0].id);
          this.loadManagerView();
        }
      },
      error: () => this.loadingProjects.set(false)
    });
  }

  ngOnDestroy(): void {
    this.clockSub?.unsubscribe();
  }

  onProjectChange(projectId: string): void {
    this.selectedProjectId.set(projectId);
    this.loadManagerView();
  }

  loadManagerView(): void {
    const projectId = this.selectedProjectId();
    if (!projectId) return;

    this.loading.set(true);
    this.error.set(null);
    this.milestoneGroups.set([]);
    this.reviewedDeliverables.set(new Map());

    this.deliverableService.getManagerView(projectId).subscribe({
      next: (data) => {
        this.milestoneGroups.set(data);
        this.loading.set(false);
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Erreur chargement vue manager:', err);
        this.error.set('Erreur lors du chargement des livrables. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  // ── Load review scores for the performance dashboard ──────────────────────

  private loadReviewStats(): void {
    const allDeliverables: number[] = [];
    this.milestoneGroups().forEach(mg =>
      mg.tasks.forEach(t => t.deliverables.forEach(d => allDeliverables.push(d.deliverableId)))
    );
    if (!allDeliverables.length) return;

    const requests = allDeliverables.map(id =>
      this.reviewService.getDeliverableReviews(id).pipe(
        map(reviews => ({ id, reviews })),
        catchError(() => of({ id, reviews: [] as DeliverableReviewDto[] }))
      )
    );

    forkJoin(requests).subscribe(results => {
      const map = new Map<number, DeliverableReviewDto[]>();
      results.forEach(r => map.set(r.id, r.reviews));
      this.deliverableReviews.set(map);
    });
  }

  // ── Review ──────────────────────────────────────────────────────────────────

  openReviewDialog(deliverable: DeliverableWithVersions): void {
    // Notifier l'employé que le manager a ouvert son livrable
    const managerId = this.authService.currentUser?.()?.id ?? this.authService.getUserId();
    if (managerId) {
      this.notificationService.notifyManagerViewed(deliverable.deliverableId, managerId);
    } else {
      console.warn('notifyManagerViewed: managerId introuvable');
    }

    const dialogRef = this.dialog.open(ManagerReviewDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { deliverable } as ReviewDialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the deliverable status in the local map so UI reflects it immediately
        const updated = new Map(this.reviewedDeliverables());
        updated.set(deliverable.deliverableId, result.overallStatus);
        this.reviewedDeliverables.set(updated);

        const isAccepted = result.overallStatus === 'accepted_by_manager';
        this.snackBar.open(
          isAccepted
            ? '✓ Livrable accepté — transmis au PO'
            : '↩ Révision demandée — employé notifié',
          'Fermer',
          {
            duration: 4000,
            panelClass: isAccepted ? 'snack-success' : 'snack-warning'
          }
        );
      }
    });
  }

  /** Returns the effective status: reviewed status if already reviewed, else overallStatus */
  getEffectiveStatus(deliverable: DeliverableWithVersions): string {
    return this.reviewedDeliverables().get(deliverable.deliverableId) ?? deliverable.overallStatus;
  }

  /** True if this deliverable can still be reviewed by manager */
  canReview(deliverable: DeliverableWithVersions): boolean {
    const status = this.getEffectiveStatus(deliverable);
    const reviewableStatuses = ['under_review', 'submitted', 'revision_required'];
    return reviewableStatuses.includes(status);
  }

  // ── Versions ────────────────────────────────────────────────────────────────

  toggleVersions(deliverableId: number): void {
    const current = new Set(this.expandedVersions());
    if (current.has(deliverableId)) {
      current.delete(deliverableId);
    } else {
      current.add(deliverableId);
    }
    this.expandedVersions.set(current);
  }

  isVersionsExpanded(deliverableId: number): boolean {
    return this.expandedVersions().has(deliverableId);
  }

  /** Open the Version Compare dialog (Deliverable Intelligence). */
  openVersionCompare(deliverable: DeliverableWithVersions): void {
    this.dialog.open(VersionCompareDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        deliverableTitle: deliverable.title,
        versions: deliverable.versions.map(v => ({
          id: v.id,
          versionNumber: v.versionNumber,
          submittedAt: v.submittedAt,
        })),
      } as VersionCompareDialogData,
    });
  }

  // ── Label / Color helpers ───────────────────────────────────────────────────

  getMilestoneStatusColor(status: string | null): string {
    const colors: Record<string, string> = {
      'pending': '#95a5a6', 'in_progress': '#3498db',
      'at_risk': '#e67e22', 'completed': '#27ae60', 'missed': '#e74c3c'
    };
    return colors[status ?? ''] ?? '#95a5a6';
  }

  getMilestoneStatusLabel(status: string | null): string {
    const labels: Record<string, string> = {
      'pending': 'En attente', 'in_progress': 'En cours',
      'at_risk': 'À risque', 'completed': 'Terminé', 'missed': 'Manqué'
    };
    return labels[status ?? ''] ?? (status ?? 'N/A');
  }

  getTaskStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'todo': '#95a5a6', 'in_progress': '#3498db',
      'review': '#9b59b6', 'done': '#27ae60', 'blocked': '#e74c3c'
    };
    return colors[status] ?? '#95a5a6';
  }

  getTaskStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'À faire', 'in_progress': 'En cours',
      'review': 'En révision', 'done': 'Terminé', 'blocked': 'Bloqué'
    };
    return labels[status] ?? status;
  }

  getVirusScanIcon(status: string): string {
    const icons: Record<string, string> = {
      'clean': 'verified_user', 'infected': 'gpp_bad', 'pending': 'pending'
    };
    return icons[status] ?? 'help';
  }

  getVirusScanColor(status: string): string {
    const colors: Record<string, string> = {
      'clean': '#27ae60', 'infected': '#e74c3c', 'pending': '#f39c12'
    };
    return colors[status] ?? '#95a5a6';
  }

  // ── Deadline Countdown ──────────────────────────────────────────────────────

  /**
   * Returns countdown info for a task due date.
   * Only shown when the manager hasn't reviewed yet (canReview = true).
   * Urgency levels:
   *   overdue  → past due date             (red, always shown)
   *   critical → less than 24 hours left   (red, flashing)
   *   warning  → 1–3 days left             (orange)
   *   null     → more than 3 days left     (not shown)
   */
  getDeadlineInfo(taskDueDate: string | null): {
    urgency: 'overdue' | 'critical' | 'warning';
    text: string;
    icon: string;
    color: string;
    bg: string;
  } | null {
    if (!taskDueDate) return null;

    // End of due date = 23:59:59
    const deadline = new Date(taskDueDate + 'T23:59:59');
    const diffMs = deadline.getTime() - this.now().getTime();

    if (diffMs < 0) {
      // Past due
      const overMs = -diffMs;
      const overDays = Math.floor(overMs / 86400000);
      const overHours = Math.floor((overMs % 86400000) / 3600000);
      const label = overDays > 0
        ? `Dépassée depuis ${overDays}j ${overHours}h`
        : `Dépassée depuis ${overHours}h`;
      return { urgency: 'overdue', text: label, icon: 'warning', color: '#fff', bg: '#dc2626' };
    }

    const days    = Math.floor(diffMs / 86400000);
    const hours   = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    if (diffMs < 86400000) {
      // Less than 24 h
      return {
        urgency: 'critical',
        text: `${hours}h ${minutes}m ${seconds}s`,
        icon: 'alarm',
        color: '#fff',
        bg: '#e74c3c'
      };
    }

    if (diffMs < 3 * 86400000) {
      // 1–3 days
      return {
        urgency: 'warning',
        text: `${days}j ${hours}h ${minutes}m`,
        icon: 'schedule',
        color: '#fff',
        bg: '#f39c12'
      };
    }

    return null; // More than 3 days — no timer shown
  }
}
