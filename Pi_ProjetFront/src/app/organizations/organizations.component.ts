import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganizationService, OrganizationDTO } from './organization.service';
import { OrgDialogComponent } from './org-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatDialogModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatSnackBarModule
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Organizations</h3>
            <p class="small opacity-50">Manage organizations and their members</p>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">
      <!-- Stats -->
      <div class="row gx-3 gx-lg-4">
        <div class="col-12 col-md-4">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue">
                    <mat-icon class="material-icons-outlined">corporate_fare</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Total</p>
                  <h3>{{ dataSource.data.length }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-4">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                    <mat-icon class="material-icons-outlined">business_center</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Enterprise</p>
                  <h3>{{ enterpriseCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-4">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                    <mat-icon class="material-icons-outlined">school</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <p class="small text-secondary mb-1">Academic</p>
                  <h3>{{ academicCount }}</h3>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Table -->
      <mat-card class="mb-3 mb-lg-4">
        <mat-card-header>
          <div class="w-100">
            <div class="row gx-3 align-items-center">
              <div class="col-auto mb-3">
                <div class="avatar avatar-40 text-theme rounded">
                  <mat-icon class="material-icons-outlined">domain</mat-icon>
                </div>
              </div>
              <div class="col mb-3">
                <h3 class="mb-1">All Organizations</h3>
                <p class="text-secondary small">Module 1 — Membership & Access Control</p>
              </div>
              <div class="col-12 col-md-4 col-xl-3 mb-3">
                <mat-form-field appearance="outline" class="w-100 inline-small">
                  <mat-label>Search</mat-label>
                  <mat-icon matPrefix>search</mat-icon>
                  <input matInput (keyup)="applyFilter($event)" #searchInput />
                </mat-form-field>
              </div>
            </div>
          </div>
        </mat-card-header>

        <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Organization</th>
            <td mat-cell *matCellDef="let o" class="py-2">
              <div class="row gx-3 align-items-center">
                <div class="col-auto">
                  <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center">
                    <mat-icon class="material-icons-outlined">corporate_fare</mat-icon>
                  </div>
                </div>
                <div class="col">
                  <h4 class="mb-0">{{ o.name }}</h4>
                  <p class="text-secondary small mb-0">{{ o.slug }}</p>
                </div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="orgType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
            <td mat-cell *matCellDef="let o">
              <span class="badge badge-light d-inline-block" [ngClass]="o.orgType === 'ENTERPRISE' ? 'theme-blue' : 'theme-yellow'">{{ o.orgType }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="billingEmail">
            <th mat-header-cell *matHeaderCellDef>Billing Email</th>
            <td mat-cell *matCellDef="let o" class="small text-secondary">{{ o.billingEmail ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="billingCountry">
            <th mat-header-cell *matHeaderCellDef>Country</th>
            <td mat-cell *matCellDef="let o" class="small">{{ o.billingCountry ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
            <td mat-cell *matCellDef="let o" class="small text-secondary">{{ o.createdAt | date:'MMM d, yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let o">
              <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="viewMembers(o)">
                  <mat-icon class="material-icons-outlined">group</mat-icon><span>View Members</span>
                </button>
                <button mat-menu-item (click)="openEdit(o)">
                  <mat-icon class="material-icons-outlined">edit</mat-icon><span>Edit</span>
                </button>
                <button mat-menu-item (click)="deleteOrg(o)">
                  <mat-icon class="material-icons-outlined" color="warn">delete</mat-icon><span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center py-4" [attr.colspan]="cols.length">No organizations found.</td>
          </tr>
        </table>
        <mat-card-content>
          <mat-paginator [pageSizeOptions]="[5, 10, 25]" class="bg-none"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }`]
})
export class OrganizationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private svc = inject(OrganizationService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  dataSource = new MatTableDataSource<OrganizationDTO>([]);
  cols = ['name', 'orgType', 'billingEmail', 'billingCountry', 'createdAt', 'actions'];

  get enterpriseCount() { return this.dataSource.data.filter(o => o.orgType === 'ENTERPRISE').length; }
  get academicCount()   { return this.dataSource.data.filter(o => o.orgType === 'ACADEMIC').length; }

  ngOnInit() { this.load(); }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (d, f) => `${d.name} ${d.slug} ${d.orgType}`.toLowerCase().includes(f);
  }

  load() {
    this.svc.getAll().subscribe({ next: d => this.dataSource.data = d, error: () => this.notify('Failed to load', true) });
  }

  applyFilter(e: Event) {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  viewMembers(org: OrganizationDTO) { this.router.navigate(['/app/organizations', org.id]); }

  openAdd() {
    this.dialog.open(OrgDialogComponent, { width: '560px', autoFocus: false, data: { mode: 'create' } })
      .afterClosed().subscribe(r => {
        if (!r) return;
        this.svc.create(r).subscribe({ next: o => { this.dataSource.data = [...this.dataSource.data, o]; this.notify('Organization created'); }, error: err => this.notify(err.error?.message || 'Failed to create', true) });
      });
  }

  openEdit(org: OrganizationDTO) {
    this.dialog.open(OrgDialogComponent, { width: '560px', autoFocus: false, data: { mode: 'edit', org } })
      .afterClosed().subscribe(r => {
        if (!r) return;
        this.svc.update(org.id, r).subscribe({ next: u => { this.dataSource.data = this.dataSource.data.map(o => o.id === u.id ? u : o); this.notify('Organization updated'); }, error: () => this.notify('Failed to update', true) });
      });
  }

  deleteOrg(org: OrganizationDTO) {
    if (!confirm(`Delete "${org.name}"?`)) return;
    this.svc.delete(org.id).subscribe({ next: () => { this.dataSource.data = this.dataSource.data.filter(o => o.id !== org.id); this.notify('Deleted'); }, error: () => this.notify('Failed to delete', true) });
  }

  private notify(msg: string, err = false) { this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: err ? ['snack-error'] : ['snack-success'] }); }
}
