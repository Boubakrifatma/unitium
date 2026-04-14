import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil, interval } from 'rxjs';

import { DeliverableService, Deliverable } from '../../../services/Deliverable.service';
import { DeliverableDetailDialogComponent } from './deliverable-detail-dialog.component';
import { NotificationService } from '../../../services/notification.service';

const STATUS_CHANGE_EVENTS = new Set([
  'ACCEPTED_BY_MANAGER',
  'REVISION_REQUIRED_BY_MANAGER',
  'VALIDATED_EMPLOYEE',
  'REVISION_REQUIRED_BY_PO',
]);

@Component({
  selector: 'app-employee-deliverables',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatBadgeModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './employee-deliverables.component.html',
  styleUrls: ['./employee-deliverables.component.scss']
})
export class EmployeeDeliverablesComponent implements OnInit, OnDestroy {

  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  deliverables = signal<Deliverable[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);

  /**
   * IDs des livrables dont le manager a ouvert la review.
   * Calculé depuis les notifications existantes (signal réactif).
   */
  managerViewedIds = computed(() =>
    new Set(
      this.notificationService.notifications()
        .filter(n => n.eventType === 'MANAGER_VIEWED' && n.deliverableId !== null)
        .map(n => n.deliverableId as number)
    )
  );

  /** Retourne le statut effectif : 'manager_viewed' si notifié, sinon le statut réel */
  getEffectiveStatus(deliverable: Deliverable): string {
    if (deliverable.status === 'under_review' && this.managerViewedIds().has(deliverable.id)) {
      return 'manager_viewed';
    }
    return deliverable.status;
  }

  filteredDeliverables = computed(() => {
    const status = this.selectedStatus();
    const all = this.deliverables();
    if (!status) return all;
    // Pour le filtre 'manager_viewed', on filtre via getEffectiveStatus
    if (status === 'manager_viewed') {
      return all.filter(d => this.getEffectiveStatus(d) === 'manager_viewed');
    }
    return all.filter(d => d.status === status);
  });

  constructor(
    public deliverableService: DeliverableService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDeliverables();

    // Recharger quand un changement de statut réel arrive via SSE
    this.notificationService.newNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (STATUS_CHANGE_EVENTS.has(notif.eventType)) {
          this.loadDeliverables();

          const isRevision = notif.eventType === 'REVISION_REQUIRED_BY_MANAGER';
          const isAccepted = notif.eventType === 'ACCEPTED_BY_MANAGER';

          let message = notif.message || notif.title || 'Votre livrable a été évalué par le manager.';
          let panelClass = 'snack-info';

          if (isAccepted) {
            message = '✓ ' + message;
            panelClass = 'snack-success';
          } else if (isRevision) {
            message = '↩ ' + message;
            panelClass = 'snack-warning';
          }

          this.snackBar.open(message, 'Voir mes livrables', {
            duration: 7000,
            panelClass,
            verticalPosition: 'top',
            horizontalPosition: 'right',
          });
        }
      });

    // Polling silencieux toutes les 5 s
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.silentReload());
  }

  private silentReload(): void {
    this.deliverableService.getMyDeliverables().subscribe({
      next: (data) => {
        const current = this.deliverables();
        const changed = data.some(d => {
          const existing = current.find(c => c.id === d.id);
          return !existing || existing.status !== d.status;
        });
        if (changed || data.length !== current.length) {
          this.deliverables.set(data);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDeliverables(): void {
    this.loading.set(true);
    this.error.set(null);
    this.deliverableService.getMyDeliverables().subscribe({
      next: (data) => {
        this.deliverables.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement livrables:', err);
        this.error.set('Erreur lors du chargement des livrables. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  filterByStatus(status: string | null): void {
    this.selectedStatus.set(status);
  }

  getStatusColor(status: string): string {
    return this.deliverableService.getStatusColor(status) || 'primary';
  }

  viewDetails(deliverable: Deliverable): void {
    this.dialog.open(DeliverableDetailDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: deliverable
    });
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'submitted': 'send',
      'under_review': 'hourglass_empty',
      'manager_viewed': 'visibility',
      'revision_required': 'rate_review',
      'accepted_by_manager': 'check_circle',
      'validated': 'verified',
      'draft': 'edit_note'
    };
    return icons[status] || 'assignment';
  }

  editDeliverable(id: number): void {
    console.log('Modifier livrable ID:', id);
  }
}
