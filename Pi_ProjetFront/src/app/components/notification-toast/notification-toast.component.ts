import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { DeliverableNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="notif-toast">
      <!-- Barre colorée à gauche -->
      <div class="notif-toast__bar" [style.background]="iconBg(data.eventType)"></div>

      <!-- Icône -->
      <div class="notif-toast__icon" [style.background]="iconBg(data.eventType) + '22'">
        <mat-icon [style.color]="iconBg(data.eventType)">{{ iconFor(data.eventType) }}</mat-icon>
      </div>

      <!-- Contenu -->
      <div class="notif-toast__content">
        <div class="notif-toast__label">{{ label(data.eventType) }}</div>
        <div class="notif-toast__title">{{ data.title }}</div>
        <div class="notif-toast__message">{{ data.message }}</div>
        <div class="notif-toast__time">
          <mat-icon style="font-size:12px;height:12px;width:12px;vertical-align:middle">schedule</mat-icon>
          {{ data.createdAt | date:'HH:mm' }} — {{ data.createdAt | date:'dd/MM/yyyy' }}
        </div>
      </div>

      <!-- Bouton fermer -->
      <button class="notif-toast__close" (click)="snackBarRef.dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .notif-toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 12px 14px 0;
      min-width: 320px;
      max-width: 400px;
      position: relative;
      background: #1e1e2f;
      border-radius: 12px;
      overflow: hidden;
    }

    .notif-toast__bar {
      width: 4px;
      min-height: 60px;
      align-self: stretch;
      border-radius: 0 4px 4px 0;
      flex-shrink: 0;
    }

    .notif-toast__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notif-toast__content {
      flex: 1;
      min-width: 0;
    }

    .notif-toast__label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #a5b4fc;
      margin-bottom: 2px;
    }

    .notif-toast__title {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
      white-space: normal;
      line-height: 1.3;
    }

    .notif-toast__message {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notif-toast__time {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
    }

    .notif-toast__close {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      transition: color 0.2s;
    }

    .notif-toast__close:hover { color: #fff; }
    .notif-toast__close mat-icon { font-size: 18px; height: 18px; width: 18px; }
  `]
})
export class NotificationToastComponent {
  constructor(
    public snackBarRef: MatSnackBarRef<NotificationToastComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: DeliverableNotification
  ) {}

  label(eventType: string): string {
    switch (eventType) {
      case 'SUBMITTED_TO_MANAGER':         return 'Nouveau livrable';
      case 'MANAGER_VIEWED':               return 'En cours d\'examen 👀';
      case 'ACCEPTED_BY_MANAGER':          return 'Accepté ✓';
      case 'REVISION_REQUIRED_BY_MANAGER': return 'Révision demandée';
      case 'VALIDATED_BY_PO':              return 'Validé par le PO ✓';
      case 'VALIDATED_EMPLOYEE':           return 'Livrable validé ✓';
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
      case 'REJECTED_BY_PO':              return 'cancel';
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
      case 'REJECTED_BY_PO':              return '#ef4444';
      case 'REVISION_REQUIRED_BY_PO':      return '#f97316';
      default:                             return '#6366f1';
    }
  }
}
