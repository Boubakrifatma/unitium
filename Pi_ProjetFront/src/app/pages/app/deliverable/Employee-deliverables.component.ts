import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { DeliverableService, Deliverable } from '../../../services/Deliverable.service';
import { DeliverableDetailDialogComponent } from './deliverable-detail-dialog.component';

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
    
  ],
  templateUrl: './employee-deliverables.component.html',
  styleUrls: ['./employee-deliverables.component.scss']
})
export class EmployeeDeliverablesComponent implements OnInit {

  private dialog = inject(MatDialog);

  deliverables = signal<Deliverable[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);

  filteredDeliverables = computed(() => {
    const status = this.selectedStatus();
    const all = this.deliverables();
    return status ? all.filter(d => d.status === status) : all;
  });

  constructor(public deliverableService: DeliverableService) {}

  ngOnInit(): void {
    this.loadDeliverables();
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

  /** ✅ Cette méthode est obligatoire pour le template */
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
    'revision_required': 'rate_review',
    'accepted_by_manager': 'check_circle',
    'in_progress': 'pending',
    'draft': 'edit_note'
  };
  return icons[status] || 'assignment';
}

  editDeliverable(id: number): void {
    console.log('Modifier livrable ID:', id);
  }
}