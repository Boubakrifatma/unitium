import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeliverableService, Deliverable } from '../../../services/Deliverable.service';

@Component({
  selector: 'app-employee-files',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Mes Fichiers</h3>
            <p class="text-secondary small">Tous les fichiers que vous avez uploadés via vos livrables</p>
          </div>
          <div class="col-auto">
            <button mat-icon-button (click)="load()" matTooltip="Actualiser">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container-fluid px-3 px-lg-4">

      <!-- Stats row -->
      <div class="row gx-3 gx-lg-4 mb-3 mb-lg-4">
        <div class="col-6 col-md-3">
          <mat-card>
            <mat-card-content class="py-3">
              <div class="d-flex align-items-center gap-3">
                <div class="avatar avatar-50 rounded bg-theme text-white" style="background:#1976d2!important">
                  <mat-icon>insert_drive_file</mat-icon>
                </div>
                <div>
                  <p class="text-secondary small mb-0">Total fichiers</p>
                  <h4 class="mb-0">{{ totalFiles() }}</h4>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-md-3">
          <mat-card>
            <mat-card-content class="py-3">
              <div class="d-flex align-items-center gap-3">
                <div class="avatar avatar-50 rounded text-white" style="background:#388e3c">
                  <mat-icon>storage</mat-icon>
                </div>
                <div>
                  <p class="text-secondary small mb-0">Taille totale</p>
                  <h4 class="mb-0">{{ totalSizeMb() }}</h4>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-md-3">
          <mat-card>
            <mat-card-content class="py-3">
              <div class="d-flex align-items-center gap-3">
                <div class="avatar avatar-50 rounded text-white" style="background:#f57c00">
                  <mat-icon>check_circle</mat-icon>
                </div>
                <div>
                  <p class="text-secondary small mb-0">Validés</p>
                  <h4 class="mb-0">{{ validatedCount() }}</h4>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-md-3">
          <mat-card>
            <mat-card-content class="py-3">
              <div class="d-flex align-items-center gap-3">
                <div class="avatar avatar-50 rounded text-white" style="background:#d32f2f">
                  <mat-icon>rate_review</mat-icon>
                </div>
                <div>
                  <p class="text-secondary small mb-0">À réviser</p>
                  <h4 class="mb-0">{{ revisionCount() }}</h4>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Table card -->
      <mat-card>
        <mat-card-content>

          @if (loading()) {
            <div class="text-center py-5">
              <mat-progress-spinner diameter="48" mode="indeterminate" style="margin:auto"></mat-progress-spinner>
              <p class="text-secondary mt-3">Chargement des fichiers...</p>
            </div>
          } @else if (error()) {
            <div class="text-center py-5">
              <mat-icon style="font-size:48px;color:#f44336">error_outline</mat-icon>
              <p class="text-secondary mt-2">{{ error() }}</p>
              <button mat-stroked-button (click)="load()">Réessayer</button>
            </div>
          } @else {

            <!-- Search -->
            <div class="row gx-3 align-items-center mb-3">
              <div class="col">
                <mat-form-field appearance="outline" class="w-100" style="margin-bottom:-1.25em">
                  <mat-label>Rechercher un fichier...</mat-label>
                  <mat-icon matPrefix>search</mat-icon>
                  <input matInput (keyup)="applyFilter($event)" placeholder="Nom, type, livrable...">
                </mat-form-field>
              </div>
            </div>

            <!-- Table -->
            <div class="table-responsive">
              <table mat-table [dataSource]="dataSource" matSort class="w-100">

                <!-- Icon col -->
                <ng-container matColumnDef="icon">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <div class="avatar avatar-40 rounded bg-light text-theme">
                      <mat-icon>{{ getFileIcon(row.fileType) }}</mat-icon>
                    </div>
                  </td>
                </ng-container>

                <!-- File name col -->
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Livrable</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="fw-semibold">{{ row.title }}</span>
                    <br>
                    <small class="text-secondary">{{ extractFileName(row.fileUrl) }}</small>
                  </td>
                </ng-container>

                <!-- File type -->
                <ng-container matColumnDef="fileType">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge rounded-pill" style="background:#e3f2fd;color:#1565c0;font-size:11px;padding:4px 10px">
                      {{ row.fileType || 'N/A' }}
                    </span>
                  </td>
                </ng-container>

                <!-- Size -->
                <ng-container matColumnDef="fileSizeKb">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Taille</th>
                  <td mat-cell *matCellDef="let row">{{ deliverableService.formatFileSize(row.fileSizeKb) }}</td>
                </ng-container>

                <!-- Status -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge rounded-pill" [style.background]="deliverableService.getStatusColor(row.status) + '22'"
                          [style.color]="deliverableService.getStatusColor(row.status)"
                          style="font-size:11px;padding:4px 10px">
                      {{ deliverableService.getStatusLabel(row.status) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Date -->
                <ng-container matColumnDef="submittedAt">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Soumis le</th>
                  <td mat-cell *matCellDef="let row" class="text-secondary small">
                    {{ deliverableService.formatDate(row.submittedAt) }}
                  </td>
                </ng-container>

                <!-- Actions -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.fileUrl) {
                      <a mat-icon-button [href]="deliverableService.getDownloadUrl(row.fileUrl)" target="_blank" matTooltip="Télécharger">
                        <mat-icon>download</mat-icon>
                      </a>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" style="cursor:default"></tr>

                <!-- No data -->
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell text-center py-4" [attr.colspan]="displayedColumns.length">
                    Aucun fichier trouvé.
                  </td>
                </tr>
              </table>
            </div>

            <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
          }

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .avatar { display:flex; align-items:center; justify-content:center; }
    table { border-collapse: separate; border-spacing: 0; }
    th.mat-header-cell { font-weight: 600; color: #555; }
    tr.mat-row:hover { background: #f5f5f5; }
  `]
})
export class EmployeeFilesComponent implements OnInit {
  readonly deliverableService = inject(DeliverableService);

  loading = signal(true);
  error = signal('');
  deliverables = signal<Deliverable[]>([]);

  totalFiles = computed(() => this.deliverables().filter(d => !!d.fileUrl).length);
  totalSizeMb = computed(() => {
    const total = this.deliverables().reduce((sum, d) => sum + (d.fileSizeKb ?? 0), 0);
    return total < 1024 ? `${total.toFixed(0)} KB` : `${(total / 1024).toFixed(2)} MB`;
  });
  validatedCount = computed(() => this.deliverables().filter(d => d.status === 'validated').length);
  revisionCount = computed(() => this.deliverables().filter(d => d.status === 'revision_required').length);

  displayedColumns = ['icon', 'title', 'fileType', 'fileSizeKb', 'status', 'submittedAt', 'actions'];
  dataSource = new MatTableDataSource<Deliverable>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.deliverableService.getMyDeliverables().subscribe({
      next: (list) => {
        const withFiles = list.filter(d => !!d.fileUrl);
        this.deliverables.set(list);
        this.dataSource.data = withFiles;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Erreur lors du chargement des fichiers.');
        this.loading.set(false);
      }
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  getFileIcon(fileType: string | null): string {
    if (!fileType) return 'insert_drive_file';
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return 'image';
    if (t.includes('zip') || t.includes('rar')) return 'folder_zip';
    if (t.includes('word') || t.includes('doc')) return 'description';
    if (t.includes('sheet') || t.includes('excel') || t.includes('xls')) return 'table_chart';
    if (t.includes('video') || t.includes('mp4')) return 'videocam';
    return 'insert_drive_file';
  }

  extractFileName(fileUrl: string | null): string {
    if (!fileUrl) return '';
    const parts = fileUrl.split('/');
    const raw = parts[parts.length - 1];
    // Remove UUID prefix (format: uuid_originalname)
    const idx = raw.indexOf('_');
    return idx !== -1 ? raw.substring(idx + 1) : raw;
  }
}
