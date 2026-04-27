import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

export interface AuditLogDTO {
  id: number;
  userId: number | null;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  diffJson: string | null;
  ipAddress: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col-auto">
            <a mat-icon-button routerLink="/app/organizations"><mat-icon>arrow_back</mat-icon></a>
          </div>
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Audit Log</h3>
            <p class="small opacity-50">Complete history of all organization actions</p>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">
      <!-- Stats -->
      <div class="row gx-3 gx-lg-4">
        <div class="col-12 col-md-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue"><mat-icon class="material-icons-outlined">history</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Total Events</p><h3>{{ dataSource.data.length }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green"><mat-icon class="material-icons-outlined">add_business</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Org Created</p><h3>{{ countByAction('ORG_CREATED') }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow"><mat-icon class="material-icons-outlined">person_add</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Members Added</p><h3>{{ countByAction('MEMBER_ADDED') }}</h3></div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-12 col-md-3">
          <mat-card class="mb-3 mb-lg-4">
            <mat-card-content>
              <div class="row gx-3 align-items-center">
                <div class="col-auto"><div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red"><mat-icon class="material-icons-outlined">delete</mat-icon></div></div>
                <div class="col"><p class="small text-secondary mb-1">Deletions</p><h3>{{ countByAction('ORG_DELETED') + countByAction('MEMBER_REMOVED') }}</h3></div>
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
              <div class="col-auto mb-3"><div class="avatar avatar-40 text-theme rounded"><mat-icon class="material-icons-outlined">manage_search</mat-icon></div></div>
              <div class="col mb-3"><h3 class="mb-1">Activity History</h3><p class="text-secondary small">Most recent actions first</p></div>
              <div class="col-12 col-md-4 col-xl-3 mb-3">
                <mat-form-field appearance="outline" class="w-100 inline-small">
                  <mat-label>Search</mat-label>
                  <mat-icon matPrefix>search</mat-icon>
                  <input matInput (keyup)="applyFilter($event)" />
                </mat-form-field>
              </div>
            </div>
          </div>
        </mat-card-header>

        <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">

          <ng-container matColumnDef="actionType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Action</th>
            <td mat-cell *matCellDef="let log" class="py-2">
              <span class="badge badge-light d-inline-block" [ngClass]="getActionBadge(log.actionType)">
                <mat-icon style="font-size:14px;height:14px;width:14px;vertical-align:middle">{{ getActionIcon(log.actionType) }}</mat-icon>
                {{ log.actionType }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="entityType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Entity</th>
            <td mat-cell *matCellDef="let log" class="small text-secondary">{{ log.entityType ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="detail">
            <th mat-header-cell *matHeaderCellDef>Detail</th>
            <td mat-cell *matCellDef="let log" class="small">{{ getDetail(log.diffJson) }}</td>
          </ng-container>

          <ng-container matColumnDef="userId">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>User ID</th>
            <td mat-cell *matCellDef="let log" class="small text-secondary">{{ log.userId ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
            <td mat-cell *matCellDef="let log" class="small text-secondary">{{ log.createdAt | date:'MMM d, yyyy HH:mm' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell text-center py-4" [attr.colspan]="cols.length">No audit logs found.</td>
          </tr>
        </table>

        <mat-card-content>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" class="bg-none"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }`]
})
export class AuditLogComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private http = inject(HttpClient);
  private base = 'http://localhost:8084/api/audit-logs';

  dataSource = new MatTableDataSource<AuditLogDTO>([]);
  cols = ['actionType', 'entityType', 'detail', 'userId', 'createdAt'];

  ngOnInit() {
    this.http.get<AuditLogDTO[]>(this.base).subscribe({ next: d => this.dataSource.data = d });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (d, f) =>
      `${d.actionType} ${d.entityType} ${d.diffJson}`.toLowerCase().includes(f);
  }

  applyFilter(e: Event) {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  countByAction(action: string): number {
    return this.dataSource.data.filter(l => l.actionType === action).length;
  }

  getDetail(diffJson: string | null): string {
    if (!diffJson) return '—';
    try { return JSON.parse(diffJson).detail ?? '—'; } catch { return diffJson; }
  }

  getActionBadge(action: string): string {
    if (action.includes('CREATED') || action.includes('ADDED'))  return 'theme-green';
    if (action.includes('DELETED') || action.includes('REMOVED')) return 'theme-red';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'theme-yellow';
    if (action === 'LOGIN') return 'theme-blue';
    return 'theme-cyan';
  }

  getActionIcon(action: string): string {
    const map: Record<string, string> = {
      ORG_CREATED: 'add_business', ORG_UPDATED: 'edit', ORG_DELETED: 'delete',
      MEMBER_ADDED: 'person_add', MEMBER_REMOVED: 'person_remove', MEMBER_ROLE_CHANGED: 'manage_accounts',
      LOGIN: 'login', LOGOUT: 'logout', ROLE_CHANGE: 'swap_horiz',
    };
    return map[action] ?? 'info';
  }
}
