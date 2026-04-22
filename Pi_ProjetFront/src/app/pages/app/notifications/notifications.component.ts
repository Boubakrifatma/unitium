import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService, DeliverableNotification } from '../../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatBadgeModule, MatTabsModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="notif-page">
      <mat-card class="header-card">
        <div class="header">
          <div class="header-left">
            <mat-icon class="header-icon">notifications</mat-icon>
            <div>
              <h1>Notifications</h1>
              <p class="subtitle">
                {{ notificationService.unreadCount() }} non lue(s) sur {{ notificationService.notifications().length }}
              </p>
            </div>
          </div>
          <button mat-stroked-button color="primary"
                  [disabled]="notificationService.unreadCount() === 0"
                  (click)="markAllAsRead()">
            <mat-icon>done_all</mat-icon>
            Tout marquer comme lu
          </button>
        </div>
      </mat-card>

      <mat-tab-group [selectedIndex]="selectedTab()" (selectedIndexChange)="selectedTab.set($event)">
        <mat-tab>
          <ng-template mat-tab-label>
            Non lues
            @if (notificationService.unreadCount() > 0) {
              <span class="tab-badge">{{ notificationService.unreadCount() }}</span>
            }
          </ng-template>
          <ng-container *ngTemplateOutlet="list; context: { $implicit: unreadList() }"></ng-container>
        </mat-tab>

        <mat-tab label="Toutes">
          <ng-container *ngTemplateOutlet="list; context: { $implicit: notificationService.notifications() }"></ng-container>
        </mat-tab>
      </mat-tab-group>

      <ng-template #list let-items>
        @if (items.length === 0) {
          <div class="empty-state">
            <mat-icon>notifications_off</mat-icon>
            <p>Aucune notification</p>
          </div>
        } @else {
          <div class="notif-list">
            @for (n of items; track n.id) {
              <mat-card class="notif-card" [class.unread]="!n.isRead">
                <div class="notif-row">
                  <div class="notif-bar" [style.background]="iconBg(n.eventType)"></div>
                  <div class="notif-icon" [style.background]="iconBg(n.eventType) + '22'">
                    <mat-icon [style.color]="iconBg(n.eventType)">{{ iconFor(n.eventType) }}</mat-icon>
                  </div>
                  <div class="notif-body">
                    <div class="notif-label">{{ label(n.eventType) }}</div>
                    <div class="notif-title">{{ n.title }}</div>
                    <div class="notif-message">{{ n.message }}</div>
                    <div class="notif-meta">
                      <mat-icon>schedule</mat-icon>
                      {{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                  </div>
                  <div class="notif-actions">
                    @if (!n.isRead) {
                      <span class="dot"></span>
                      <button mat-icon-button color="primary" matTooltip="Marquer comme lu"
                              (click)="markAsRead(n)">
                        <mat-icon>done</mat-icon>
                      </button>
                    } @else {
                      <span class="read-label">Lu</span>
                    }
                  </div>
                </div>
              </mat-card>
            }
          </div>
        }
      </ng-template>
    </div>
  `,
  styles: [`
    .notif-page { padding: 20px; max-width: 900px; margin: 0 auto; }

    .header-card { margin-bottom: 16px; padding: 16px 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-icon { font-size: 36px; width: 36px; height: 36px; color: #6366f1; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }

    .tab-badge {
      margin-left: 8px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    .empty-state p { margin: 0; font-size: 15px; }

    .notif-list { display: flex; flex-direction: column; gap: 10px; padding: 16px 0; }

    .notif-card {
      padding: 0 !important;
      overflow: hidden;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .notif-card.unread {
      border-left: 3px solid #6366f1;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.06), transparent 60%);
    }
    .notif-card:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }

    .notif-row {
      display: flex;
      align-items: stretch;
      gap: 12px;
      padding: 14px 16px 14px 0;
    }

    .notif-bar { width: 4px; flex-shrink: 0; }

    .notif-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      align-self: center;
      margin-left: 4px;
    }

    .notif-body { flex: 1; min-width: 0; }
    .notif-label {
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.8px; text-transform: uppercase;
      color: #64748b; margin-bottom: 2px;
    }
    .notif-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
    .notif-message { font-size: 13px; color: #475569; line-height: 1.4; }
    .notif-meta {
      margin-top: 8px;
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: #94a3b8;
    }
    .notif-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .notif-actions {
      display: flex; align-items: center; gap: 6px;
      padding-right: 4px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; }
    .read-label { font-size: 11px; color: #94a3b8; font-style: italic; padding: 0 8px; }
  `]
})
export class NotificationsComponent implements OnInit {

  notificationService = inject(NotificationService);

  selectedTab = signal(0);

  unreadList = computed(() => this.notificationService.notifications().filter(n => !n.isRead));

  ngOnInit(): void {
    // Ensure polling/SSE is active (idempotent)
    this.notificationService.connect();
  }

  markAsRead(n: DeliverableNotification): void {
    if (n.isRead) return;
    this.notificationService.markAsRead(n.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  label(eventType: string): string {
    switch (eventType) {
      case 'SUBMITTED_TO_MANAGER':         return 'Nouveau livrable';
      case 'MANAGER_VIEWED':               return 'En cours d\'examen';
      case 'ACCEPTED_BY_MANAGER':          return 'Accepté par manager';
      case 'REVISION_REQUIRED_BY_MANAGER': return 'Révision demandée';
      case 'VALIDATED_BY_PO':              return 'Validé par le PO';
      case 'VALIDATED_EMPLOYEE':           return 'Livrable validé';
      case 'REJECTED_BY_PO':               return 'Rejeté par le PO';
      case 'REVISION_REQUIRED_BY_PO':      return 'Révision PO';
      default:                             return 'Notification';
    }
  }

  iconFor(eventType: string): string {
    switch (eventType) {
      case 'SUBMITTED_TO_MANAGER':         return 'upload_file';
      case 'MANAGER_VIEWED':               return 'visibility';
      case 'ACCEPTED_BY_MANAGER':          return 'check_circle';
      case 'REVISION_REQUIRED_BY_MANAGER': return 'edit_note';
      case 'VALIDATED_BY_PO':              return 'verified';
      case 'VALIDATED_EMPLOYEE':           return 'emoji_events';
      case 'REJECTED_BY_PO':               return 'cancel';
      case 'REVISION_REQUIRED_BY_PO':      return 'replay';
      default:                             return 'notifications';
    }
  }

  iconBg(eventType: string): string {
    switch (eventType) {
      case 'SUBMITTED_TO_MANAGER':         return '#6366f1';
      case 'MANAGER_VIEWED':               return '#8b5cf6';
      case 'ACCEPTED_BY_MANAGER':          return '#22c55e';
      case 'REVISION_REQUIRED_BY_MANAGER': return '#f59e0b';
      case 'VALIDATED_BY_PO':              return '#06b6d4';
      case 'VALIDATED_EMPLOYEE':           return '#10b981';
      case 'REJECTED_BY_PO':               return '#ef4444';
      case 'REVISION_REQUIRED_BY_PO':      return '#f97316';
      default:                             return '#6366f1';
    }
  }
}
